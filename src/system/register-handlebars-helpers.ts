import type { EquippedStatus } from "@item-model/i-physical-item.ts";
import {
  assertDocumentSubType,
  formatListByUserLanguage,
  getAvailableRunes,
  localize,
  localizeItemType,
  toCamelCase,
} from "./util";

import { systemId } from "./config";
import { Rqid } from "./api/rqid-api";
import type { RqgItem } from "../items/rqg-item";
import type { SkillItem } from "@item-model/skill-data-model.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { ItemTypeEnum } from "@item-model/item-types";

export const registerHandlebarsHelpers = function () {
  Handlebars.registerHelper("concat", (...strs) =>
    strs
      .filter((s) => s == null || typeof s !== "object")
      .map((v) => (v != null && v !== "" ? v : "undefined")) // This concat is used for localization and empty keys don't work
      .join(""),
  );

  Handlebars.registerHelper("json", (context) => JSON.stringify(context));

  /** Workaround since handlebars can't handle ../@key
   * Will create a variable in scope, call with {{setVar 'myvar' @key this}}  */
  Handlebars.registerHelper("setVar", (varName, varValue, scope) => {
    scope[varName] = varValue;
  });

  Handlebars.registerHelper("currency", (value, unit) => {
    return `${new Intl.NumberFormat(navigator.language, {
      minimumFractionDigits: value % 1 ? 2 : 0, // 0 or 2 decimals
      maximumFractionDigits: 2,
      // eslint-disable-next-line no-irregular-whitespace
    }).format(value)} ${unit}`;
  });

  Handlebars.registerHelper("multiplyCurrency", (quantity, value, unit) => {
    const total = Number(quantity) * Number(value);
    return `${new Intl.NumberFormat(navigator.language, {
      minimumFractionDigits: value % 1 ? 2 : 0, // 0 or 2 decimals
      maximumFractionDigits: 2,
      // eslint-disable-next-line no-irregular-whitespace
    }).format(total)} ${unit}`;
  });

  Handlebars.registerHelper("decimalMultiply", (quantity, value, decimals) => {
    const fractionDigits = isNaN(decimals) ? undefined : Number(decimals);
    const total = Number(quantity) * Number(value);
    return `${new Intl.NumberFormat(navigator.language, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: 2,
    }).format(total)}`;
  });

  Handlebars.registerHelper("localizeitemtype", (typeName) => {
    const itemType: ItemTypeEnum = typeName;
    return localizeItemType(itemType);
  });

  Handlebars.registerHelper("localizeActiveEffectType", (type: string) => {
    // RQG-TEMP-REMOVE-ACTIVE-EFFECT-CHANGE-TYPES:
    // This uses CONST.ACTIVE_EFFECT_CHANGE_TYPES, currently provided via
    // src/global.d.ts augmentation until fvtt-types ships it.
    const normalizedType =
      typeof type === "string" && type in CONST.ACTIVE_EFFECT_CHANGE_TYPES ? type : undefined;
    if (!normalizedType) {
      return "";
    }
    return localize(`EFFECT.CHANGES.TYPES.${normalizedType}`);
  });

  /**
   * Format an Active Effect start marker for sheet tables.
   * Prefers round/turn for combat expiry and time for clock-based expiry,
   * and falls back to "-" when no usable start data exists.
   */
  Handlebars.registerHelper("activeEffectStart", (effect: unknown): string => {
    const toFiniteNumber = (value: unknown): number | null => {
      const numeric = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
      return typeof numeric === "number" && Number.isFinite(numeric) ? numeric : null;
    };

    const formatWorldTime = (worldTime: number): string => {
      const calendar = game.time?.calendar;
      if (calendar && typeof calendar.format === "function") {
        try {
          const currentWorldTime = game.time?.worldTime;
          const hasAgoFormatter =
            typeof CONFIG.time?.formatters === "object" &&
            CONFIG.time?.formatters != null &&
            "ago" in CONFIG.time.formatters;

          if (
            typeof currentWorldTime === "number" &&
            Number.isFinite(currentWorldTime) &&
            hasAgoFormatter
          ) {
            const elapsedSeconds = Math.max(0, currentWorldTime - worldTime);
            return calendar.format(elapsedSeconds, "ago" as never);
          }

          return calendar.format(worldTime, "timestamp");
        } catch {
          // Fall through to numeric fallback if formatter is unavailable.
        }
      }
      return String(worldTime);
    };

    const duration =
      (effect as { duration?: Record<string, unknown> } | undefined)?.duration ?? undefined;
    const durationTypeRaw = duration?.["type"];
    const durationType =
      durationTypeRaw === "turns" || durationTypeRaw === "seconds" || durationTypeRaw === "none"
        ? durationTypeRaw
        : undefined;
    const durationValue = toFiniteNumber(duration?.["value"]);

    const start = (effect as { start?: Record<string, unknown> } | undefined)?.start;
    const time = toFiniteNumber(start?.["time"]);
    const round = toFiniteNumber(start?.["round"]);
    const turn = toFiniteNumber(start?.["turn"]);
    const formattedRound =
      round !== null ? (turn !== null ? `${round}:${turn}` : String(round)) : undefined;

    const formattedTime =
      time !== null && (durationType === "seconds" || time !== 0)
        ? formatWorldTime(time)
        : undefined;
    const preferTime = durationType === "seconds";
    if (durationType === "none" || durationValue === null) {
      return "-";
    }
    const primary = preferTime ? formattedTime : formattedRound;
    const secondary = preferTime ? formattedRound : formattedTime;

    return primary ?? secondary ?? "-";
  });

  /**
   * Format an Active Effect duration label for sheet tables.
   * Prefers configured value + units, falling back to Foundry's prepared label
   * only when the effect has actual start metadata.
   */
  Handlebars.registerHelper("activeEffectDuration", (effect: unknown): string => {
    const toFiniteNumber = (value: unknown): number | undefined => {
      const numeric = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
      return typeof numeric === "number" && Number.isFinite(numeric) ? numeric : undefined;
    };

    const duration =
      (effect as { duration?: Record<string, unknown> } | undefined)?.duration ?? undefined;

    const start = (effect as { start?: Record<string, unknown> } | undefined)?.start;
    const hasStartMarker =
      toFiniteNumber(start?.["time"]) !== undefined ||
      toFiniteNumber(start?.["round"]) !== undefined ||
      toFiniteNumber(start?.["turn"]) !== undefined;

    const value = toFiniteNumber(duration?.["value"]);
    const unitsRaw = duration?.["units"];
    const units = typeof unitsRaw === "string" ? unitsRaw : undefined;

    const foundryDurationUnitLabel = (unit: string): string => {
      const key = `EFFECT.FIELDS.duration.choices.${unit}`;
      const localized = localize(key);
      return localized !== key ? localized : unit;
    };

    if (value != null && Number.isFinite(value) && units) {
      return `${value} ${foundryDurationUnitLabel(units)}`;
    }

    const preparedLabel = duration?.["label"];
    if (hasStartMarker && typeof preparedLabel === "string" && preparedLabel.trim().length > 0) {
      return preparedLabel;
    }

    return "-";
  });

  const hasEarlyExpiryWarning = (effect: unknown): boolean => {
    const toFiniteNumber = (value: unknown): number | undefined => {
      const numeric = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
      return typeof numeric === "number" && Number.isFinite(numeric) ? numeric : undefined;
    };

    const duration =
      (effect as { duration?: Record<string, unknown> } | undefined)?.duration ?? undefined;
    const durationValue = toFiniteNumber(duration?.["value"]);
    const expiryRaw = duration?.["expiry"];
    const expiry = typeof expiryRaw === "string" ? expiryRaw.trim() : "";

    return durationValue != null && durationValue > 0 && expiry.length > 0;
  };

  Handlebars.registerHelper("activeEffectHasEarlyExpiryWarning", (effect: unknown): boolean => {
    return hasEarlyExpiryWarning(effect);
  });

  Handlebars.registerHelper("activeEffectEarlyExpiryWarningTooltip", (effect: unknown): string => {
    if (!hasEarlyExpiryWarning(effect)) {
      return "";
    }

    return localize("RQG.Foundry.ActiveEffect.EarlyExpiryWarningTooltip");
  });

  Handlebars.registerHelper("skillname", (...args) => {
    return applyFnToDocumentFromHandlebarsArgs(args, (item) => {
      assertDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill);
      const specialization = item?.system?.specialization ? ` (${item.system.specialization})` : "";
      return `${item?.system?.skillName}${specialization}`;
    });
  });

  Handlebars.registerHelper("skillchance", (...args) =>
    applyFnToDocumentFromHandlebarsArgs(args, (item) => {
      assertDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill);
      return item?.system?.chance != null ? item.system.chance.toString() : "---";
    }),
  );

  Handlebars.registerHelper("experiencedclass", (...args) =>
    applyFnToDocumentFromHandlebarsArgs(args, (item: any) => {
      return item?.system?.hasExperience ? "experienced" : "";
    }),
  );

  Handlebars.registerHelper("toAnchor", (...args) => {
    const documentLink = applyFnToDocumentFromHandlebarsArgs<RqgItem | RqgActor>(
      args,
      (
        document: any, // TODO fix typing
      ) => (document ? document.toAnchor({ classes: ["content-link"] }).outerHTML : "🐛"),
      ["Item", "Actor"],
    );
    return new Handlebars.SafeString(documentLink ?? "🐛");
  });

  Handlebars.registerHelper("rqidImgSrc", (rqid: string): string | undefined => {
    if (!rqid) {
      return;
    }
    const availableRunes = getAvailableRunes();
    const rune = availableRunes.find((r) => r.rqid === rqid);
    if (availableRunes.length === 0) {
      // Don't warn if the runes are not yet cached
      return "";
    }
    if (!rune) {
      const msg = localize("RQG.Item.Notification.CantFindRuneInAvailableRunesError", {
        rqid: rqid,
      });
      ui.notifications?.error(msg, { console: false });
      console.error("RQG |", msg);
      return "";
    }
    return rune.img;
  });

  Handlebars.registerHelper("defaultItemIconSrc", (itemType: string): string | undefined => {
    const defaultItemIconSettings: any = game.settings?.get(systemId, "defaultItemIconSettings");
    return defaultItemIconSettings[itemType];
  });

  Handlebars.registerHelper("equippedIcon", (equippedStatus: EquippedStatus): string => {
    equippedStatus = equippedStatus ? equippedStatus : "notCarried";
    return CONFIG.RQG.equippedIcons[equippedStatus];
  });

  Handlebars.registerHelper("missileRate", (rate: number | undefined): string => {
    if (rate == null) {
      return "";
    }
    switch (rate) {
      case 0:
        return localize("RQG.Game.SrMeleeRoundAbbr");
      case 1:
        return `1/${localize("RQG.Game.MeleeRoundAbbr")}`;
      default:
        return `1/${rate}${localize("RQG.Game.MeleeRoundAbbr")}`;
    }
  });

  Handlebars.registerHelper("gearViewIcon", (view: string): string => {
    return CONFIG.RQG.gearViewIcons[view as keyof typeof CONFIG.RQG.gearViewIcons];
  });

  Handlebars.registerHelper("yes-no", (bool: boolean): string => {
    return bool ? localize("RQG.Dialog.Common.yes") : localize("RQG.Dialog.Common.no");
  });

  Handlebars.registerHelper("multiply", (...nums) => {
    nums.pop();
    return Math.floor(nums.reduce((acc, n) => acc * n));
  });

  Handlebars.registerHelper("multiplyfixed2", (...nums) => {
    nums.pop();
    return nums.reduce((acc, n) => acc * n).toFixed(2);
  });

  Handlebars.registerHelper("sum", (...nums) => {
    nums.pop();
    return nums.reduce((acc, n) => acc + (n ?? 0), 0);
  });

  Handlebars.registerHelper("difference", (...nums) => {
    nums.pop();
    const first = nums.shift();
    return nums.reduce((acc, n) => acc - (n ?? 0), first);
  });

  Handlebars.registerHelper("max", (...nums) => {
    nums.pop();
    const numbers = nums.map((n) => Number(n));
    return Math.max(...numbers);
  });

  Handlebars.registerHelper("toLowerCase", function (value) {
    if (value) {
      return new Handlebars.SafeString(value.toLowerCase());
    } else {
      return "";
    }
  });

  Handlebars.registerHelper("isEmptyObject", function (value) {
    return foundry.utils.isEmpty(value);
  });

  Handlebars.registerHelper("ifIn", (elem, list, options) =>
    // @ts-expect-error this is maybe wrong TODO verify how to do this properly
    list.includes(elem) ? options.fn(this) : options.inverse(this),
  );

  Handlebars.registerHelper("rqidLinkTooltip", function (rqid: string) {
    const documentName = Rqid.getDocumentName(rqid);
    const itemTypeString = documentName === "Item" ? Rqid.getDocumentType(rqid) : undefined;
    const itemType = (itemTypeString ? toCamelCase(itemTypeString) : undefined) as
      | ItemTypeEnum
      | undefined;
    return localize("RQG.Foundry.ContentLink.RqidLinkTitle", {
      rqid: rqid,
      documentName: game.i18n?.localize(`DOCUMENT.${documentName}`) ?? "",
      documentType: itemType ? localizeItemType(itemType) : "",
    });
  });

  Handlebars.registerHelper("rqidLinkIcon", function (rqid: string) {
    return Rqid.getRqidIcon(rqid) || "";
  });

  Handlebars.registerHelper("edit-mode", function (this: any, editMode, forUserTypes, options) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const context: unknown = this;
    if (!editMode) {
      return options.inverse(context);
    }

    if (forUserTypes.toLowerCase().includes("all")) {
      return options.fn(context);
    }

    const user = game.user;

    if (user?.isGM && forUserTypes.toLowerCase().includes("gm")) {
      return options.fn(context);
    }

    if (user?.isTrusted && forUserTypes.toLowerCase().includes("trusted")) {
      return options.fn(context);
    }

    if (forUserTypes.toLowerCase().includes("player")) {
      return options.fn(context);
    }

    return options.inverse(context);
  });
};

/**
 * Find the referenced embedded document T (defaults to item) and apply a function with that document as parameter.
 * Takes either an uuid directly to an embedded item: `{{helpername itemUuid}}`
 * or an uuid to an actor and an id to an embedded item on that actor: `{{helpername actorUuid embeddedItemId}}`.
 * The expectedDocumentNames is a guard against unexpected returns, and should be a list if documentNames that is
 * expected to be returned.
 */
function applyFnToDocumentFromHandlebarsArgs<T extends RqgItem | RqgActor = RqgItem>(
  handlebarsArgs: any[],
  fn: (document: T | undefined) => string,
  expectedDocumentNames: string[] = ["Item"],
): string | undefined {
  const uuid = handlebarsArgs?.[0];
  const embeddedItemId = typeof handlebarsArgs?.[1] === "string" ? handlebarsArgs[1] : undefined;

  if (!uuid) {
    const msg = `Handlebars helper called with an empty uuid`;
    ui.notifications?.error(msg, { console: false });
    // eslint-disable-next-line prefer-rest-params
    console.error("RQG | ", msg, arguments);
    return "🐛";
  }

  let itemActorOrToken;
  try {
    itemActorOrToken = fromUuidSync(uuid);
  } catch {
    // This uuid can't be retrieved synchronously (it's in a compendium) Fail gracefully.
    return "�";
  }
  if (!itemActorOrToken) {
    const msg = `Handlebars helper couldn't find item or actor`;
    // eslint-disable-next-line prefer-rest-params
    console.error("RQG | ", msg, arguments);
    return "🐛";
  }

  const itemOrActor =
    itemActorOrToken instanceof TokenDocument ? itemActorOrToken.actor : itemActorOrToken;

  const document =
    embeddedItemId && itemOrActor instanceof Actor
      ? itemOrActor.getEmbeddedDocument("Item", embeddedItemId, {})
      : itemOrActor;

  if (embeddedItemId && document?.documentName !== "Item") {
    const msg = `Handlebars helper couldn't find embedded item in ${itemOrActor?.name}`;
    // eslint-disable-next-line prefer-rest-params
    console.error("RQG | ", msg, document, arguments);
    return "🐛";
  }

  const documentName = typeof document?.documentName === "string" ? document.documentName : "";
  if (!expectedDocumentNames.includes(documentName)) {
    const msg = `Handlebars helper expected ${formatListByUserLanguage(
      expectedDocumentNames,
    )} but got ${document?.documentName} called ${document?.name}`;
    // eslint-disable-next-line prefer-rest-params
    console.error("RQG | ", msg, document, arguments);
    return "🐛";
  }
  return fn((document as T) ?? undefined);
}

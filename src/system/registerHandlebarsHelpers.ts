import type { EquippedStatus } from "@item-model/IPhysicalItem.ts";
import {
  formatListByUserLanguage,
  getAvailableRunes,
  localize,
  localizeItemType,
  toCamelCase,
} from "./util";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { systemId } from "./config";
import { Rqid } from "./api/rqidApi";
import type { RqgItem } from "../items/rqgItem";

import Document = foundry.abstract.Document;

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

  Handlebars.registerHelper("localizeActiveEffectMode", (mode: string) => {
    const valueLookup = Object.fromEntries(
      Object.entries(CONST.ACTIVE_EFFECT_MODES).map(([key, value]) => [value, key]),
    );
    const modeString = valueLookup[mode];
    return localize(`EFFECT.MODE_${modeString}`);
  });

  Handlebars.registerHelper("skillname", (...args) => {
    return applyFnToDocumentFromHandlebarsArgs(args, (item) => {
      const specialization = item?.system?.specialization ? ` (${item.system.specialization})` : "";
      return `${item?.system?.skillName}${specialization}`;
    });
  });

  Handlebars.registerHelper("skillchance", (...args) =>
    applyFnToDocumentFromHandlebarsArgs(args, (item) =>
      item?.system?.chance ? item.system.chance : "---",
    ),
  );

  Handlebars.registerHelper("experiencedclass", (...args) =>
    applyFnToDocumentFromHandlebarsArgs(args, (item) =>
      item?.system?.hasExperience ? "experienced" : "",
    ),
  );

  Handlebars.registerHelper("toAnchor", (...args) => {
    const documentLink = applyFnToDocumentFromHandlebarsArgs<Document.WithSystem>(
      args,
      (document) => (document ? document.toAnchor({ classes: ["content-link"] }).outerHTML : "🐛"),
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

  Handlebars.registerHelper("edit-mode", function (editMode, forUserTypes, options) {
    if (!editMode) {
      return options.inverse();
    }

    if (forUserTypes.toLowerCase().includes("all")) {
      return options.fn();
    }

    const user = game.user;

    if (user?.isGM && forUserTypes.toLowerCase().includes("gm")) {
      return options.fn();
    }

    if (user?.isTrusted && forUserTypes.toLowerCase().includes("trusted")) {
      return options.fn();
    }

    if (forUserTypes.toLowerCase().includes("player")) {
      return options.fn();
    }

    return options.inverse();
  });
};

/**
 * Find the referenced embedded document T (defaults to item) and apply a function with that document as parameter.
 * Takes either an uuid directly to an embedded item: `{{helpername itemUuid}}`
 * or an uuid to an actor and an id to an embedded item on that actor: `{{helpername actorUuid embeddedItemId}}`.
 * The expectedDocumentNames is a guard against unexpected returns, and should be a list if documentNames that is
 * expected to be returned.
 */
function applyFnToDocumentFromHandlebarsArgs<T extends Document.WithSystem = RqgItem>(
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

  if (!expectedDocumentNames.includes(document?.documentName ?? "")) {
    const msg = `Handlebars helper expected ${formatListByUserLanguage(
      expectedDocumentNames,
    )} but got ${document?.documentName} called ${document?.name}`;
    // eslint-disable-next-line prefer-rest-params
    console.error("RQG | ", msg, document, arguments);
    return "🐛";
  }
  return fn((document as T) ?? undefined);
}

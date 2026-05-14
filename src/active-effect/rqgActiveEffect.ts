import {
  formatListByWorldLanguage,
  isDocumentSubType,
  localize,
  logMisconfiguration,
} from "../system/util";
import { RqgLogger } from "../system/logging/rqgLogger";
import { Rqid } from "../system/api/rqidApi";
import { toRqidString } from "../system/api/rqidValidation";
import { systemId } from "../system/config";
import { physicalItemTypes } from "@item-model/IPhysicalItem.ts";

import type { AnyMutableObject } from "fvtt-types/utils";
import Document = foundry.abstract.Document;
import { ActorTypeEnum, type CharacterActor } from "../data-model/actor-data/rqgActorData";
import type { RqgItem } from "@items/rqgItem.ts";

const rqgActiveEffectSchema = {
  matchSuspensionToEquippedStatus: new foundry.data.fields.BooleanField({ initial: false }),
} as const;

class RqgActiveEffectDataModel extends (foundry.abstract.TypeDataModel as any) {
  static defineSchema(): any {
    return rqgActiveEffectSchema;
  }
}

export class RqgActiveEffect extends ActiveEffect<ActiveEffect.SubType> {
  private static readonly logger = new RqgLogger("RqgActiveEffect");

  static init() {
    CONFIG.ActiveEffect.documentClass = RqgActiveEffect as any;
    CONFIG.ActiveEffect.dataModels["base"] = RqgActiveEffectDataModel as any;
    CONFIG.ActiveEffect.legacyTransferral = false;

    Hooks.on(
      "renderActiveEffectConfig",
      (app: foundry.applications.sheets.ActiveEffectConfig, html: HTMLElement | JQuery) => {
        const effect = app.document;
        if (!RqgActiveEffect.#isOnPhysicalItem(effect)) {
          return;
        }

        const form = html instanceof HTMLElement ? html : (html.get(0) as HTMLElement | undefined);
        if (!form) {
          return;
        }

        const disabledInput = form.querySelector<HTMLInputElement>('input[name="disabled"]');
        if (!disabledInput) {
          return;
        }

        const disabledGroup = disabledInput.closest(".form-group") as HTMLElement | null;
        if (!disabledGroup) {
          return;
        }

        const existingInput = form.querySelector<HTMLInputElement>(
          'input[name="system.matchSuspensionToEquippedStatus"]',
        );

        const matchSuspensionToEquippedStatus =
          existingInput?.checked ??
          RqgActiveEffect.#getMatchSuspensionToEquippedStatusOrWorldDefault(effect);

        let checkbox = existingInput;
        if (!checkbox) {
          const newGroup = document.createElement("div");
          newGroup.classList.add("form-group");
          newGroup.innerHTML = `
            <label>${localize("RQG.Foundry.ActiveEffect.MatchSuspensionToEquippedStatus")}</label>
            <input type="checkbox" name="system.matchSuspensionToEquippedStatus" ${matchSuspensionToEquippedStatus ? "checked" : ""}>
          `;
          disabledGroup.parentElement?.insertBefore(newGroup, disabledGroup);
          checkbox = newGroup.querySelector<HTMLInputElement>(
            'input[name="system.matchSuspensionToEquippedStatus"]',
          );
        }

        const syncSuspendedInput = (): void => {
          const enabled = checkbox?.checked === true;
          if (enabled) {
            disabledInput.checked = !RqgActiveEffect.#isParentItemEquipped(effect);
          }
          disabledInput.disabled = enabled;
          const disabledLabel = disabledGroup.querySelector("label");
          if (disabledLabel) {
            disabledLabel.style.opacity = enabled ? "0.6" : "";
          }
        };

        syncSuspendedInput();
        checkbox?.addEventListener("change", syncSuspendedInput);
      },
    );
  }

  override async _preCreate(data: any, options: any, user: User): Promise<boolean | void> {
    if (RqgActiveEffect.#isOnPhysicalItem(this)) {
      const fieldFromCreateData = foundry.utils.getProperty(
        data,
        "system.matchSuspensionToEquippedStatus",
      );
      const matchSuspensionToEquippedStatus =
        typeof fieldFromCreateData === "boolean"
          ? fieldFromCreateData
          : RqgActiveEffect.#getWorldDefaultMatchSuspensionToEquippedStatus();

      this.updateSource({
        system: {
          matchSuspensionToEquippedStatus,
        },
      });

      if (matchSuspensionToEquippedStatus) {
        this.updateSource({ disabled: !RqgActiveEffect.#isParentItemEquipped(this) });
      }
    }

    return super._preCreate(data as any, options as any, user as any);
  }

  override async _preUpdate(
    changes: Record<string, unknown>,
    options: any,
    user: User,
  ): Promise<boolean | void> {
    if (RqgActiveEffect.#isOnPhysicalItem(this)) {
      const expandedChanges = foundry.utils.expandObject(changes as object);
      const nextMatchSuspensionToEquippedStatus =
        foundry.utils.getProperty(expandedChanges, "system.matchSuspensionToEquippedStatus") ??
        RqgActiveEffect.#getMatchSuspensionToEquippedStatus(this);
      if (nextMatchSuspensionToEquippedStatus === true) {
        changes["disabled"] = !RqgActiveEffect.#isParentItemEquipped(this);
      }
    }

    return super._preUpdate(changes as any, options as any, user as any);
  }

  protected override _onUpdate(
    changed: Record<string, unknown>,
    options: any,
    userId: string,
  ): void {
    super._onUpdate(changed as any, options as any, userId as any);

    // Only the originating client should issue follow-up writes.
    if (userId !== game.user?.id) {
      return;
    }

    if (!RqgActiveEffect.#isOnPhysicalItem(this)) {
      return;
    }

    if (!RqgActiveEffect.#getMatchSuspensionToEquippedStatus(this)) {
      return;
    }

    const shouldDisable = !RqgActiveEffect.#isParentItemEquipped(this);
    if (this.disabled !== shouldDisable) {
      void this.update({ disabled: shouldDisable });
    }
  }

  static #getMatchSuspensionToEquippedStatus(effect: ActiveEffect): boolean {
    return foundry.utils.getProperty(effect, "system.matchSuspensionToEquippedStatus") === true;
  }

  static #getWorldDefaultMatchSuspensionToEquippedStatus(): boolean {
    return game.settings?.get(systemId, "matchEffectSuspensionToEquippedStatusDefault") === true;
  }

  static #getMatchSuspensionToEquippedStatusOrWorldDefault(effect: ActiveEffect): boolean {
    const hasPersistentId = typeof effect.id === "string" && effect.id.length > 0;
    if (!hasPersistentId) {
      return RqgActiveEffect.#getWorldDefaultMatchSuspensionToEquippedStatus();
    }

    const parent = effect.parent;
    if (!(parent instanceof Item)) {
      // Parent-less effects with an id are treated as persisted.
      return RqgActiveEffect.#getMatchSuspensionToEquippedStatus(effect);
    }

    if (parent.effects.has(effect.id)) {
      return RqgActiveEffect.#getMatchSuspensionToEquippedStatus(effect);
    }

    return RqgActiveEffect.#getWorldDefaultMatchSuspensionToEquippedStatus();
  }

  static #isOnPhysicalItem(effect: ActiveEffect): boolean {
    return RqgActiveEffect.#isPhysicalItem(effect.parent);
  }

  static #isPhysicalItem(item: unknown): item is RqgItem {
    return item instanceof Item && physicalItemTypes.includes(item.type as any);
  }

  static #isParentItemEquipped(effect: ActiveEffect): boolean {
    const parent = effect.parent;
    if (!RqgActiveEffect.#isPhysicalItem(parent)) {
      return true;
    }
    return parent.system.equippedStatus === "equipped";
  }

  /**
   * CUSTOM application mode will apply an ADD effect to a specified item.
   * The format of the key should be "<rqid>:<propertyPath>" like "i.skill.dodge:system.baseChance"
   * The effect will try to find an embedded item with the specified rqid.
   * Prefix the rqid with ~ to use it as a regex and apply the effect to all matching items,
   * like "~i.hit-location:system.naturalAp" to affect all hit location items on the actor.
   */
  static _applyChangeCustom(
    targetDoc: Actor.Implementation,
    change: ActiveEffect.ChangeData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    currentP: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    deltaP: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    changes: AnyMutableObject,
  ): void {
    const effect = (change as any).effect as RqgActiveEffect | undefined;
    const [rqidOrPattern, path, deprecated] = change.key.split(":"); // ex i.hit-location.head:system.naturalAp
    if (deprecated) {
      const itemsWithEffectsOnActor = formatListByWorldLanguage(
        targetDoc.appliedEffects.map((e) => {
          try {
            return (fromUuidSync(e.origin) as Document.Any)?.name ?? "❓no name";
          } catch {
            return "❓embedded item in compendium"; // origin was in a compendium and could not be read synchronously
          }
        }),
        "disjunction",
      );
      RqgActiveEffect.logger.warn(
        `Character ${targetDoc.name} has an embedded item with an old style Active Effect [${change.key}], please update to the new syntax: "rqid:system.path". Check these items [${itemsWithEffectsOnActor}]`,
      );
    }

    const isMultiMatch = rqidOrPattern !== undefined && rqidOrPattern.startsWith("~");
    const rqid = isMultiMatch ? rqidOrPattern.slice(1) : rqidOrPattern;

    const items = [];
    if (isDocumentSubType<CharacterActor>(targetDoc, ActorTypeEnum.Character)) {
      if (isMultiMatch) {
        items.push(...targetDoc.getEmbeddedDocumentsByRqidRegex(rqid ?? ""));
      } else {
        const bestMatch = targetDoc.getBestEmbeddedDocumentByRqid(toRqidString(rqid));
        if (bestMatch) {
          items.push(bestMatch);
        }
      }
    }

    if (items.length === 0) {
      logMisconfiguration(
        localize("RQG.Foundry.ActiveEffect.TargetItemNotFound", {
          rqid: rqidOrPattern ?? "",
          actorName: targetDoc.name,
          itemName: Rqid.getDocumentName(rqid),
        }),
        !effect?.disabled,
        change,
        effect,
      );
      return;
    }

    for (const item of items) {
      // Determine the data type of the target field
      const current: unknown = foundry.utils.getProperty(item, path as any) ?? null;
      let target = current;
      if (current === null) {
        const model = (game.model?.Item as any)[item.type] || {};
        target = foundry.utils.getProperty(model, path as any) ?? null;
      }
      const targetType = foundry.utils.getType(target);

      // Cast the effect change value to the correct type
      let delta;
      try {
        if (targetType === "Array") {
          const innerType = (target as unknown[]).length
            ? foundry.utils.getType((target as unknown[])[0])
            : "string";
          delta = this.#castArray(change.value, innerType);
        } else {
          delta = this.#castDelta(change.value, targetType);
        }
      } catch (e) {
        RqgActiveEffect.logger.warn(
          `Item [${item.id}] | Unable to parse active effect change for ${change.key}: "${change.value}"`,
          { notify: false },
          e,
        );
        continue;
      }

      let update;
      const ct = foundry.utils.getType(current);
      switch (ct) {
        case "boolean":
          update = current || delta;
          break;
        case "null":
          update = delta;
          break;
        case "Array":
          update = (current as unknown[]).concat(delta);
          break;
        default:
          update = current + delta;
          break;
      }

      try {
        foundry.utils.setProperty(item, path as any, update);
      } catch (e) {
        RqgActiveEffect.logger.warn(
          `Active Effect on item [${item.name}] in actor [${targetDoc.name}] failed. Probably because of wrong syntax in the active effect attribute key [${change.key}].`,
          undefined,
          change,
          e,
        );
      }
    }
  }

  // TODO this is just copied from the ActiveEffect class. Refactor when items use DataModels

  static #castDelta(raw: any, type: any) {
    let delta;
    switch (type) {
      case "boolean":
        delta = Boolean(this.#parseOrString(raw));
        break;
      case "number":
        delta = Number.fromString(raw);
        if (Number.isNaN(delta)) {
          delta = 0;
        }
        break;
      case "string":
        delta = String(raw);
        break;
      default:
        delta = this.#parseOrString(raw);
    }
    return delta;
  }

  static #castArray(raw: any, type: any) {
    let delta;
    try {
      delta = this.#parseOrString(raw);
      delta = delta instanceof Array ? delta : [delta];
    } catch {
      delta = [raw];
    }
    return delta.map((d) => this.#castDelta(d, type));
  }

  static #parseOrString(raw: any) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
}

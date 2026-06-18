import { isDocumentSubType, localize, logMisconfiguration } from "../system/util";
import { RqgLogger } from "../system/logging/rqg-logger";
import { Rqid } from "../system/api/rqid-api";
import { toRqidString } from "../system/api/rqid-validation";
import { systemId } from "../system/config";
import { physicalItemTypes } from "@item-model/i-physical-item.ts";

import type { AnyMutableObject } from "fvtt-types/utils";
import { ActorTypeEnum, type CharacterActor } from "../data-model/actor-data/rqg-actor-data";
import type { RqgItem } from "@items/rqg-item.ts";
import { applyItemChangeThroughDataModel } from "./data-model-field-change";
import { RqgActiveEffectDataModel } from "./data-model/rqg-active-effect-data-model";

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
      logMisconfiguration(
        `Legacy Active Effect key syntax is no longer supported: [${change.key}]. Update to "rqid:system.path".`,
        !effect?.disabled,
        change,
        effect,
      );
      return;
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
      const replacementData =
        typeof (targetDoc as any).getRollData === "function"
          ? (targetDoc as any).getRollData()
          : {};

      const dataModelResult = applyItemChangeThroughDataModel(
        item as RqgItem,
        path ?? "",
        change,
        replacementData,
      );
      if (dataModelResult.applied) {
        try {
          const systemModel = (item as RqgItem).system as any;
          const systemPath = (path as string).slice("system.".length);
          const field =
            systemModel.getFieldForProperty?.(systemPath) ??
            systemModel.schema?.getField?.(systemPath, {
              source: systemModel._source ?? systemModel,
            });

          // Nested SchemaField getters can return fresh objects on access, so
          // shadow the top-level segment to preserve non-persisted mutations.
          if (field?.persisted === false) {
            const [rootSegment] = systemPath.split(".");
            if (!rootSegment) {
              throw new Error(`Invalid item system path for Active Effect: ${path}`);
            }

            const rawRootValue = foundry.utils.getProperty(systemModel, rootSegment) ?? {};
            const rootValue =
              typeof foundry.utils.deepClone === "function"
                ? foundry.utils.deepClone(rawRootValue)
                : structuredClone(rawRootValue);
            foundry.utils.setProperty(
              rootValue,
              systemPath.slice(rootSegment.length + 1) as any,
              dataModelResult.value,
            );
            Object.defineProperty(systemModel, rootSegment, {
              value: rootValue,
              configurable: true,
              enumerable: true,
            });
          } else {
            // For persisted fields, use the document-level setProperty
            foundry.utils.setProperty(item, path as any, dataModelResult.value);
          }
          continue;
        } catch (e) {
          RqgActiveEffect.logger.warn(
            `Active Effect on item [${item.name}] in actor [${targetDoc.name}] failed while setting DataModel-applied value for [${change.key}].`,
            { notify: false },
            change,
            e,
          );
          continue;
        }
      }

      logMisconfiguration(
        `Active Effect item target key [${change.key}] could not be applied via DataModel (${dataModelResult.reason}).`,
        !effect?.disabled,
        change,
        effect,
      );
    }
  }
}

import { isDocumentSubType, localize, logMisconfiguration } from "../system/util";
import { RqgLogger } from "../system/logging/rqg-logger";
import { Rqid } from "../system/api/rqid-api";
import { toRqidString } from "../system/api/rqid-validation";
import { systemId } from "../system/config";
import { physicalItemTypes } from "@item-model/i-physical-item.ts";

import type { AnyMutableObject } from "fvtt-types/utils";
import { ActorTypeEnum, type CharacterActor } from "../data-model/actor-data/rqg-actor-data";
import type { RqgItem } from "@items/rqg-item.ts";
import { RqgActiveEffectDataModel } from "./data-model/rqg-active-effect-data-model";

export class RqgActiveEffect extends ActiveEffect<ActiveEffect.SubType> {
  private static readonly logger = new RqgLogger("RqgActiveEffect");

  static init() {
    CONFIG.ActiveEffect.documentClass = RqgActiveEffect as any;
    // TEMP(v14-types): DataModelConfig["ActiveEffect"] can't be augmented without RqgActiveEffectDataModel
    // fully satisfying fvtt-types' internal AnyDataModel shape, which our runtime-safe
    // ActiveEffectTypeDataModelBase polyfill (see rqg-active-effect-data-model.ts) doesn't statically expose.
    // @ts-expect-error TEMP(v14-types)
    CONFIG.ActiveEffect.dataModels["base"] = RqgActiveEffectDataModel;
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
      const systemModel = item.system as unknown as {
        getFieldForProperty?: (path: string) => unknown;
      };

      if (!path?.startsWith("system.")) {
        logMisconfiguration(
          `Active Effect item target key [${change.key}] must target an item system path.`,
          !effect?.disabled,
          change,
          effect,
        );
        continue;
      }

      const fieldPath = path.slice("system.".length);
      const field = systemModel.getFieldForProperty?.(fieldPath);
      if (!field) {
        logMisconfiguration(
          `Active Effect item target key [${change.key}] could not resolve item system field [${path}].`,
          !effect?.disabled,
          change,
          effect,
        );
        continue;
      }

      const replacementData =
        typeof (targetDoc as any).getRollData === "function"
          ? (targetDoc as any).getRollData()
          : {};
      const addChange = {
        ...change,
        key: path,
        type: "add",
      } as ActiveEffect.ChangeData & { type: string };

      const activeEffectClass = ActiveEffect as typeof ActiveEffect & {
        applyChangeField?: (
          targetDoc: object,
          changeData: ActiveEffect.ChangeData,
          options: {
            field: unknown;
            replacementData: Record<string, unknown>;
            modifyTarget: boolean;
          },
        ) => unknown;
      };
      if (typeof activeEffectClass.applyChangeField !== "function") {
        logMisconfiguration(
          `Active Effect item target key [${change.key}] could not be applied because core applyChangeField is unavailable.`,
          !effect?.disabled,
          change,
          effect,
        );
        continue;
      }

      try {
        activeEffectClass.applyChangeField(item as RqgItem, addChange, {
          field,
          replacementData,
          modifyTarget: true,
        });
      } catch (e) {
        RqgActiveEffect.logger.warn(
          `Active Effect on item [${item.name}] in actor [${targetDoc.name}] failed while applying [${change.key}] via applyChangeField.`,
          { notify: false },
          change,
          e,
        );
      }
    }
  }
}

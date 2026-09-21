import { isDocumentSubType, localize, logMisconfiguration } from "../system/util";
import { RqgLogger } from "../system/logging/rqg-logger";
import { systemId } from "../system/config";
import { physicalItemTypes } from "@item-model/i-physical-item.ts";
import {
  isRoutedSelectorShaped,
  parseRoutedKey,
  parseRoutedKeyBody,
} from "./routed-key/parse-routed-key";
import { resolveRoutedTarget } from "./routed-key/resolve-routed-target";
import { checkFieldModeContract } from "./routed-key/field-mode-contract";
import { isNativeChangeType } from "./routed-key/change-type-contract";
import {
  RoutedKeyWarningTracker,
  routedKeyWarningI18nKey,
  type RoutedKeyWarningReason,
} from "./routed-key/routed-key-warnings";

import type { AnyMutableObject } from "fvtt-types/utils";
import { ActorTypeEnum, type CharacterActor } from "../data-model/actor-data/rqg-actor-data";
import type { RqgItem } from "@items/rqg-item.ts";
import type { RoutedSelector } from "./routed-key/routed-key.types";
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

  override async _preCreate(
    data: ActiveEffect.CreateData,
    options: ActiveEffect.Database.PreCreateOptions,
    user: User,
  ): Promise<boolean | void> {
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
    options: ActiveEffect.Database.PreUpdateOptions,
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
    options: ActiveEffect.Database.OnUpdateOptions,
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

  /** De-dupes routed-key misconfiguration warnings by (effect, key, reason) - see #920 plan. */
  static readonly #routedKeyWarnings = new RoutedKeyWarningTracker();

  /**
   * `@`-routed keys (#920) send a change to a different embedded document, across every native
   * mode. Any key not starting with `@` behaves exactly as core Foundry, apart from the pad mode
   * contract, which holds wherever the target is a pad.
   *
   *   `@<rqid>:<systemPath>`    one embedded item, best match by rqid
   *   `@~<regex>:<systemPath>`  every embedded item whose rqid matches
   *   `@.:<systemPath>`         the item this effect is parented to
   */
  static override applyChange(
    targetDoc: ActiveEffect.ChangeTarget,
    change: ActiveEffect.ChangeData,
    options?: ActiveEffect.ApplyChangeOptions,
  ): AnyMutableObject {
    const parsed = parseRoutedKey(change.key);
    const effect = (change as { effect?: RqgActiveEffect }).effect;

    if (!parsed.routed) {
      // the contract is a property of (path, type), so the actor's own pads are checked too
      const violation = checkFieldModeContract(change.key ?? "", change.type ?? "");
      if (violation) {
        RqgActiveEffect.#warnMisconfiguration(effect, change, violation, {
          systemPath: change.key ?? "",
        });
        return {};
      }
      return super.applyChange(targetDoc, change, options);
    }

    if ("error" in parsed) {
      RqgActiveEffect.#warnMisconfiguration(
        effect,
        change,
        parsed.error.reason,
        parsed.error.detail,
      );
      return {};
    }

    return RqgActiveEffect.#applyRoutedChange(targetDoc, change, parsed, options);
  }

  /**
   * @deprecated Pre-#920 syntax: use "@<rqid>:system.path" instead of "<rqid>:system.path". Kept
   * one release for content the #920 migration misses (unlinked packs, hand-authored effects).
   */
  static override _applyChangeCustom(
    targetDoc: Actor.Implementation,
    change: ActiveEffect.ChangeData,
    currentP: unknown,
    deltaP: unknown,
    changes: AnyMutableObject,
  ): void {
    const effect = (change as { effect?: RqgActiveEffect }).effect;
    const parsed = parseRoutedKeyBody(change.key ?? "");
    if ("error" in parsed) {
      // core sends every unresolvable CUSTOM change here, so only claim routed-looking selectors
      if (!isRoutedSelectorShaped(parsed.error.selectorRaw)) {
        super._applyChangeCustom(targetDoc, change, currentP, deltaP, changes);
        return;
      }
      RqgActiveEffect.#warnMisconfiguration(
        effect,
        change,
        parsed.error.reason,
        parsed.error.detail,
      );
      return;
    }

    // console-only: a GM cannot fix pack content from a toast, and PR c's migration rewrites it
    RqgActiveEffect.#warnMisconfiguration(
      effect,
      change,
      "legacy-syntax-deprecated",
      undefined,
      false,
    );

    // core passes no options here, so the replacement data has to be rebuilt
    RqgActiveEffect.#applyRoutedChange(
      targetDoc,
      // legacy syntax always meant "add", whatever mode routed the change here
      { ...change, type: "add" },
      parsed,
      { replacementData: targetDoc.getRollData() },
    );
  }

  static #applyRoutedChange(
    targetDoc: ActiveEffect.ChangeTarget,
    change: ActiveEffect.ChangeData,
    parsed: { readonly selector: RoutedSelector; readonly systemPath: string },
    options?: ActiveEffect.ApplyChangeOptions,
  ): AnyMutableObject {
    const { selector, systemPath } = parsed;
    const effect = (change as { effect?: RqgActiveEffect }).effect;

    // Type and mode are properties of (path, type) alone, so they are checked before resolving the
    // target - otherwise a misconfigured row pays for a full embedded-item scan on every prep cycle.
    // CUSTOM would write nothing at all; PR c's migration rewrites the mode.
    let changeType = change.type ?? "";
    if (changeType === "custom") {
      RqgActiveEffect.#warnMisconfiguration(effect, change, "custom-mode-on-routed-key");
      changeType = "add";
    }

    // any other type has no applyChange branch, and applying it would reset the field to `initial`
    if (!isNativeChangeType(changeType)) {
      RqgActiveEffect.#warnMisconfiguration(effect, change, "unsupported-change-type", {
        changeType,
      });
      return {};
    }

    const violation = checkFieldModeContract(systemPath, changeType);
    if (violation) {
      RqgActiveEffect.#warnMisconfiguration(effect, change, violation, { systemPath });
      return {};
    }

    // the `instanceof` narrows away TokenDocument, which isDocumentSubType does not accept
    const targetActor =
      targetDoc instanceof Actor &&
      isDocumentSubType<CharacterActor>(targetDoc, ActorTypeEnum.Character)
        ? targetDoc
        : undefined;
    const owningItem = effect?.parent instanceof Item ? effect.parent : undefined;

    const resolved = resolveRoutedTarget(selector, { targetActor, owningItem });
    if ("error" in resolved) {
      RqgActiveEffect.#warnMisconfiguration(effect, change, resolved.error.reason, {
        actorName: targetDoc.name ?? "",
        ...resolved.error.detail,
      });
      return {};
    }

    const fieldPath = systemPath.slice("system.".length);
    const itemChange = { ...change, key: systemPath, type: changeType };
    for (const target of resolved.items) {
      const item = target as unknown as RqgItem;
      try {
        // guarded like core does - a regex fan-out can reach an item type without a DataModel
        const field =
          item.system instanceof foundry.abstract.DataModel
            ? item.system.getFieldForProperty(fieldPath)
            : undefined;
        if (!field) {
          RqgActiveEffect.#warnMisconfiguration(effect, change, "field-not-found", { systemPath });
          continue;
        }

        ActiveEffect.applyChangeField(item, itemChange, {
          field,
          replacementData: options?.replacementData,
          modifyTarget: options?.modifyTarget,
        });
      } catch (e) {
        RqgActiveEffect.logger.warn(
          `Routed Active Effect key [${change.key}] failed while applying to item [${item.name}].`,
          { notify: false },
          change,
          e,
        );
      }
    }

    return {};
  }

  static #warnMisconfiguration(
    effect: RqgActiveEffect | undefined,
    change: ActiveEffect.ChangeData,
    reason: RoutedKeyWarningReason,
    detail?: Readonly<Record<string, string>>,
    notify: boolean = !effect?.disabled,
  ): void {
    const changeKey = change.key ?? "";
    if (
      !RqgActiveEffect.#routedKeyWarnings.shouldWarn(effect?.uuid ?? undefined, changeKey, reason)
    ) {
      return;
    }
    const message = localize(routedKeyWarningI18nKey(reason), { key: changeKey, ...detail });
    logMisconfiguration(message, notify, change, effect);
  }
}

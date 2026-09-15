import { isDocumentSubType, localize, logMisconfiguration } from "../system/util";
import { RqgLogger } from "../system/logging/rqg-logger";
import { systemId } from "../system/config";
import { physicalItemTypes } from "@item-model/i-physical-item.ts";
import { parseRoutedKey } from "./routed-key/parse-routed-key";
import { resolveRoutedTarget } from "./routed-key/resolve-routed-target";
import { checkFieldModeContract } from "./routed-key/field-mode-contract";
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
   * `@`-routed keys (#920) send a change to a *different* embedded document than the one the
   * effect sits on, and work across every native application mode (ADD, UPGRADE, ...). Any key
   * not starting with `@` is untouched and behaves exactly as core Foundry.
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
    if (!parsed.routed) {
      return super.applyChange(targetDoc, change, options);
    }

    const effect = (change as { effect?: RqgActiveEffect }).effect;

    if ("error" in parsed) {
      RqgActiveEffect.#warnRoutedKey(effect, change, parsed.error.reason, parsed.error.detail);
      return {};
    }

    return RqgActiveEffect.#applyRoutedChange(targetDoc, change, parsed, options);
  }

  /**
   * @deprecated Legacy CUSTOM-mode syntax, superseded by `@`-routed keys (#920): use
   * "@<rqid>:system.path" / "@~<regex>:system.path" instead of "<rqid>:system.path" /
   * "~<regex>:system.path". Kept for one release as a shim for content the #920 migration
   * misses (unlinked packs, hand-authored GM effects); delete once that window has passed.
   */
  static override _applyChangeCustom(
    targetDoc: Actor.Implementation,
    change: ActiveEffect.ChangeData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    currentP: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    deltaP: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    changes: AnyMutableObject,
  ): void {
    const effect = (change as { effect?: RqgActiveEffect }).effect;
    const legacyKey = change.key ?? "";
    const parsed = parseRoutedKey(`@${legacyKey}`);
    if (!parsed.routed || "error" in parsed) {
      RqgActiveEffect.#warnRoutedKey(effect, change, "legacy-key-unparseable", undefined);
      return;
    }

    // console-only: a GM cannot fix pack content from a toast, and PR c's migration rewrites it
    RqgActiveEffect.#warnRoutedKey(effect, change, "legacy-syntax-deprecated", undefined, false);

    // Core passes no options to _applyChangeCustom, so unlike applyChange this path has to
    // rebuild the replacement data. That asymmetry disappears with the shim.
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
    // the `instanceof` narrows away TokenDocument, which isDocumentSubType does not accept
    const targetActor =
      targetDoc instanceof Actor &&
      isDocumentSubType<CharacterActor>(targetDoc, ActorTypeEnum.Character)
        ? targetDoc
        : undefined;
    const owningItem = effect?.parent instanceof Item ? effect.parent : undefined;

    const resolved = resolveRoutedTarget(selector, { targetActor, owningItem });
    if ("error" in resolved) {
      RqgActiveEffect.#warnRoutedKey(effect, change, resolved.error.reason, {
        actorName: targetDoc.name ?? "",
        ...resolved.error.detail,
      });
      return {};
    }

    // A routed key left on CUSTOM mode would otherwise vanish: core's field-level custom handler
    // only fires the `applyActiveEffect` hook, which RQG does not listen to, so `applyChangeField`
    // gets `undefined` back and writes nothing. Routed keys have always meant ADD, so keep
    // applying that and flag the mode. PR c's migration should rewrite the mode alongside the
    // key, leaving this as a safety net for pack content and hand-authored effects it misses.
    let changeType = change.type ?? "";
    if (changeType === "custom") {
      RqgActiveEffect.#warnRoutedKey(effect, change, "custom-mode-on-routed-key");
      changeType = "add";
    }

    // the contract is a property of (path, mode), so it holds for every resolved target
    const violation = checkFieldModeContract(systemPath, changeType);
    if (violation) {
      RqgActiveEffect.#warnRoutedKey(effect, change, violation, { systemPath });
      return {};
    }

    const fieldPath = systemPath.slice("system.".length);
    const itemChange = { ...change, key: systemPath, type: changeType };
    for (const target of resolved.items) {
      const item = target as unknown as RqgItem;
      const field = item.system.getFieldForProperty(fieldPath);
      if (!field) {
        RqgActiveEffect.#warnRoutedKey(effect, change, "field-not-found", { systemPath });
        continue;
      }

      try {
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

  static #warnRoutedKey(
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

import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import { assertDocumentSubType, getSpeakerFromItem, localize } from "../../system/util";
import { RqgLogger } from "../../system/logging/rqg-logger";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { RqgItem } from "@items/rqg-item.ts";
import {
  getEligibleRunes,
  getStrongestRune,
  hasEnoughToCastSpell,
} from "@items/rune-magic-item/rune-magic-casting.ts";
import type { RuneMagicRollOptions } from "../../rolls/rune-magic-roll/rune-magic-roll.types";
import type {
  RuneMagicRollDialogContext,
  RuneMagicRollDialogFormData,
} from "./rune-magic-roll-dialog-data.types.ts";
import type { PartialAbilityItem } from "../ability-roll-dialog/ability-roll-dialog-data.types.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { RuneMagicItem } from "@item-model/rune-magic-data-model.ts";
import type { CultItem } from "@item-model/cult-data-model.ts";
import {
  getConfiguredRollModeOptions,
  getDefaultRollMode,
  getSelectedRollMode,
} from "../app-parts/roll-mode";
import { RqgInteractiveRollApplicationBase } from "../app-parts/rqg-interactive-roll-application-base";

const logger = new RqgLogger("RuneMagicRollDialogV2");

export class RuneMagicRollDialogV2 extends RqgInteractiveRollApplicationBase {
  protected override getLivePreviewFormBehaviorConfig() {
    return {
      submitButtonSelectorForBlurGuard: "button[data-ability-roll]",
      updateLivePreview: () => this.updateLivePreview(),
    };
  }

  private computeTotalChance(formData: RuneMagicRollDialogFormData): number {
    const eligibleRunes = getEligibleRunes(this.spellItem);
    const usedRune = eligibleRunes.find((r) => r.id === formData.usedRuneId);
    return (
      Number(usedRune?.system.chance ?? 0) +
      Number(formData.augmentModifier ?? 0) +
      Number(formData.meditateModifier ?? 0) +
      Number(formData.otherModifier ?? 0)
    );
  }

  private static augmentOptions: SelectOptionData<number>[] = [
    { value: 0, label: "RQG.Dialog.Common.AugmentOptions.None" },
    { value: 50, label: "RQG.Dialog.Common.AugmentOptions.CriticalSuccess" },
    { value: 30, label: "RQG.Dialog.Common.AugmentOptions.SpecialSuccess" },
    { value: 20, label: "RQG.Dialog.Common.AugmentOptions.Success" },
    { value: -20, label: "RQG.Dialog.Common.AugmentOptions.Failure" },
    { value: -50, label: "RQG.Dialog.Common.AugmentOptions.Fumble" },
  ];

  private static meditateOptions: SelectOptionData<number>[] = [
    { value: 0, label: "RQG.Dialog.Common.MeditateOptions.None" },
    { value: 5, label: "RQG.Dialog.Common.MeditateOptions.1mr" },
    { value: 10, label: "RQG.Dialog.Common.MeditateOptions.2mr" },
    { value: 15, label: "RQG.Dialog.Common.MeditateOptions.5mr" },
    { value: 20, label: "RQG.Dialog.Common.MeditateOptions.25mr" },
    { value: 25, label: "RQG.Dialog.Common.MeditateOptions.50mr" },
  ];

  private static ritualOptions: SelectOptionData<number>[] = [
    { value: 30, label: "RQG.Dialog.Common.RitualOptions.30min" },
    { value: 35, label: "RQG.Dialog.Common.RitualOptions.1h" },
    { value: 40, label: "RQG.Dialog.Common.RitualOptions.5h" },
    { value: 45, label: "RQG.Dialog.Common.RitualOptions.10h" },
    { value: 50, label: "RQG.Dialog.Common.RitualOptions.1d" },
    { value: 55, label: "RQG.Dialog.Common.RitualOptions.2d" },
    { value: 60, label: "RQG.Dialog.Common.RitualOptions.1week" },
    { value: 70, label: "RQG.Dialog.Common.RitualOptions.4weeks" },
    { value: 75, label: "RQG.Dialog.Common.RitualOptions.1season" },
    { value: 80, label: "RQG.Dialog.Common.RitualOptions.1year" },
    { value: 85, label: "RQG.Dialog.Common.RitualOptions.2years" },
    { value: 90, label: "RQG.Dialog.Common.RitualOptions.5years" },
    { value: 95, label: "RQG.Dialog.Common.RitualOptions.10years" },
    { value: 100, label: "RQG.Dialog.Common.RitualOptions.20years" },
  ];

  private spellItem: RuneMagicItem;

  constructor(
    spellItem: RuneMagicItem,
    options?: Partial<foundry.applications.types.ApplicationConfiguration>,
  ) {
    super(options);
    this.spellItem = spellItem;
  }

  static override DEFAULT_OPTIONS = {
    id: "rune-magic-{id}",
    tag: "form",
    classes: [systemId, "form", "roll-dialog", "rune-magic-roll-dialog"],
    form: {
      handler: RuneMagicRollDialogV2.onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    position: {
      width: "auto" as const,
      height: "auto" as const,
      left: 35,
      top: 15,
    },
    window: {
      contentClasses: ["standard-form"],
      icon: "fa-solid fa-dice",
      title: "RQG.Dialog.RuneMagicRoll.Title",
      resizable: false,
    },
  };

  static override PARTS = {
    header: { template: templatePaths.rollHeader },
    form: { template: templatePaths.runeMagicRollDialogV2, scrollable: [""] },
    footer: { template: templatePaths.rollFooter },
  };

  override async _prepareContext(): Promise<RuneMagicRollDialogContext> {
    const formData = ((this.element &&
      new foundry.applications.ux.FormDataExtended(this.element, {}).object) ??
      {}) as RuneMagicRollDialogFormData;

    const speaker = getSpeakerFromItem(this.spellItem);

    const eligibleRunes = getEligibleRunes(this.spellItem);

    const eligibleRuneOptions = eligibleRunes.map((rune) => ({
      value: rune.id ?? "",
      label: rune.name ?? "",
    }));
    formData.levelUsed ??= this.spellItem.system.points;
    formData.usedRuneId ??= getStrongestRune(eligibleRunes)?.id ?? "";
    formData.boost ??= 0;
    formData.augmentModifier ??= 0;
    formData.meditateModifier ??= 0;
    formData.otherModifier ??= 0;
    formData.otherModifierDescription ??= localize("RQG.Dialog.RuneMagicRoll.OtherModifier");
    formData.spellItemUuid ??= this.spellItem.uuid;

    const usedRune = eligibleRunes.find((r) => r.id === formData.usedRuneId);

    return {
      formData: formData,

      speakerName: speaker.alias ?? "",
      isStackable: this.spellItem.system.isStackable,
      isOneUse: this.spellItem.system.isOneUse,
      usedRune: usedRune,
      eligibleRuneOptions: eligibleRuneOptions,
      augmentOptions: RuneMagicRollDialogV2.augmentOptions,
      meditateOptions: RuneMagicRollDialogV2.meditateOptions,
      ritualOptions: RuneMagicRollDialogV2.ritualOptions,

      // RollHeader
      rollType: localize("TYPES.Item.runeMagic"),
      rollName: this.spellItem.name ?? "",
      spellSummary: this.spellItem.spellSummary ?? "",
      spellSummaryTooltip: this.spellItem.spellSummaryTooltip ?? "",
      baseChance: (usedRune?.system.chance ?? 0) + "%",

      // RollFooter
      totalChance:
        Number(usedRune?.system.chance ?? 0) +
        Number(formData.augmentModifier ?? 0) +
        Number(formData.meditateModifier ?? 0) +
        Number(formData.otherModifier ?? 0),
      rollMode: this.rollMode,
      rollModes: getConfiguredRollModeOptions(),
    };
  }

  private updateLivePreview(): void {
    const totalChanceElement = this.element.querySelector<HTMLElement>("[data-total-chance]");
    if (!totalChanceElement) {
      return;
    }

    const formData = new foundry.applications.ux.FormDataExtended(this.element, {})
      .object as RuneMagicRollDialogFormData;
    totalChanceElement.textContent = `${this.computeTotalChance(formData)}%`;
  }

  private static async onSubmit(
    event: SubmitEvent | Event,
    form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const formDataObject = formData.object as RuneMagicRollDialogFormData;

    const rollMode =
      getSelectedRollMode(
        form?.querySelector<HTMLButtonElement>(
          'button[data-action="rollMode"][aria-pressed="true"]',
        )?.dataset["rollMode"],
      ) ?? getDefaultRollMode();

    const spellItem: RqgItem | PartialAbilityItem | undefined = (await fromUuid(
      formDataObject.spellItemUuid ?? "",
    )) as RqgItem | undefined;

    if (!spellItem || !(spellItem instanceof RqgItem)) {
      ui.notifications?.error("Could not find an rune magic spellItem to roll.");
      return;
    }
    assertDocumentSubType<RuneMagicItem>(spellItem, ItemTypeEnum.RuneMagic);

    const eligibleRunes = getEligibleRunes(spellItem);

    const usedRune = eligibleRunes.find((r) => r.id === formDataObject.usedRuneId);
    if (!usedRune) {
      const msg = "No rune to cast the rune magic spell";
      return logger.throw(msg, formDataObject);
    }

    const actor = spellItem.parent as RqgActor | undefined;
    const cult = actor?.items.find((i) => i.id === spellItem.system.cultId) as RqgItem | undefined;
    if (!cult) {
      const msg = "No cult to cast the rune magic spell";
      return logger.throw(msg, {
        actorId: actor?.id,
        spellItemId: spellItem.id,
        cultId: spellItem.system.cultId,
      });
    }
    assertDocumentSubType<CultItem>(cult, ItemTypeEnum.Cult);
    const options: RuneMagicRollOptions = {
      usedRune: usedRune,
      runeMagicItem: spellItem,
      levelUsed: formDataObject.levelUsed,
      magicPointBoost: formDataObject.boost,
      modifiers: [
        {
          value: Number(formDataObject.augmentModifier),
          description: localize("RQG.Roll.RuneMagicRoll.Augment"),
        },
        {
          value: Number(formDataObject.meditateModifier),
          description:
            Number(formDataObject.meditateModifier) >= 30
              ? localize("RQG.Roll.RuneMagicRoll.Ritual")
              : localize("RQG.Roll.RuneMagicRoll.Meditate"),
        },
        {
          value: Number(formDataObject.otherModifier),
          description: formDataObject.otherModifierDescription,
        },
      ],
      speaker: getSpeakerFromItem(spellItem),
      rollMode: rollMode,
    };
    const validationError = hasEnoughToCastSpell(
      cult,
      formDataObject.levelUsed,
      formDataObject.boost,
    );
    if (validationError) {
      ui.notifications?.warn(validationError);
      return;
    }

    await spellItem.runeMagicRollImmediate(options);
  }
}

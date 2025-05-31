import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import {
  assertItemType,
  getDomDataset,
  getGame,
  getSpeakerFromItem,
  localize,
  RqgError,
} from "../../system/util";
import type { RqgActor } from "../../actors/rqgActor";
import { RqgItem } from "../../items/rqgItem";
import { RuneMagic } from "../../items/rune-magic-item/runeMagic";
import type { RuneMagicRollOptions } from "../../rolls/RuneMagicRoll/RuneMagicRoll.types";
import type {
  RuneMagicRollDialogContext,
  RuneMagicRollDialogFormData,
} from "./RuneMagicRollDialogData.types";
import type { PartialAbilityItem } from "../AbilityRollDialog/AbilityRollDialogData.types";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import type { RollMode } from "../../chat/chatMessage.types";

// @ts-expect-error application v2
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class RuneMagicRollDialogV2 extends HandlebarsApplicationMixin(ApplicationV2) {
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

  private spellItem: RqgItem;
  private rollMode: RollMode;

  constructor(options: { spellItem: RqgItem }) {
    super(options);
    this.spellItem = options.spellItem;
    this.rollMode = getGame().settings.get("core", "rollMode");
  }

  static DEFAULT_OPTIONS = {
    id: "{id}",
    tag: "form",
    form: {
      handler: RuneMagicRollDialogV2.onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    position: {
      width: 400,
      left: 35,
      top: 15,
    },
    window: {
      resizable: true,
      contentClasses: [systemId, "form", "roll-dialog", "rune-magic-roll-dialog", "themed"],
    },
  };

  static PARTS = {
    form: {
      template: templatePaths.runeMagicRollDialogV2,
    },
  };

  get title() {
    return localize("RQG.Dialog.RuneMagicRoll.Title");
  }

  async _prepareContext(): Promise<RuneMagicRollDialogContext> {
    const formData: RuneMagicRollDialogFormData =
      // @ts-expect-error object
      (this.element && new foundry.applications.ux.FormDataExtended(this.element, {}).object) ?? {};

    const speaker = getSpeakerFromItem(this.spellItem);

    const eligibleRunes = RuneMagic.getEligibleRunes(this.spellItem);

    const eligibleRuneOptions = eligibleRunes.map((rune: RqgItem) => ({
      value: rune.id ?? "",
      label: rune.name ?? "",
    }));
    formData.levelUsed ??= this.spellItem.system.points;
    formData.usedRuneId ??= RuneMagic.getStrongestRune(eligibleRunes)?.id ?? "";
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
      spell: this.spellItem,
      usedRune: usedRune,
      eligibleRuneOptions: eligibleRuneOptions,
      augmentOptions: RuneMagicRollDialogV2.augmentOptions,
      meditateOptions: RuneMagicRollDialogV2.meditateOptions,
      ritualOptions: RuneMagicRollDialogV2.ritualOptions,

      totalChance:
        Number(usedRune?.system.chance ?? 0) +
        Number(formData.augmentModifier ?? 0) +
        Number(formData.meditateModifier ?? 0) +
        Number(formData.otherModifier ?? 0),
      rollMode: this.rollMode,
    };
  }

  _onRender(context: any, options: any) {
    super._onRender(context, options);
    // @ts-expect-error element
    this.element
      .querySelector("[data-roll-mode-parent]")
      .addEventListener("click", this.onChangeRollMode.bind(this));
  }

  _onChangeForm(): void {
    // @ts-expect-error render
    this.render();
  }

  private onChangeRollMode(event: SubmitEvent) {
    const target = event.target as HTMLButtonElement;
    const newRollMode = getDomDataset(target, "roll-mode") as RollMode | undefined;
    if (!newRollMode) {
      return; // Clicked outside the buttons
    }
    this.rollMode = newRollMode;

    // @ts-expect-error render
    this.render();
  }

  private static async onSubmit(
    event: SubmitEvent,
    form: HTMLFormElement,
    formData: any,
  ): Promise<void> {
    const formDataObject: RuneMagicRollDialogFormData = formData.object;

    const rollMode =
      (form?.querySelector<HTMLButtonElement>('button[data-action="rollMode"][aria-pressed="true"]')
        ?.dataset.rollMode as RollMode) ?? getGame().settings.get("core", "rollMode");

    const spellItem: RqgItem | PartialAbilityItem | undefined = (await fromUuid(
      formDataObject.spellItemUuid ?? "",
    )) as RqgItem | undefined;

    if (!spellItem || !(spellItem instanceof RqgItem)) {
      ui.notifications?.error("Could not find an rune magic spellItem to roll.");
      return;
    }
    assertItemType(spellItem.type, ItemTypeEnum.RuneMagic);

    const eligibleRunes = RuneMagic.getEligibleRunes(spellItem);

    const usedRune = eligibleRunes.find((r) => r.id === formDataObject.usedRuneId);
    if (!usedRune) {
      const msg = "No rune to cast the rune magic spell";
      throw new RqgError(msg);
    }

    const actor = spellItem.parent as RqgActor | undefined;
    const cult = actor?.items.find((i) => i.id === spellItem.system.cultId);
    if (!cult) {
      const msg = "No cult to cast the rune magic spell";
      throw new RqgError(msg);
    }

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
    const validationError = RuneMagic.hasEnoughToCastSpell(
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

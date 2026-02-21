import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import type {
  SpiritMagicRollDialogContext,
  SpiritMagicRollDialogFormData,
} from "./SpiritMagicRollDialogData.types.ts";
import {
  assertDocumentSubType,
  getDomDataset,
  getSpeakerFromItem,
  localize,
} from "../../system/util";
import type { SpiritMagicRollOptions } from "../../rolls/SpiritMagicRoll/SpiritMagicRoll.types";
import { RqgItem } from "@items/rqgItem.ts";
import { SpiritMagic } from "@items/spirit-magic-item/spiritMagic.ts";
import type { PartialAbilityItem } from "../AbilityRollDialog/AbilityRollDialogData.types.ts";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import type { SpiritMagicItem } from "@item-model/spiritMagicData.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqgActorData.ts";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SpiritMagicRollDialogV2 extends HandlebarsApplicationMixin(
  ApplicationV2<SpiritMagicRollDialogContext>,
) {
  override get element(): HTMLFormElement {
    return super.element as HTMLFormElement;
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

  private spellItem: SpiritMagicItem;
  private powX5: number;
  private rollMode: CONST.DICE_ROLL_MODES;

  constructor(
    spellItem: SpiritMagicItem,
    options?: Partial<foundry.applications.types.ApplicationConfiguration>,
  ) {
    super(options);

    const actor = spellItem.parent;
    assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);

    this.spellItem = spellItem;
    this.powX5 = (actor.system?.characteristics?.power?.value ?? 0) * 5;
    this.rollMode =
      (game.settings?.get("core", "rollMode") as CONST.DICE_ROLL_MODES) ??
      CONST.DICE_ROLL_MODES.PUBLIC;
  }

  static override DEFAULT_OPTIONS = {
    id: "spirit-magic-{id}",
    tag: "form",
    classes: [systemId, "form", "roll-dialog", "spirit-magic-roll-dialog"],
    form: {
      handler: SpiritMagicRollDialogV2.onSubmit,
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
      title: "RQG.Dialog.SpiritMagicRoll.Title",
      resizable: false,
    },
  };

  static override PARTS = {
    header: { template: templatePaths.rollHeader },
    form: { template: templatePaths.spiritMagicRollDialogV2, scrollable: [""] },
    footer: { template: templatePaths.rollFooter },
  };

  override async _prepareContext(): Promise<SpiritMagicRollDialogContext> {
    const formData = ((this.element &&
      new foundry.applications.ux.FormDataExtended(this.element, {}).object) ??
      {}) as SpiritMagicRollDialogFormData;

    const speaker = getSpeakerFromItem(this.spellItem);

    formData.levelUsed ??= this.spellItem.system.points;
    formData.boost ??= 0;
    formData.augmentModifier ??= 0;
    formData.meditateModifier ??= 0;
    formData.otherModifier ??= 0;
    formData.otherModifierDescription ??= localize("RQG.Dialog.SpiritMagicRoll.OtherModifier");
    formData.powX5 ??= this.powX5;
    formData.spellItemUuid ??= this.spellItem.uuid;

    return {
      formData: formData,

      speakerName: speaker.alias ?? "",
      isVariable: this.spellItem.system.isVariable && this.spellItem.system.points > 1,
      augmentOptions: SpiritMagicRollDialogV2.augmentOptions,
      meditateOptions: SpiritMagicRollDialogV2.meditateOptions,

      // RollHeader
      rollType: localize("TYPES.Item.spiritMagic"),
      rollName: this.spellItem.name ?? "",
      spellSignature: this.spellItem.spellSignature ?? "",
      baseChance: (this.powX5 ?? 0) + "%",

      // RollFooter
      totalChance:
        Number(this.powX5) +
        Number(formData.augmentModifier) +
        Number(formData.meditateModifier) +
        Number(formData.otherModifier),
      rollMode: this.rollMode,
    };
  }

  override async _onRender(context: any, options: any): Promise<void> {
    super._onRender(context, options);
    this.element
      .querySelector<HTMLElement>("[data-roll-mode-parent]")
      ?.addEventListener("click", this.onChangeRollMode.bind(this));
  }

  override _onChangeForm(): void {
    this.render();
  }

  private onChangeRollMode(event: MouseEvent) {
    const target = event.target as HTMLButtonElement;
    const newRollMode = getDomDataset(target, "roll-mode");
    if (!newRollMode || !(Object.values(CONST.DICE_ROLL_MODES) as string[]).includes(newRollMode)) {
      return; // Clicked outside the buttons, or not a valid roll mode
    }
    this.rollMode = newRollMode as CONST.DICE_ROLL_MODES;

    this.render();
  }

  private static async onSubmit(
    _event: SubmitEvent | Event,
    form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const formDataObject = formData.object as SpiritMagicRollDialogFormData;

    const rollMode = (form?.querySelector<HTMLButtonElement>(
      'button[data-action="rollMode"][aria-pressed="true"]',
    )?.dataset["rollMode"] ??
      game.settings?.get("core", "rollMode") ??
      CONST.DICE_ROLL_MODES.PUBLIC) as CONST.DICE_ROLL_MODES;

    const spellItem: RqgItem | PartialAbilityItem | undefined = (await fromUuid(
      formDataObject.spellItemUuid ?? "",
    )) as RqgItem | undefined;

    if (!spellItem || !(spellItem instanceof RqgItem)) {
      ui.notifications?.error("Could not find an spirit magic spellItem to roll.");
      return;
    }
    assertDocumentSubType<SpiritMagicItem>(spellItem, ItemTypeEnum.SpiritMagic);

    const options: SpiritMagicRollOptions = {
      powX5: formDataObject.powX5,
      levelUsed: formDataObject.levelUsed,
      magicPointBoost: formDataObject.boost,
      modifiers: [
        {
          value: Number(formDataObject.augmentModifier),
          description: localize("RQG.Roll.AbilityRoll.Augment"),
        },
        {
          value: Number(formDataObject.meditateModifier),
          description: localize("RQG.Roll.AbilityRoll.Meditate"),
        },
        {
          value: Number(formDataObject.otherModifier),
          description: formDataObject.otherModifierDescription,
        },
      ],
      spellName: spellItem?.name ?? undefined,
      spellImg: spellItem?.img ?? undefined,
      rollMode: rollMode,
      speaker: getSpeakerFromItem(spellItem),
    };
    const validationError = SpiritMagic.hasEnoughToCastSpell(
      formDataObject.levelUsed,
      formDataObject.boost,
      spellItem,
    );
    if (validationError) {
      ui.notifications?.warn(validationError);
      return;
    }

    await spellItem.spiritMagicRollImmediate(options);
  }
}

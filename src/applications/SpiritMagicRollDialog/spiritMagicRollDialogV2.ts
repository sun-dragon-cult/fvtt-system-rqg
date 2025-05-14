import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import {
  SpiritMagicRollDialogContext,
  SpiritMagicRollDialogFormData,
} from "./SpiritMagicRollDialogData.types";
import {
  assertItemType,
  getDomDataset,
  getGame,
  getSpeakerFromItem,
  localize,
} from "../../system/util";
import type { SpiritMagicRollOptions } from "../../rolls/SpiritMagicRoll/SpiritMagicRoll.types";
import { RqgItem } from "../../items/rqgItem";
import { SpiritMagic } from "../../items/spirit-magic-item/spiritMagic";
import { PartialAbilityItem } from "../AbilityRollDialog/AbilityRollDialogData.types";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import type { RollMode } from "../../chat/chatMessage.types";

// @ts-expect-error application v2
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SpiritMagicRollDialogV2 extends HandlebarsApplicationMixin(ApplicationV2) {
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

  private spellItem: RqgItem;
  private powX5: number;
  private rollMode: RollMode;

  constructor(options: { spellItem: RqgItem }) {
    super(options);

    this.spellItem = options.spellItem;
    this.powX5 = (this.spellItem.parent?.system?.characteristics?.power?.value ?? 0) * 5;
    this.rollMode = getGame().settings.get("core", "rollMode");
  }

  static DEFAULT_OPTIONS = {
    id: "{id}",
    tag: "form",
    form: {
      handler: SpiritMagicRollDialogV2.onSubmit,
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
      contentClasses: [systemId, "form", "roll-dialog", "spirit-magic-roll-dialog"],
    },
  };

  static PARTS = {
    form: {
      template: templatePaths.spiritMagicRollDialogV2,
    },
  };

  get title() {
    return localize("RQG.Dialog.SpiritMagicRoll.Title");
  }

  async _prepareContext(): Promise<SpiritMagicRollDialogContext> {
    const formData: SpiritMagicRollDialogFormData =
      // @ts-expect-error object
      (this.element && new FormDataExtended(this.element, {}).object) ?? {};

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
      spellName: this.spellItem.name,
      spellSignature: this.spellItem.spellSignature,

      isVariable: this.spellItem.system.isVariable && this.spellItem.system.points > 1,
      spellImg: this.spellItem.img,

      augmentOptions: SpiritMagicRollDialogV2.augmentOptions,
      meditateOptions: SpiritMagicRollDialogV2.meditateOptions,
      totalChance:
        Number(this.powX5) +
        Number(formData.augmentModifier) +
        Number(formData.meditateModifier) +
        Number(formData.otherModifier),
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
    const formDataObject: SpiritMagicRollDialogFormData = formData.object;

    const rollMode =
      (form?.querySelector<HTMLButtonElement>('button[data-action="rollMode"].active')?.dataset
        .rollMode as RollMode) ?? getGame().settings.get("core", "rollMode");

    const spellItem: RqgItem | PartialAbilityItem | undefined = (await fromUuid(
      formDataObject.spellItemUuid ?? "",
    )) as RqgItem | undefined;

    if (!spellItem || !(spellItem instanceof RqgItem)) {
      ui.notifications?.error("Could not find an spirit magic spellItem to roll.");
      return;
    }
    assertItemType(spellItem.type, ItemTypeEnum.SpiritMagic);

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

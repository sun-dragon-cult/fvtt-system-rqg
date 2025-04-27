import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import {
  AbilityRollDialogContext,
  AbilityRollDialogFormData,
  PartialAbilityItem,
} from "./AbilityRollDialogData.types";
import { AbilityRoll } from "../../rolls/AbilityRoll/AbilityRoll";
import type { AbilityRollOptions } from "../../rolls/AbilityRoll/AbilityRoll.types";
import { getSpeakerFromItem, localize, RqgError } from "../../system/util";
import { RqgItem } from "../../items/rqgItem";

// @ts-expect-error application v2
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class AbilityRollDialogV2 extends HandlebarsApplicationMixin(ApplicationV2) {
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

  private abilityItem: RqgItem | PartialAbilityItem; // A fake reduced RqgItem to make reputation rolls work

  constructor(
    options: Partial<AbilityRollOptions & { abilityItem?: RqgItem | PartialAbilityItem }>,
  ) {
    super(options);
    if (!options.abilityItem) {
      const msg = "No AbilityItem to roll for";
      ui.notifications?.warn(msg);
      setTimeout(() => {
        // @ts-expect-error close
        void this.close();
      }, 500); // Wait to make sure the dialog exists before closing - TODO ugly hack
      throw new RqgError(msg);
    }

    this.abilityItem = options.abilityItem;
  }

  static DEFAULT_OPTIONS = {
    id: "{id}",
    tag: "form",
    form: {
      handler: AbilityRollDialogV2.onSubmit,
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
      contentClasses: [systemId, "form", "roll-dialog", "ability-roll-dialog"],
    },
  };

  static PARTS = {
    form: {
      template: templatePaths.abilityRollDialogV2,
    },
  };

  get title() {
    return localize("RQG.Dialog.AbilityRoll.Title");
  }

  async _prepareContext(): Promise<AbilityRollDialogContext> {
    const formData: AbilityRollDialogFormData =
      // @ts-expect-error object
      (this.element && new FormDataExtended(this.element, {}).object) ?? {};

    formData.augmentModifier ??= "0";
    formData.meditateModifier ??= "0";
    formData.otherModifier ??= "0";
    formData.otherModifierDescription ??= localize("RQG.Dialog.AbilityRoll.OtherModifier");
    formData.abilityItemUuid ??= this.abilityItem?.uuid;

    if (!(this.abilityItem instanceof RqgItem)) {
      const minimalAbilityItem: PartialAbilityItem = {
        name: this.abilityItem.name,
        type: this.abilityItem.type,
        img: this.abilityItem.img,
        system: { chance: this.abilityItem.system.chance },
      };
      formData.reputationItemJson = JSON.stringify(minimalAbilityItem);
    }

    const speaker = getSpeakerFromItem(this.abilityItem);
    return {
      formData: formData,
      abilityItem: this.abilityItem,
      speakerName: speaker.alias ?? "",
      augmentOptions: AbilityRollDialogV2.augmentOptions,
      meditateOptions: AbilityRollDialogV2.meditateOptions,
      totalChance:
        Number(this.abilityItem.system.chance ?? 0) +
        Number(formData.augmentModifier ?? 0) +
        Number(formData.meditateModifier ?? 0) +
        Number(formData.otherModifier ?? 0),
    };
  }

  _onChangeForm(): void {
    // @ts-expect-error render
    this.render();
  }

  private static async onSubmit(
    event: SubmitEvent,
    form: HTMLFormElement,
    formData: any,
  ): Promise<void> {
    const formDataObject: AbilityRollDialogFormData = formData.object;

    let abilityItem: RqgItem | PartialAbilityItem | undefined = (await fromUuid(
      formDataObject.abilityItemUuid ?? "",
    )) as RqgItem | undefined;

    if (!abilityItem) {
      abilityItem = JSON.parse(formDataObject.reputationItemJson ?? "");
    }

    if (!abilityItem) {
      ui.notifications?.error("Could not find an ability to roll.");
      return;
    }

    const options: AbilityRollOptions = {
      naturalSkill: abilityItem?.system.chance,
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
      abilityName: abilityItem?.name ?? undefined,
      abilityType: abilityItem?.type ?? undefined,
      abilityImg: abilityItem?.img ?? undefined,
      speaker: getSpeakerFromItem(abilityItem),
    };

    if (abilityItem instanceof RqgItem) {
      await abilityItem.abilityRollImmediate(options);
    } else {
      // Bypasses item.abilityRollImmediate to make reputation rolls work (they are not an item)
      const roll = await AbilityRoll.rollAndShow(options);
      if (roll.successLevel == null) {
        throw new RqgError("Evaluated AbilityRoll didn't give successLevel");
      }
    }
  }
}

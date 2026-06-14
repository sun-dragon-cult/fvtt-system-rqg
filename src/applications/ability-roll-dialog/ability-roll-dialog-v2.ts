import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import type {
  AbilityRollDialogContext,
  AbilityRollDialogFormData,
  PartialAbilityItem,
} from "./ability-roll-dialog-data.types";
import { AbilityRoll } from "../../rolls/ability-roll/ability-roll";
import type { AbilityRollOptions } from "../../rolls/ability-roll/ability-roll.types";
import {
  getSpeakerDisplayName,
  getSpeakerFromItem,
  localize,
  localizeItemType,
} from "../../system/util";
import { getSpeakerCompat } from "../../system/fvtt-type-compat";
import { RqgLogger } from "../../system/logging/rqg-logger";
import { RqgItem } from "@items/rqg-item.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { AbilityItem } from "@item-model/item-types.ts";
import {
  getConfiguredRollModeOptions,
  getDefaultRollMode,
  getSelectedRollMode,
} from "../app-parts/roll-mode";
import { RqgInteractiveRollApplicationBase } from "../app-parts/rqg-interactive-roll-application-base";

const logger = new RqgLogger("AbilityRollDialogV2");

export class AbilityRollDialogV2 extends RqgInteractiveRollApplicationBase {
  protected override getLivePreviewFormBehaviorConfig() {
    return {
      submitButtonSelectorForBlurGuard: "button[data-ability-roll]",
      updateLivePreview: () => this.updateLivePreview(),
    };
  }

  private computeTotalChance(formData: AbilityRollDialogFormData): number {
    return (
      Number(this.abilityItem.system.chance ?? 0) +
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

  private abilityItem: AbilityItem | PartialAbilityItem; // A fake reduced RqgItem to make reputation rolls work
  private token: TokenDocument | null | undefined;

  constructor(
    abilityItem: AbilityItem | PartialAbilityItem,
    token?: TokenDocument | null,
    options?: Partial<foundry.applications.types.ApplicationConfiguration>,
  ) {
    super(options);
    if (!abilityItem) {
      const msg = "No AbilityItem to roll for";
      logger.throw(msg);
    }

    this.abilityItem = abilityItem;
    this.token = token;
  }

  static override DEFAULT_OPTIONS = {
    id: "{id}",
    tag: "form",
    classes: [systemId, "form", "roll-dialog", "ability-roll-dialog"],
    form: {
      handler: AbilityRollDialogV2.onSubmit,
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
      title: "RQG.Dialog.AbilityRoll.Title",
      resizable: false,
    },
  };

  static override PARTS = {
    header: { template: templatePaths.rollHeader },
    form: { template: templatePaths.abilityRollDialogV2, scrollable: [""] },
    footer: { template: templatePaths.rollFooter },
  };

  override async _prepareContext(): Promise<AbilityRollDialogContext> {
    const formData = ((this.element &&
      new foundry.applications.ux.FormDataExtended(this.element, {}).object) ??
      {}) as AbilityRollDialogFormData;

    formData.augmentModifier ??= "0";
    formData.meditateModifier ??= "0";
    formData.otherModifier ??= "0";
    formData.otherModifierDescription ??= localize("RQG.Dialog.AbilityRoll.OtherModifier");
    formData.abilityItemUuid ??= this.abilityItem?.uuid ?? undefined;
    formData.abilityActorUuid ??=
      this.abilityItem instanceof RqgItem
        ? (this.abilityItem.actor?.uuid ?? undefined)
        : (this.abilityItem.parent?.uuid ?? undefined);
    formData.tokenUuid ??= this.token?.uuid ?? undefined;

    if (!(this.abilityItem instanceof RqgItem)) {
      const minimalAbilityItem: PartialAbilityItem = {
        name: this.abilityItem.name,
        type: this.abilityItem.type,
        img: this.abilityItem.img,
        system: { chance: this.abilityItem.system.chance },
      };
      formData.reputationItemJson = JSON.stringify(minimalAbilityItem);
    }

    const speaker =
      this.abilityItem instanceof RqgItem
        ? getSpeakerCompat({ actor: this.abilityItem.actor ?? undefined, token: this.token })
        : this.abilityItem.parent
          ? getSpeakerCompat({ actor: this.abilityItem.parent, token: this.token })
          : getSpeakerFromItem(this.abilityItem);
    return {
      formData: formData,
      speakerName: getSpeakerDisplayName(speaker),
      augmentOptions: AbilityRollDialogV2.augmentOptions,
      meditateOptions: AbilityRollDialogV2.meditateOptions,

      // RollHeader
      rollType: this.abilityItem.type ? localizeItemType(this.abilityItem.type) : "",
      rollName: this.abilityItem.name ?? "",
      baseChance: (this.abilityItem.system.chance ?? 0) + "%",

      // RollFooter
      totalChance:
        Number(this.abilityItem.system.chance ?? 0) +
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
      .object as AbilityRollDialogFormData;
    totalChanceElement.textContent = `${this.computeTotalChance(formData)}%`;
  }

  private static async onSubmit(
    event: SubmitEvent | Event,
    form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const formDataObject = formData.object as AbilityRollDialogFormData;

    const rollMode =
      getSelectedRollMode(
        form?.querySelector<HTMLButtonElement>(
          'button[data-action="rollMode"][aria-pressed="true"]',
        )?.dataset["rollMode"],
      ) ?? getDefaultRollMode();

    let abilityItem = (await fromUuid(formDataObject.abilityItemUuid ?? "")) as
      | AbilityItem
      | PartialAbilityItem
      | undefined;

    const token = formDataObject.tokenUuid
      ? ((await fromUuid(formDataObject.tokenUuid)) as TokenDocument | undefined)
      : undefined;

    const actor = formDataObject.abilityActorUuid
      ? ((await fromUuid(formDataObject.abilityActorUuid)) as RqgActor | undefined)
      : undefined;

    if (!abilityItem) {
      abilityItem = JSON.parse(formDataObject.reputationItemJson ?? "");
    }

    if (!abilityItem) {
      ui.notifications?.error("Could not find an ability to roll.");
      return;
    }

    const options: AbilityRollOptions = {
      naturalSkill: abilityItem?.system.chance ?? 0,
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
      abilityType: (abilityItem as any)?.type ?? undefined,
      abilityImg: abilityItem?.img ?? undefined,
      speaker: actor ? getSpeakerCompat({ actor, token }) : getSpeakerFromItem(abilityItem),
      rollMode: rollMode,
    };

    if (abilityItem instanceof RqgItem) {
      await abilityItem.abilityRollImmediate(options, token);
    } else {
      // Bypasses item.abilityRollImmediate to make reputation rolls work (they are not an item)
      const roll = await AbilityRoll.rollAndShow(options);
      if (roll.successLevel == null) {
        logger.throw("Evaluated AbilityRoll didn't give successLevel", roll, options);
      }
    }
  }
}

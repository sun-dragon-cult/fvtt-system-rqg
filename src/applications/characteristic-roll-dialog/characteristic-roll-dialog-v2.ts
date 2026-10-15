import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import type {
  CharacteristicRollDialogContext,
  CharacteristicRollDialogFormData,
} from "./characteristic-roll-dialog-data.types.ts";
import { DEFAULT_DIFFICULTY } from "../../rolls/characteristic-roll/characteristic-roll.types.ts";
import {
  assertDocumentSubType,
  getSpeakerDisplayName,
  localize,
  normalizeOtherModifierDescriptionForRoll,
} from "../../system/util";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { Characteristics } from "../../data-model/actor-data/characteristics";
import { ActorTypeEnum } from "../../data-model/actor-data/rqg-actor-data.ts";
import type { CharacterActor } from "../../data-model/actor-data/rqg-actor-data.ts";
import {
  getConfiguredRollModeOptions,
  getDefaultRollMode,
  getSelectedRollMode,
} from "../app-parts/roll-mode";
import { augmentOptions, meditateOptions } from "../app-parts/augment-meditate-options";
import { RqgInteractiveRollApplicationBase } from "../app-parts/rqg-interactive-roll-application-base";
import { getSpeakerCompat } from "../../system/fvtt-type-compat";
import type { Modifier } from "../../rolls/ability-roll/ability-roll.types";
import {
  type PreparedRoll,
  preparedModifierTotal,
  preparedRoll,
} from "../../rolls/roll-preparation";
import { preparedRollHtml } from "../app-parts/prepared-roll-view";

export class CharacteristicRollDialogV2 extends RqgInteractiveRollApplicationBase {
  protected override getLivePreviewFormBehaviorConfig() {
    return {
      submitButtonSelectorForBlurGuard: "button[data-ability-roll]",
      updateLivePreview: () => this.updateLivePreview(),
    };
  }

  private computeTotalChance(formData: CharacteristicRollDialogFormData): number {
    return (
      Math.ceil(
        Number(formData.characteristicValue) *
          CharacteristicRollDialogV2.getDifficulty(formData.difficulty),
      ) +
      Number(formData.augmentModifier ?? 0) +
      Number(formData.meditateModifier ?? 0) +
      Number(formData.otherModifier ?? 0) +
      preparedModifierTotal(this.prepared)
    );
  }

  /** The modifiers the roll gets from the dialog. */
  private static formModifiers(formData: CharacteristicRollDialogFormData): Modifier[] {
    return [
      {
        value: Number(formData.augmentModifier),
        description: localize("RQG.Roll.Common.Augment"),
      },
      {
        value: Number(formData.meditateModifier),
        description: localize("RQG.Roll.Common.Meditate"),
      },
      {
        value: Number(formData.otherModifier),
        description: normalizeOtherModifierDescriptionForRoll(formData.otherModifierDescription),
      },
    ];
  }

  /** What the prepare hook makes of the roll as the form stands. */
  private prepareRoll(formData: CharacteristicRollDialogFormData): PreparedRoll {
    const modifiers = CharacteristicRollDialogV2.formModifiers(formData);
    const { options, preparation } = this.actor.prepareCharacteristicRoll(this.characteristicName, {
      token: this.token,
      difficulty: CharacteristicRollDialogV2.getDifficulty(formData.difficulty),
      modifiers,
    });
    return preparedRoll(options.modifiers, modifiers.length, preparation);
  }

  private static difficultyOptions: SelectOptionData<number>[] = [
    { value: 0, label: "RQG.Dialog.CharacteristicRoll.RollDifficultyLevel.0" },
    { value: 1, label: "RQG.Dialog.CharacteristicRoll.RollDifficultyLevel.1" },
    { value: 2, label: "RQG.Dialog.CharacteristicRoll.RollDifficultyLevel.2" },
    { value: 3, label: "RQG.Dialog.CharacteristicRoll.RollDifficultyLevel.3" },
    { value: 4, label: "RQG.Dialog.CharacteristicRoll.RollDifficultyLevel.4" },
    { value: 5, label: "RQG.Dialog.CharacteristicRoll.RollDifficultyLevel.5" },
    { value: 6, label: "RQG.Dialog.CharacteristicRoll.RollDifficultyLevel.6" },
  ];

  private actor: RqgActor;
  private characteristicName: keyof Characteristics;
  private token: TokenDocument | null | undefined;

  constructor(
    actor: RqgActor,
    characteristicName: keyof Characteristics,
    token?: TokenDocument | null,
    options?: Partial<foundry.applications.types.ApplicationConfiguration>,
  ) {
    super(options);
    this.actor = actor;
    this.characteristicName = characteristicName;
    this.token = token;
  }

  static override DEFAULT_OPTIONS = {
    id: `characteristic-{id}`,
    tag: "form",
    classes: [systemId, "form", "roll-dialog", "characteristic-roll-dialog"],
    form: {
      handler: CharacteristicRollDialogV2.onSubmit,
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
      title: "RQG.Dialog.CharacteristicRoll.Title",
      resizable: false,
    },
  };

  static override PARTS = {
    header: { template: templatePaths.rollHeader },
    form: { template: templatePaths.characteristicRollDialogV2, scrollable: [""] },
    footer: { template: templatePaths.rollFooter },
  };

  override async _prepareContext(): Promise<CharacteristicRollDialogContext> {
    assertDocumentSubType<CharacterActor>(this.actor, ActorTypeEnum.Character);

    const formData = ((this.element &&
      new foundry.applications.ux.FormDataExtended(this.form!, {}).object) ??
      {}) as CharacteristicRollDialogFormData;

    formData.difficulty ??= DEFAULT_DIFFICULTY;
    formData.augmentModifier ??= "0";
    formData.meditateModifier ??= "0";
    formData.otherModifier ??= "0";
    formData.otherModifierDescription ??= localize("RQG.Dialog.Common.OtherModifier");
    formData.actorUuid ??= this.actor.uuid ?? "";
    formData.tokenUuid ??= this.token?.uuid ?? "";
    formData.characteristicName ??= this.characteristicName;
    formData.characteristicValue ??=
      this.actor.system.characteristics[this.characteristicName]?.value ?? 0;

    const speaker = getSpeakerCompat({ actor: this.actor, token: this.token });
    this.prepared = this.prepareRoll(formData);

    return {
      formData: formData,

      speakerName: getSpeakerDisplayName(speaker),
      augmentOptions: augmentOptions,
      meditateOptions: meditateOptions,
      difficultyOptions: CharacteristicRollDialogV2.difficultyOptions,

      // RollHeader
      rollType: localize("RQG.Actor.Characteristics.Characteristic"),
      rollName: formData.characteristicName.capitalize(),
      baseChance: formData.characteristicValue.toString(),

      // RollFooter
      totalChance: this.computeTotalChance(formData),
      preparedRollHtml: preparedRollHtml(this.prepared),
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
      .object as CharacteristicRollDialogFormData;
    this.updatePreparedRoll(this.prepareRoll(formData));
    totalChanceElement.textContent = `${this.computeTotalChance(formData)}%`;
  }

  private static async onSubmit(
    event: SubmitEvent | Event,
    form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const formDataObject = formData.object as CharacteristicRollDialogFormData;

    const rollMode =
      getSelectedRollMode(
        form?.querySelector<HTMLButtonElement>(
          'button[data-action="rollMode"][aria-pressed="true"]',
        )?.dataset["rollMode"],
      ) ?? getDefaultRollMode();

    const actor = (await fromUuid(formDataObject.actorUuid)) as RqgActor | undefined;
    if (!actor || !formDataObject.characteristicName) {
      ui.notifications?.error("Could not find an actor or characteristicName to roll.");
      return;
    }

    const token = formDataObject.tokenUuid
      ? ((await fromUuid(formDataObject.tokenUuid)) as TokenDocument | undefined)
      : undefined;

    await actor.rollCharacteristic(formDataObject.characteristicName as keyof Characteristics, {
      skipDialog: true,
      token,
      difficulty: CharacteristicRollDialogV2.getDifficulty(formDataObject.difficulty),
      modifiers: CharacteristicRollDialogV2.formModifiers(formDataObject),
      rollMode: rollMode,
    });
  }

  private static getDifficulty(difficulty: number | string | undefined): number {
    const diff = Number(difficulty);
    const d = isNaN(diff) ? 5 : diff; // default to 5
    return d === 0 ? 0.5 : d; // half chance is represented by 0 in the select options
  }
}

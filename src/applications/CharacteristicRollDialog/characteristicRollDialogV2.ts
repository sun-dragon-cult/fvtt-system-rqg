import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import {
  CharacteristicRollDialogContext,
  CharacteristicRollDialogFormData,
} from "./CharacteristicRollDialogData.types";
import { getDomDataset, getGame, getTokenFromActor, localize, RqgError } from "../../system/util";
import type { RqgActor } from "../../actors/rqgActor";
import type { CharacteristicRollOptions } from "../../rolls/CharacteristicRoll/CharacteristicRoll.types";
import { CharacteristicRoll } from "../../rolls/CharacteristicRoll/CharacteristicRoll";
import { Characteristics } from "../../data-model/actor-data/characteristics";
import type { RollMode } from "../../chat/chatMessage.types";

// @ts-expect-error application v2
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CharacteristicRollDialogV2 extends HandlebarsApplicationMixin(ApplicationV2) {
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
  private rollMode: RollMode;

  constructor(options: { actor: RqgActor; characteristicName: keyof Characteristics }) {
    super(options);
    this.actor = options.actor;
    this.rollMode = getGame().settings.get("core", "rollMode");
  }

  static DEFAULT_OPTIONS = {
    id: `characteristic-{id}`,
    tag: "form",
    classes: [systemId, "form", "roll-dialog", "characteristic-roll-dialog"],
    form: {
      handler: CharacteristicRollDialogV2.onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    position: {
      width: "auto",
      height: "auto",
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

  static PARTS = {
    header: { template: templatePaths.rollHeader },
    form: { template: templatePaths.characteristicRollDialogV2, scrollable: [""] },
    footer: { template: templatePaths.rollFooter },
  };

  async _prepareContext(): Promise<CharacteristicRollDialogContext> {
    const formData: CharacteristicRollDialogFormData =
      // @ts-expect-error object
      (this.element && new foundry.applications.ux.FormDataExtended(this.element, {}).object) ?? {};

    formData.difficulty ??= 5;
    formData.augmentModifier ??= "0";
    formData.meditateModifier ??= "0";
    formData.otherModifier ??= "0";
    formData.otherModifierDescription ??= localize("RQG.Dialog.CharacteristicRoll.OtherModifier");
    formData.actorUuid ??= this.actor.uuid;
    // @ts-expect-error options
    formData.characteristicName ??= this.options.characteristicName;
    formData.characteristicValue ??=
      // @ts-expect-error options
      (this.actor.system.characteristics as any)[this.options.characteristicName]?.value ?? 0;

    const speaker = ChatMessage.getSpeaker({
      token: getTokenFromActor(this.actor),
      actor: this.actor,
    });

    return {
      formData: formData,

      speakerName: speaker.alias ?? "",
      augmentOptions: CharacteristicRollDialogV2.augmentOptions,
      meditateOptions: CharacteristicRollDialogV2.meditateOptions,
      difficultyOptions: CharacteristicRollDialogV2.difficultyOptions,

      // RollHeader
      rollType: localize("RQG.Actor.Characteristics.Characteristic"),
      rollName: formData.characteristicName,
      baseChance: formData.characteristicValue.toString(),

      // RollFooter
      totalChance:
        Math.ceil(
          Number(formData.characteristicValue) *
            CharacteristicRollDialogV2.getDifficulty(formData.difficulty),
        ) +
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
    const formDataObject: CharacteristicRollDialogFormData = formData.object;

    const rollMode =
      (form?.querySelector<HTMLButtonElement>('button[data-action="rollMode"][aria-pressed="true"]')
        ?.dataset.rollMode as RollMode) ?? getGame().settings.get("core", "rollMode");

    const actor = (await fromUuid(formDataObject.actorUuid)) as RqgActor | undefined;
    if (!actor || !formDataObject.characteristicName) {
      ui.notifications?.error("Could not find an actor or characteristicName to roll.");
      return;
    }

    const options: CharacteristicRollOptions = {
      characteristicValue: formDataObject.characteristicValue,
      characteristicName: formDataObject.characteristicName,
      difficulty: CharacteristicRollDialogV2.getDifficulty(formDataObject.difficulty),
      modifiers: [
        {
          value: Number(formDataObject.augmentModifier),
          description: localize("RQG.Roll.CharacteristicRoll.Augment"),
        },
        {
          value: Number(formDataObject.meditateModifier),
          description: localize("RQG.Roll.CharacteristicRoll.Meditate"),
        },
        {
          value: Number(formDataObject.otherModifier),
          description: formDataObject.otherModifierDescription,
        },
      ],
      speaker: ChatMessage.getSpeaker({
        token: getTokenFromActor(actor),
        actor: actor,
      }),
      rollMode: rollMode,
    };

    const roll = await CharacteristicRoll.rollAndShow(options);
    if (roll.successLevel == null) {
      throw new RqgError("Evaluated CharacteristicRoll didn't give successLevel");
    }
    await actor.checkExperience(formDataObject.characteristicName ?? "", roll.successLevel);
  }

  private static getDifficulty(difficulty: number | string | undefined): number {
    const diff = Number(difficulty);
    const d = isNaN(diff) ? 5 : diff; // default to 5
    return d === 0 ? 0.5 : d; // half chance is represented by 0 in the select options
  }
}

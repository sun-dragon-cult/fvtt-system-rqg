import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import {
  CharacteristicRollDialogHandlebarsData,
  CharacteristicRollDialogObjectData,
} from "./CharacteristicRollDialogData.types";
import { localize, RqgError } from "../../system/util";
import type { RqgActor } from "../../actors/rqgActor";
import { CharacteristicRollOptions } from "../../rolls/CharacteristicRoll/CharacteristicRoll.types";
import { CharacteristicRoll } from "../../rolls/CharacteristicRoll/CharacteristicRoll";

export class CharacteristicRollDialog extends FormApplication<
  FormApplication.Options,
  CharacteristicRollDialogHandlebarsData,
  CharacteristicRollDialogObjectData
> {
  private augmentOptions = {
    "0": "None",
    "50": "Critical Success +50%",
    "30": "Special Success +30% ",
    "20": "Success +20%",
    "-20": "Failure -20%",
    "-50": "Fumble -50%",
  };

  private meditateOptions = {
    "0": "None",
    "5": "1 MR +5%",
    "10": "2 MR +10% ",
    "15": "5 MR (1 min) +15%",
    "20": "25 MR (5 min) +20%",
    "25": "50 MR (1 min) +50%",
  };

  private difficultyOptions = {
    "0": localize("RQG.Game.RollDifficultyLevel.0") + " (/2)",
    "1": localize("RQG.Game.RollDifficultyLevel.1") + " (*1)",
    "2": localize("RQG.Game.RollDifficultyLevel.2") + " (*2)",
    "3": localize("RQG.Game.RollDifficultyLevel.3") + " (*3)",
    "4": localize("RQG.Game.RollDifficultyLevel.4") + " (*4)",
    "5": localize("RQG.Game.RollDifficultyLevel.5") + " (*5)",
    "6": localize("RQG.Game.RollDifficultyLevel.6") + " (*6)",
  };

  private actor: RqgActor;
  constructor(actor: RqgActor, options: CharacteristicRollOptions) {
    const formData: CharacteristicRollDialogObjectData = {
      difficulty: 5,
      augmentModifier: "0",
      meditateModifier: "0",
      otherModifier: "0",
      otherModifierDescription: localize("RQG.Dialog.CharacteristicRoll.OtherModifier"),
    };

    super(formData, options as any);
    this.actor = actor;
    this.object = formData;
  }

  static get defaultOptions(): FormApplication.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "form", "characteristic-roll-dialog"],
      popOut: true,
      template: templatePaths.characteristicRollDialog,
      width: 400,
      left: 35,
      top: 15,
      id: "characteristic-roll-dialog",
      title: "Characteristic Roll Dialog", // TODO translate
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
      resizable: true,
    });
  }

  async getData(): Promise<CharacteristicRollDialogHandlebarsData> {
    const o = this.options as unknown as CharacteristicRollOptions;
    const characteristicName = o.characteristicName ?? "";
    const characteristicValue =
      (this.actor.system.characteristics as any)[characteristicName]?.value ?? 0;
    return {
      characteristicValue: characteristicValue,
      characteristicName: o.characteristicName ?? null,
      object: this.object,
      options: this.options,
      title: this.title,
      augmentOptions: this.augmentOptions,
      meditateOptions: this.meditateOptions,
      difficultyOptions: this.difficultyOptions,
      totalChance:
        Number(characteristicValue) * Number(this.object.difficulty ?? 5) +
        Number(this.object.augmentModifier ?? 0) +
        Number(this.object.meditateModifier ?? 0) +
        Number(this.object.otherModifier ?? 0),
    };
  }

  activateListeners(html: JQuery): void {
    const o = this.options as unknown as CharacteristicRollOptions;
    // Do the roll to chat
    html[0]?.querySelectorAll<HTMLElement>("[data-characteristic-roll]").forEach((el) => {
      el.addEventListener("click", async () => {
        const options: CharacteristicRollOptions = {
          characteristicValue: o.characteristicValue,
          characteristicName: o.characteristicName,
          difficulty: this.object.difficulty,
          modifiers: [
            {
              value: Number(this.object.augmentModifier),
              description: localize("RQG.Roll.CharacteristicRoll.Augment"),
            },
            {
              value: Number(this.object.meditateModifier),
              description: localize("RQG.Roll.CharacteristicRoll.Meditate"),
            },
            {
              value: Number(this.object.otherModifier),
              description: this.object.otherModifierDescription,
            },
          ],
          speaker: ChatMessage.getSpeaker({
            actor: this.actor,
          }),
        };

        const roll = await CharacteristicRoll.rollAndShow(options);
        if (!roll.successLevel) {
          throw new RqgError("Evaluated CharacteristicRoll didn't give successLevel");
        }
        await this.actor.checkExperience(o.characteristicName ?? "", roll.successLevel);
      });
    });

    super.activateListeners(html);
  }

  async _updateObject(event: Event, formData: CharacteristicRollDialogObjectData): Promise<void> {
    this.object = formData;
    console.log("formdata:", formData);
    this.render(true);
  }
}

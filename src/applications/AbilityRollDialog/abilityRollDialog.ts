import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import {
  AbilityRollDialogHandlebarsData,
  AbilityRollDialogObjectData,
  PartialAbilityItem,
} from "./AbilityRollDialogData.types";
import { AbilityRoll } from "../../rolls/AbilityRoll/AbilityRoll";
import { AbilityRollOptions } from "../../rolls/AbilityRoll/AbilityRoll.types";
import { localize, RqgError } from "../../system/util";

export class AbilityRollDialog<T extends PartialAbilityItem> extends FormApplication<
  FormApplication.Options,
  AbilityRollDialogHandlebarsData,
  AbilityRollDialogObjectData
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

  private abilityItem: T;
  constructor(abilityItem: T, options: Omit<AbilityRollOptions, "naturalSkill"> = {}) {
    const formData: AbilityRollDialogObjectData = {
      augmentModifier: "0",
      meditateModifier: "0",
      otherModifier: "0",
      otherModifierDescription: localize("RQG.Dialog.AbilityRoll.OtherModifier"),
    };

    super(formData, options as any);
    this.abilityItem = abilityItem;
    this.object = formData;
  }

  static get defaultOptions(): FormApplication.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "form", "ability-roll-dialog"],
      popOut: true,
      template: templatePaths.abilityRoll,
      width: 400,
      left: 35,
      top: 15,
      id: "ability-roll-dialog",
      title: "Ability Roll Dialog",
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
      resizable: true,
    });
  }

  async getData(): Promise<AbilityRollDialogHandlebarsData> {
    return {
      abilityName: this.abilityItem.name,
      abilityChance: this.abilityItem.system.chance,
      abilityType: this.abilityItem.type,
      abilityImg: this.abilityItem.img,
      object: this.object,
      options: this.options,
      title: this.title,
      augmentOptions: this.augmentOptions,
      meditateOptions: this.meditateOptions,
      totalChance:
        Number(this.abilityItem.system.chance ?? 0) +
        Number(this.object.augmentModifier ?? 0) +
        Number(this.object.meditateModifier ?? 0) +
        Number(this.object.otherModifier ?? 0),
    };
  }

  activateListeners(html: JQuery): void {
    // Do the roll to chat
    html[0]?.querySelectorAll<HTMLElement>("[data-ability-roll]").forEach((el) => {
      el.addEventListener("click", async () => {
        const options: AbilityRollOptions = {
          naturalSkill: this.abilityItem.system.chance,
          modifiers: [
            {
              value: Number(this.object.augmentModifier),
              description: localize("RQG.Roll.AbilityRoll.Augment"),
            },
            {
              value: Number(this.object.meditateModifier),
              description: localize("RQG.Roll.AbilityRoll.Meditate"),
            },
            {
              value: Number(this.object.otherModifier),
              description: this.object.otherModifierDescription,
            },
          ],
          abilityName: this.abilityItem.name ?? undefined,
          abilityType: this.abilityItem.type ?? undefined,
          abilityImg: this.abilityItem.img ?? undefined,
          // resultMessages?: Map<AbilitySuccessLevelEnum | undefined, string>; // TODO Idea - add fields in IAbility to specify text specific for an ability
        };

        const roll = new AbilityRoll(options);
        await roll.evaluate();
        await roll.toMessage({
          flavor: roll.flavor,
        });
        if (!roll.successLevel) {
          throw new RqgError("Evaluated AbilityRoll didn't give successLevel");
        }
        await this.abilityItem.checkExperience?.(roll.successLevel);
      });
    });

    super.activateListeners(html);
  }

  async _updateObject(event: Event, formData: AbilityRollDialogObjectData): Promise<void> {
    this.object = formData;
    console.log("formdata:", formData);
    this.render(true);
  }
}

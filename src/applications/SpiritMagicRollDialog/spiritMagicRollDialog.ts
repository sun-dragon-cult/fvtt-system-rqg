import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import {
  SpiritMagicRollDialogHandlebarsData,
  SpiritMagicRollDialogObjectData,
} from "./SpiritMagicRollDialogData.types";
import { assertItemType, localize } from "../../system/util";
import type { RqgActor } from "../../actors/rqgActor";
import type { SpiritMagicRollOptions } from "../../rolls/SpiritMagicRoll/SpiritMagicRoll.types";
import type { RqgItem } from "../../items/rqgItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export class SpiritMagicRollDialog extends FormApplication<
  FormApplication.Options,
  SpiritMagicRollDialogHandlebarsData,
  SpiritMagicRollDialogObjectData
> {
  private augmentOptions = {
    "0": "RQG.Dialog.Common.AugmentOptions.None",
    "50": "RQG.Dialog.Common.AugmentOptions.CriticalSuccess",
    "30": "RQG.Dialog.Common.AugmentOptions.SpecialSuccess",
    "20": "RQG.Dialog.Common.AugmentOptions.Success",
    "-20": "RQG.Dialog.Common.AugmentOptions.Failure",
    "-50": "RQG.Dialog.Common.AugmentOptions.Fumble",
  };

  private meditateOptions = {
    "0": "RQG.Dialog.Common.MeditateOptions.None",
    "5": "RQG.Dialog.Common.MeditateOptions.1mr",
    "10": "RQG.Dialog.Common.MeditateOptions.2mr",
    "15": "RQG.Dialog.Common.MeditateOptions.5mr",
    "20": "RQG.Dialog.Common.MeditateOptions.25mr",
    "25": "RQG.Dialog.Common.MeditateOptions.50mr",
  };

  private spellItem: RqgItem;
  private powX5: number;

  constructor(
    spiritMagicSpellItem: RqgItem,
    options: Omit<SpiritMagicRollOptions, "powX5" | "levelUsed"> = {},
  ) {
    const formData: SpiritMagicRollDialogObjectData = {
      levelUsed: spiritMagicSpellItem.system.points,
      boost: 0,
      augmentModifier: "0",
      meditateModifier: "0",
      otherModifier: "0",
      otherModifierDescription: localize("RQG.Dialog.SpiritMagicRoll.OtherModifier"),
    };

    super(formData, options as any);
    this.spellItem = spiritMagicSpellItem;
    this.powX5 = (this.spellItem.parent?.system?.characteristics?.power?.value ?? 0) * 5;
    this.object = formData;
  }

  static get defaultOptions(): FormApplication.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "form", "spirit-magic-roll-dialog"],
      popOut: true,
      template: templatePaths.spiritMagicRollDialog,
      width: 400,
      left: 35,
      top: 15,
      id: "spirit-magic-roll-dialog",
      title: "Spirit Magic Spell Roll Dialog", // TODO translate
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
      resizable: true,
    });
  }

  async getData(): Promise<SpiritMagicRollDialogHandlebarsData> {
    return {
      spellName: this.spellItem.name,
      powX5: this.powX5,
      spellImg: this.spellItem.img,
      object: this.object,
      options: this.options,
      title: this.title,
      augmentOptions: this.augmentOptions,
      meditateOptions: this.meditateOptions,
      totalChance:
        Number(this.powX5 ?? 0) +
        Number(this.object.augmentModifier ?? 0) +
        Number(this.object.meditateModifier ?? 0) +
        Number(this.object.otherModifier ?? 0),
    };
  }

  activateListeners(html: JQuery): void {
    // Do the roll to chat
    html[0]?.querySelectorAll<HTMLElement>("[data-spirit-magic-roll]").forEach((el) => {
      el.addEventListener("click", async () => {
        const options: SpiritMagicRollOptions = {
          powX5: this.powX5,
          levelUsed: this.object.levelUsed,
          magicPointBoost: this.object.boost,
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
          spellName: this.spellItem.name ?? undefined,
          spellImg: this.spellItem.img ?? undefined,
          speaker: ChatMessage.getSpeaker({
            actor: this.spellItem.parent as RqgActor | undefined,
          }),
        };
        const validationError = this.validateRollData();
        if (validationError) {
          ui.notifications?.warn(validationError);
          return;
        }

        await this.spellItem.spiritMagicRoll(true, options);
      });
    });

    super.activateListeners(html);
  }

  async _updateObject(event: Event, formData: SpiritMagicRollDialogObjectData): Promise<void> {
    this.object = formData;
    console.log("formdata:", formData);
    this.render(true);
  }

  public validateRollData(): string | undefined {
    assertItemType(this.spellItem.type, ItemTypeEnum.SpiritMagic);
    if (this.object.levelUsed == null || this.object.levelUsed > this.spellItem.system.points) {
      return localize("RQG.Dialog.SpiritMagicRoll.CantCastSpellAboveLearnedLevel");
    } else if (
      this.object.boost == null ||
      this.object.levelUsed + this.object.boost >
        (this.spellItem.actor?.system.attributes.magicPoints.value || 0)
    ) {
      return localize("RQG.Dialog.SpiritMagicRoll.NotEnoughMagicPoints");
    } else {
      return;
    }
  }
}

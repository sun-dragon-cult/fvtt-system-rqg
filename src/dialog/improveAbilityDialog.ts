import { Rune } from "../actors/item-specific/rune";
import { RqgActor } from "../actors/rqgActor";
import { Characteristic } from "../data-model/actor-data/characteristics";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { RuneDataProperties } from "../data-model/item-data/runeData";
import { Ability, IAbility } from "../data-model/shared/ability";
import { RqgItem } from "../items/rqgItem";
import { assertItemType, getGame } from "../system/util";

export class ImproveAbilityDialog {
  //**Shows a dialog for improving a Passion, Rune, or Skill */
  static async showImproveAbilityDialog(
    actor: RqgActor,
    itemId: string,
    item: Item,
    speakerName: string
  ): Promise<void> {
    ui.notifications?.info("HEYO! " + actor.name);
    console.log("showImproveAbilityDialog");
    console.log(actor);
    console.log(itemId);
    console.log(speakerName);
    console.log(item);

    console.log(item.type);

    const ability = item.data.data as IAbility;
    console.log(ability.hasExperience);

    const adapter: any = {
      showExperience: ability.hasExperience,
      showTraining: true,
      img: item.img,
      chance: ability.chance || 0,
      chanceToGain: 100 - Number(ability.chance) || 0,
      experienceGainFixed: 3,
      experienceGainRandom: "1d6",
      trainingGainFixed: 2,
      trainingGainRandom: "1d6-1",
    };

    if (item.type === "passion") {
      adapter.isPassion = true;
      // Cannot train passions
      adapter.showTraining = false;
      adapter.typeLocName = getGame().i18n.localize("ITEM.TypePassion");
      assertItemType(item?.data.type, ItemTypeEnum.Passion);
      adapter.name = item.data.data.passion;
    }
    if (item.type === "rune") {
      adapter.isRune = true;
      adapter.typeLocName = getGame().i18n.localize("ITEM.TypeRune");
      assertItemType(item?.data.type, ItemTypeEnum.Rune);
      adapter.name = item.data.data.rune;
    }
    if (item.type === "skill") {
      adapter.isSkill = true;
      assertItemType(item?.data.type, ItemTypeEnum.Skill);
      adapter.name = item.data.data.skillName;
      adapter.categoryMod = item.data.data.categoryMod;
      if (item.data.data.chance > 75) {
        //Cannot train skills over 75%
        adapter.showTraining = false;
        adapter.skillOver75 = true;
      }
      adapter.typeLocName = getGame().i18n.localize("ITEM.TypeSkill");
    }

    const btnImprove = getGame().i18n.format("DIALOG.improveAbilityDialog.btnDoImprovement");
    const btnCancel = getGame().i18n.format("DIALOG.improveAbilityDialog.btnCancel");
    const buttons: any = {};
    if (adapter.showExperience || adapter.showTraining) {
      // There's at least one thing to do so show the Submit button
      buttons.submit = {
        icon: '<i class="fas fa-check"></i>',
        label: btnImprove,
        callback: async (html: JQuery | HTMLElement) =>
          await ImproveAbilityDialog.submitImproveAbilityDialog(
            html as JQuery,
            actor,
            item,
            speakerName
          ),
      };
    }
    buttons.cancel = {
      icon: '<i class="fas fa-times"></i>',
      label: btnCancel,
      callback: () => null,
    };

    const content: string = await renderTemplate(
      "systems/rqg/dialog/improveAbilityDialog.hbs",
      { adapter: adapter }
    );
    const title = getGame().i18n.format("DIALOG.improveAbilityDialog.title", { name: adapter.name, typeLocName: adapter.typeLocName });
    
    console.log(adapter);

    new Dialog(
        {
          title: title,
          content: content,
          default: "submit",
          buttons: buttons,
        },
        {
          classes: ["rqg", "dialog"],
        }
      ).render(true);

  }

  //**Shows a dialog for improving a Characteristic */
  static async showImproveCharacteristicDialog(
    actor: RqgActor,
    itemId: string,
    item: Item,
    speakerName: string
  ): Promise<void> {
    ui.notifications?.info("HEYO! " + actor.name);
    console.log("showImproveCharacteristicDialog");
  }

  private static async submitImproveAbilityDialog(
    html: JQuery,
    actor: RqgActor,
    item: RqgItem,
    speakerName: string
  ): Promise<void> {
    console.log("submitImproveAbilityDialog");
  }
}

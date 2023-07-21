import { RqgActor } from "../actors/rqgActor";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { IAbility } from "../data-model/shared/ability";
import { RqgItem } from "../items/rqgItem";
import { systemId } from "../system/config";
import {
  assertItemType,
  convertFormValueToString,
  localize,
  localizeItemType,
} from "../system/util";

//**Shows a dialog for improving a Passion, Rune, or Skill */
export async function showImproveAbilityDialog(
  actor: RqgActor,
  itemId: string,
  item: RqgItem,
  speakerName: string,
): Promise<void> {
  const ability = item.system as IAbility;

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

  if (item.type === ItemTypeEnum.Passion) {
    adapter.isPassion = true;
    // Cannot train passions
    adapter.showTraining = false;
    adapter.typeLocName = localizeItemType(item.type);
    assertItemType(item?.type, ItemTypeEnum.Passion);
    if (item.system.subject) {
      adapter.name = `${item.system.passion} (${item.system.subject})`;
    } else {
      adapter.name = item.system.passion;
    }
  }
  if (item.type === ItemTypeEnum.Rune) {
    adapter.isRune = true;
    adapter.typeLocName = localizeItemType(item.type);
    assertItemType(item?.type, ItemTypeEnum.Rune);
    adapter.name = item.system.rune;
  }
  if (item.type === ItemTypeEnum.Skill) {
    adapter.isSkill = true;
    assertItemType(item?.type, ItemTypeEnum.Skill);
    if (item.system.specialization) {
      adapter.name = `${item.system.skillName} (${item.system.specialization})`;
    } else {
      adapter.name = item.system.skillName;
    }
    adapter.categoryMod = item.system.categoryMod;
    if (item.system.chance > 75) {
      //Cannot train skills over 75%
      adapter.showTraining = false;
      adapter.skillOver75 = true;
    }
    adapter.typeLocName = localizeItemType(ItemTypeEnum.Skill);
  }

  const btnImprove = localize("RQG.Dialog.improveAbilityDialog.btnDoImprovement");
  const btnCancel = localize("RQG.Dialog.improveAbilityDialog.btnCancel");
  const buttons: any = {};
  if (adapter.showExperience || adapter.showTraining) {
    // There's at least one thing to do so show the Submit button
    buttons.submit = {
      icon: '<i class="fas fa-check"></i>',
      label: btnImprove,
      callback: async (html: JQuery | HTMLElement) =>
        await submitImproveAbilityDialog(html as JQuery, actor, item, speakerName, adapter),
    };
  }
  buttons.cancel = {
    icon: '<i class="fas fa-times"></i>',
    label: btnCancel,
    callback: () => null,
  };

  const content: string = await renderTemplate(
    "systems/rqg/applications/improveAbilityDialog.hbs",
    {
      adapter: adapter,
    },
  );
  const title = localize("RQG.Dialog.improveAbilityDialog.title", {
    name: adapter.name,
    typeLocName: adapter.typeLocName,
  });

  new Dialog(
    {
      title: title,
      content: content,
      default: "submit",
      buttons: buttons,
    },
    {
      classes: [systemId, "dialog"],
    },
  ).render(true);
}

export async function submitImproveAbilityDialog(
  html: JQuery,
  actor: RqgActor,
  item: RqgItem,
  speakerName: string,
  adapter: any,
): Promise<void> {
  if (adapter.isPassion) {
    assertItemType(item?.type, ItemTypeEnum.Passion);
  } else if (adapter.isRune) {
    assertItemType(item?.type, ItemTypeEnum.Rune);
  } else if (adapter.isSkill) {
    assertItemType(item?.type, ItemTypeEnum.Skill);
  } else {
    ui.notifications?.error(
      "Call to submitImproveAbilityDialog with item that was not a Passion, Rune, or Skill",
    );
    return;
  }

  const abilityData = item.system;

  const formData = new FormData(html.find("form")[0]);
  const gaintype = convertFormValueToString(formData.get("experiencegaintype"));
  let gain: number = 0;

  if (gaintype === "experience-gain-fixed" || gaintype === "experience-gain-random") {
    if (abilityData.hasExperience) {
      const categoryMod: number = adapter.categoryMod || 0;
      const rollFlavor = localize("RQG.Dialog.improveAbilityDialog.experienceRoll.flavor", {
        actorName: actor.name,
        name: adapter.name,
        typeLocName: adapter.typeLocName,
      });
      let rollContent;
      if (adapter.isSkill) {
        rollContent = localize("RQG.Dialog.improveAbilityDialog.experienceRoll.contentSkill", {
          mod: categoryMod,
          skillChance: abilityData.chance,
          name: adapter.name,
          typeLocName: adapter.typeLocName,
        });
      } else {
        rollContent = localize("RQG.Dialog.improveAbilityDialog.experienceRoll.contentOther", {
          chance: abilityData.chance,
          name: adapter.name,
          typeLocName: adapter.typeLocName,
        });
      }

      // roll 1d100 and add the category mod
      let diceExpr = "1d100";
      if (adapter.isSkill) {
        diceExpr += "+" + categoryMod;
      }
      const expRoll = new Roll(diceExpr);
      await expRoll.toMessage({
        speaker: { alias: speakerName },
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        flavor: `<h3>${rollFlavor}</h3><p>${rollContent}</p>`,
      });

      // Gain if the modified d100 roll is greater than (but not equal to) the skill chance, or if the roll is greater than or equal to 100
      if (
        expRoll.total !== undefined &&
        (expRoll.total > Number(abilityData.chance) || expRoll.total >= 100)
      ) {
        // increase ability gainedChance, clear experience check
        const resultFlavor = localize(
          "RQG.Dialog.improveAbilityDialog.experienceResultChat.flavor",
          { name: adapter.name, typeLocName: adapter.typeLocName },
        );
        if (gaintype === "experience-gain-fixed") {
          const resultContentChoseFixed = localize(
            "RQG.Dialog.improveAbilityDialog.experienceResultChat.contentChoseFixed",
            { gain: adapter.experienceGainFixed + "%" },
          );
          const gainRoll = new Roll(String(adapter.experienceGainFixed));
          await gainRoll.toMessage({
            speaker: { alias: speakerName },
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            flavor: `<h3>${resultFlavor}</h3><p>${resultContentChoseFixed}</p>`,
          });
          gain = adapter.experienceGainFixed;
        }
        if (gaintype === "experience-gain-random") {
          const resultContentChoseRandom = localize(
            "RQG.Dialog.improveAbilityDialog.experienceResultChat.contentChoseRandom",
            { gain: adapter.experienceGainRandom + "%" },
          );
          const gainRoll = new Roll(adapter.experienceGainRandom);
          await gainRoll.toMessage({
            speaker: { alias: speakerName },
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            flavor: `<h3>${resultFlavor}</h3><p>${resultContentChoseRandom}</p>`,
          });
          gain = Number(gainRoll.total) || 0;
        }
      } else {
        // no increase, clear experience check
        gain = 0;
        const failedFlavor = localize(
          "RQG.Dialog.improveAbilityDialog.experienceGainFailed.flavor",
          { name: adapter.name, typeLocName: adapter.typeLocName },
        );
        const failedContent = localize(
          "RQG.Dialog.improveAbilityDialog.experienceGainFailed.content",
          { actorName: actor.name, name: adapter.name, typeLocName: adapter.typeLocName },
        );
        const failChat = {
          type: CONST.CHAT_MESSAGE_TYPES.OTHER,
          flavor: failedFlavor,
          content: failedContent,
          speaker: { alias: speakerName },
        };
        await ChatMessage.create(failChat);
      }
    } else {
      const msg = localize("RQG.Dialog.improveAbilityDialog.notifications.noExperience", {
        actorName: actor.name,
        name: adapter.name,
        typeLocName: adapter.typeLocName,
      });
      ui.notifications?.error(msg);
    }
  }
  if (gaintype === "training-gain-fixed") {
    const flavor = localize("RQG.Dialog.improveAbilityDialog.trainingResultChat.flavor", {
      name: adapter.name,
      typeLocName: adapter.typeLocName,
    });
    const content = localize(
      "RQG.Dialog.improveAbilityDialog.trainingResultChat.contentChoseFixed",
      { gain: adapter.trainingGainFixed + "%" },
    );
    const roll = new Roll(String(adapter.trainingGainFixed));
    await roll.toMessage({
      speaker: { alias: speakerName },
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      flavor: `<h3>${flavor}</h3><p>${content}</p>`,
    });
    gain = adapter.trainingGainFixed;
  }
  if (gaintype === "training-gain-random") {
    const flavor = localize("RQG.Dialog.improveAbilityDialog.trainingResultChat.flavor", {
      name: adapter.name,
      typeLocName: adapter.typeLocName,
    });
    const content = localize(
      "RQG.Dialog.improveAbilityDialog.trainingResultChat.contentChoseRandom",
      { gain: adapter.trainingGainRandom + "%" },
    );
    const gainRoll = new Roll(adapter.trainingGainRandom);
    await gainRoll.toMessage({
      speaker: { alias: speakerName },
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      flavor: `<h3>${flavor}</h3><p>${content}</p>`,
    });
    gain = Number(gainRoll.total) || 0;
  }
  if (adapter.isSkill) {
    const newGainedChance: number = Number(abilityData.gainedChance) + gain;
    await actor.updateEmbeddedDocuments("Item", [
      { _id: item.id, system: { hasExperience: false, gainedChance: newGainedChance } },
    ]);
  } else {
    const newChance: number = Number(abilityData.chance) + gain;
    await actor.updateEmbeddedDocuments("Item", [
      { _id: item.id, system: { hasExperience: false, chance: newChance } },
    ]);
    if (adapter.isRune) {
      assertItemType(item?.type, ItemTypeEnum.Rune);
      await actor.updateEmbeddedDocuments("Item", [
        { _id: item.id, system: { hasExperience: false, chance: newChance } },
      ]);
    }
  }
}

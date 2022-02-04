import { RqgActor } from "../actors/rqgActor";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { IAbility } from "../data-model/shared/ability";
import { RqgItem } from "../items/rqgItem";
import { assertItemType, getGame } from "../system/util";

//**Shows a dialog for improving a Passion, Rune, or Skill */
export async function showImproveAbilityDialog(
  actor: RqgActor,
  itemId: string,
  item: RqgItem,
  speakerName: string
): Promise<void> {
  const ability = item.data.data as IAbility;

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

  if (item.data.type === ItemTypeEnum.Passion) {
    adapter.isPassion = true;
    // Cannot train passions
    adapter.showTraining = false;
    adapter.typeLocName = getGame().i18n.localize("ITEM.TypePassion");
    assertItemType(item?.data.type, ItemTypeEnum.Passion);
    if (item.data.data.subject) {
      adapter.name = `${item.data.data.passion} (${item.data.data.subject})`;
    } else {
      adapter.name = item.data.data.passion;
    }
  }
  if (item.data.type === ItemTypeEnum.Rune) {
    adapter.isRune = true;
    adapter.typeLocName = getGame().i18n.localize("ITEM.TypeRune");
    assertItemType(item?.data.type, ItemTypeEnum.Rune);
    adapter.name = item.data.data.rune;
  }
  if (item.data.type === ItemTypeEnum.Skill) {
    adapter.isSkill = true;
    assertItemType(item?.data.type, ItemTypeEnum.Skill);
    if (item.data.data.specialization) {
      adapter.name = `${item.data.data.skillName} (${item.data.data.specialization})`;
    } else {
      adapter.name = item.data.data.skillName;
    }
    adapter.categoryMod = item.data.data.categoryMod;
    if (item.data.data.chance > 75) {
      //Cannot train skills over 75%
      adapter.showTraining = false;
      adapter.skillOver75 = true;
    }
    adapter.typeLocName = getGame().i18n.localize("ITEM.TypeSkill");
  }

  const btnImprove = getGame().i18n.format("RQG.Dialog.improveAbilityDialog.btnDoImprovement");
  const btnCancel = getGame().i18n.format("RQG.Dialog.improveAbilityDialog.btnCancel");
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

  const content: string = await renderTemplate("systems/rqg/dialog/improveAbilityDialog.hbs", {
    adapter: adapter,
  });
  const title = getGame().i18n.format("RQG.Dialog.improveAbilityDialog.title", {
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
      classes: ["rqg", "dialog"],
    }
  ).render(true);
}

export async function submitImproveAbilityDialog(
  html: JQuery,
  actor: RqgActor,
  item: RqgItem,
  speakerName: string,
  adapter: any
): Promise<void> {
  if (adapter.isPassion) {
    assertItemType(item?.data.type, ItemTypeEnum.Passion);
  } else if (adapter.isRune) {
    assertItemType(item?.data.type, ItemTypeEnum.Rune);
  } else if (adapter.isSkill) {
    assertItemType(item?.data.type, ItemTypeEnum.Skill);
  } else {
    ui.notifications?.error(
      "Call to submitImproveAbilityDialog with item that was not a Passion, Rune, or Skill"
    );
    return;
  }

  const abilityData = item.data.data;

  const formData = new FormData(html.find("form")[0]);
  // @ts-ignore entries
  const data = Object.fromEntries(formData.entries());
  const gaintype: string = data.experiencegaintype;
  let gain: number = 0;

  if (gaintype === "experience-gain-fixed" || gaintype === "experience-gain-random") {
    if (abilityData.hasExperience) {
      let categoryMod: number = adapter.categoryMod || 0;
      const rollFlavor = getGame().i18n.format(
        "RQG.Dialog.improveAbilityDialog.experienceRoll.flavor",
        { actorName: actor.name, name: adapter.name, typeLocName: adapter.typeLocName }
      );
      let rollContent = "";
      if (adapter.isSkill) {
        rollContent = getGame().i18n.format(
          "RQG.Dialog.improveAbilityDialog.experienceRoll.contentSkill",
          {
            mod: categoryMod,
            skillChance: abilityData.chance,
            name: adapter.name,
            typeLocName: adapter.typeLocName,
          }
        );
      } else {
        rollContent = getGame().i18n.format(
          "RQG.Dialog.improveAbilityDialog.experienceRoll.contentOther",
          { chance: abilityData.chance, name: adapter.name, typeLocName: adapter.typeLocName }
        );
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
        // increase ability learnedChance, clear experience check
        const resultFlavor = getGame().i18n.format(
          "RQG.Dialog.improveAbilityDialog.experienceResultCard.flavor",
          { name: adapter.name, typeLocName: adapter.typeLocName }
        );
        if (gaintype === "experience-gain-fixed") {
          const resultContentChoseFixed = getGame().i18n.format(
            "RQG.Dialog.improveAbilityDialog.experienceResultCard.contentChoseFixed",
            { gain: adapter.experienceGainFixed + "%" }
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
          const resultContentChoseRandom = getGame().i18n.format(
            "RQG.Dialog.improveAbilityDialog.experienceResultCard.contentChoseRandom",
            { gain: adapter.experienceGainRandom + "%" }
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
        const failedFlavor = getGame().i18n.format(
          "RQG.Dialog.improveAbilityDialog.experienceGainFailed.flavor",
          { name: adapter.name, typeLocName: adapter.typeLocName }
        );
        const failedContent = getGame().i18n.format(
          "RQG.Dialog.improveAbilityDialog.experienceGainFailed.content",
          { actorName: actor.name, name: adapter.name, typeLocName: adapter.typeLocName }
        );
        const failChat = {
          type: CONST.CHAT_MESSAGE_TYPES.OTHER,
          flavor: failedFlavor,
          content: failedContent,
          speaker: { alias: speakerName },
        };
        ChatMessage.create(failChat);
      }
    } else {
      const msg = getGame().i18n.format("RQG.Dialog.improveAbilityDialog.notifications.noExperience", {
        actorName: actor.name,
        name: adapter.name,
        typeLocName: adapter.typeLocName,
      });
      ui.notifications?.error(msg);
    }
  }
  if (gaintype === "training-gain-fixed") {
    const flavor = getGame().i18n.format("RQG.Dialog.improveAbilityDialog.trainingResultCard.flavor", {
      name: adapter.name,
      typeLocName: adapter.typeLocName,
    });
    const content = getGame().i18n.format(
      "RQG.Dialog.improveAbilityDialog.trainingResultCard.contentChoseFixed",
      { gain: adapter.trainingGainFixed + "%" }
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
    const flavor = getGame().i18n.format("RQG.Dialog.improveAbilityDialog.trainingResultCard.flavor", {
      name: adapter.name,
      typeLocName: adapter.typeLocName,
    });
    const content = getGame().i18n.format(
      "RQG.Dialog.improveAbilityDialog.trainingResultCard.contentChoseRandom",
      { gain: adapter.trainingGainRandom + "%" }
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
    //@ts-ignore abilityData.learnedChance
    let newLearnedChance: number = Number(abilityData.learnedChance) + gain;
    await actor.updateEmbeddedDocuments("Item", [
      { _id: item.id, data: { hasExperience: false, learnedChance: newLearnedChance } },
    ]);
  } else {
    let newChance: number = Number(abilityData.chance) + gain;
    await actor.updateEmbeddedDocuments("Item", [
      { _id: item.id, data: { hasExperience: false, chance: newChance } },
    ]);
    if (adapter.isRune) {
      assertItemType(item?.data.type, ItemTypeEnum.Rune);
      const opposingRuneName = item.data.data.opposingRune;
      const opposingRune = actor.items.filter(
        (r) => r.data.type === ItemTypeEnum.Rune && r.name === opposingRuneName
      );
      if (opposingRune && opposingRune.length === 1) {
        const opposingRuneChance = 100 - newChance;
        await actor.updateEmbeddedDocuments("Item", [
          { _id: opposingRune[0].id, data: { hasExperience: false, chance: opposingRuneChance } },
        ]);
      }
    }
  }
}

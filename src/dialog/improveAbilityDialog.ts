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

    if (item.type === "passion") {
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
    if (item.type === "rune") {
      adapter.isRune = true;
      adapter.typeLocName = getGame().i18n.localize("ITEM.TypeRune");
      assertItemType(item?.data.type, ItemTypeEnum.Rune);
      adapter.name = item.data.data.rune;
    }
    if (item.type === "skill") {
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
            speakerName,
            adapter
          ),
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
    const title = getGame().i18n.format("DIALOG.improveAbilityDialog.title", {
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

  private static async submitImproveAbilityDialog(
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
          "DIALOG.improveAbilityDialog.experienceRoll.flavor",
          { actorName: actor.name, name: adapter.name, typeLocName: adapter.typeLocName }
        );
        let rollContent = "";
        if (adapter.isSkill) {
          rollContent = getGame().i18n.format(
            "DIALOG.improveAbilityDialog.experienceRoll.contentSkill",
            {
              mod: categoryMod,
              skillChance: abilityData.chance,
              name: adapter.name,
              typeLocName: adapter.typeLocName,
            }
          );
        } else {
          rollContent = getGame().i18n.format(
            "DIALOG.improveAbilityDialog.experienceRoll.contentOther",
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
            "DIALOG.improveAbilityDialog.experienceResultCard.flavor",
            { name: adapter.name, typeLocName: adapter.typeLocName }
          );
          if (gaintype === "experience-gain-fixed") {
            const resultContentChoseFixed = getGame().i18n.format(
              "DIALOG.improveAbilityDialog.experienceResultCard.contentChoseFixed",
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
              "DIALOG.improveAbilityDialog.experienceResultCard.contentChoseRandom",
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
            "DIALOG.improveAbilityDialog.experienceGainFailed.flavor",
            { name: adapter.name, typeLocName: adapter.typeLocName }
          );
          const failedContent = getGame().i18n.format(
            "DIALOG.improveAbilityDialog.experienceGainFailed.content",
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
        const msg = getGame().i18n.format(
          "DIALOG.improveAbilityDialog.notifications.noExperience",
          {
            actorName: actor.name,
            name: adapter.name,
            typeLocName: adapter.typeLocName,
          }
        );
        ui.notifications?.error(msg);
      }
    }
    if (gaintype === "training-gain-fixed") {
      const flavor = getGame().i18n.format(
        "DIALOG.improveAbilityDialog.trainingResultCard.flavor",
        {
          name: adapter.name,
          typeLocName: adapter.typeLocName,
        }
      );
      const content = getGame().i18n.format(
        "DIALOG.improveAbilityDialog.trainingResultCard.contentChoseFixed",
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
      const flavor = getGame().i18n.format(
        "DIALOG.improveAbilityDialog.trainingResultCard.flavor",
        {
          name: adapter.name,
          typeLocName: adapter.typeLocName,
        }
      );
      const content = getGame().i18n.format(
        "DIALOG.improveAbilityDialog.trainingResultCard.contentChoseRandom",
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
          (r) => r.type === "rune" && r.name === opposingRuneName
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

  //**Shows a dialog for improving a Characteristic */
  static async showImproveCharacteristicDialog(
    actor: RqgActor,
    itemId: string,
    char: any,
    speakerName: string
  ): Promise<void> {
    const trainable = ["strength", "constitution", "dexterity", "power", "charisma"];
    const researchable = ["strength", "constitution", "dexterity", "charisma"];

    const rollmax = Roll.create(char.formula);
    const speciesRollableMax = (await rollmax.evaluate({ maximize: true, async: true })).total || 0;
    const rollmin = Roll.create(char.formula);
    const speciesRollableMin = (await rollmin.evaluate({ minimize: true, async: true })).total || 0;
    const speciesMax = speciesRollableMax + speciesRollableMin;

    const adapter: any = {
      showExperience: char.hasExperience,
      noExperienceGain: !!(char.name !== "power"),
      showTraining: !!trainable.includes(char.name),
      showResearch: !!researchable.includes(char.name),
      chance: char.value || 0,
      chanceToGain: (speciesMax - Number(char.value)) * 5 || 0,
      experienceGainFixed: 1,
      experienceGainRandom: "1d3-1",
      trainingGainFixed: false,
      trainingGainRandom: "1d3-1",
      researchGainRandom: "1d3-1",
      name: getGame().i18n.localize("RQG.characteristicfull." + char.name),
      typeLocName: itemId,
      forChar: true,
      speciesMax: speciesMax,
    };

    //TODO: in theory we should be limiting DEX to DEX x 1.5 or the species max, whichever is lower but we don't have a way to store starting DEX
    if (char.value >= speciesMax) {
      adapter.showExperience = false;
      adapter.showTraining = false;
      adapter.showResearch = false;
      adapter.atSpeciesMax = true;
    }

    const btnImprove = getGame().i18n.format("DIALOG.improveAbilityDialog.btnDoImprovement");
    const btnCancel = getGame().i18n.format("DIALOG.improveAbilityDialog.btnCancel");
    const buttons: any = {};
    if (adapter.showExperience || adapter.showTraining || adapter.showResearch) {
      // There's at least one thing to do so show the Submit button
      buttons.submit = {
        icon: '<i class="fas fa-check"></i>',
        label: btnImprove,
        callback: async (html: JQuery | HTMLElement) =>
          await ImproveAbilityDialog.submitImproveCharacteristicDialog(
            html as JQuery,
            actor,
            char,
            speakerName,
            adapter
          ),
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
    const title = getGame().i18n.format("DIALOG.improveAbilityDialog.titleChar", {
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

  private static async submitImproveCharacteristicDialog(
    html: JQuery,
    actor: RqgActor,
    char: any,
    speakerName: string,
    adapter: any
  ): Promise<void> {
    const formData = new FormData(html.find("form")[0]);
    // @ts-ignore entries
    const data = Object.fromEntries(formData.entries());
    const gaintype: string = data.experiencegaintype;
    let gain: number = 0;

    if (gaintype === "experience-gain-fixed" || gaintype === "experience-gain-random") {
      if (char.hasExperience) {
        const rollFlavor = getGame().i18n.format(
          "DIALOG.improveAbilityDialog.experienceRoll.flavor",
          { actorName: actor.name, name: adapter.name, typeLocName: adapter.typeLocName }
        );
        let rollContent = getGame().i18n.format(
          "DIALOG.improveAbilityDialog.experienceRoll.contentChar",
          {
            chance: adapter.chance,
            chanceToGain: adapter.chanceToGain,
            speciesMax: adapter.speciesMax,
            name: adapter.name,
            typeLocName: adapter.typeLocName,
          }
        );

        const expRoll = new Roll("1d100");
        await expRoll.toMessage({
          speaker: { alias: speakerName },
          type: CONST.CHAT_MESSAGE_TYPES.ROLL,
          flavor: `<h3>${rollFlavor}</h3><p>${rollContent}</p>`,
        });

        if (expRoll.total !== undefined && expRoll.total <= adapter.chanceToGain) {
          // Increase characteristic, clear experience check

          const resultFlavor = getGame().i18n.format(
            "DIALOG.improveAbilityDialog.experienceResultCard.flavor",
            { name: adapter.name, typeLocName: adapter.typeLocName }
          );
          if (gaintype === "experience-gain-fixed") {
            const resultContentChoseFixed = getGame().i18n.format(
              "DIALOG.improveAbilityDialog.experienceResultCard.contentChoseFixed",
              { gain: adapter.experienceGainFixed }
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
              "DIALOG.improveAbilityDialog.experienceResultCard.contentChoseRandom",
              { gain: adapter.experienceGainRandom }
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
            "DIALOG.improveAbilityDialog.experienceGainFailed.flavor",
            { name: adapter.name, typeLocName: adapter.typeLocName }
          );
          const failedContent = getGame().i18n.format(
            "DIALOG.improveAbilityDialog.experienceGainFailed.content",
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
        const msg = getGame().i18n.format(
          "DIALOG.improveAbilityDialog.notifications.noExperience",
          {
            actorName: actor.name,
            name: adapter.name,
            typeLocName: adapter.typeLocName,
          }
        );
        ui.notifications?.error(msg);
      }
    }
    if (gaintype === "training-gain-random") {
      const flavor = getGame().i18n.format(
        "DIALOG.improveAbilityDialog.trainingResultCard.flavor",
        {
          name: adapter.name,
          typeLocName: adapter.typeLocName,
        }
      );
      const content = getGame().i18n.format(
        "DIALOG.improveAbilityDialog.trainingResultCard.contentChoseRandom",
        { gain: adapter.trainingGainRandom }
      );
      const gainRoll = new Roll(adapter.trainingGainRandom);
      await gainRoll.toMessage({
        speaker: { alias: speakerName },
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        flavor: `<h3>${flavor}</h3><p>${content}</p>`,
      });
      gain = Number(gainRoll.total) || 0;
    }
    if (gaintype === "research-gain-random") {
      const rollFlavor = getGame().i18n.format("DIALOG.improveAbilityDialog.researchRoll.flavor", {
        actorName: actor.name,
        name: adapter.name,
        typeLocName: adapter.typeLocName,
      });
      let rollContent = getGame().i18n.format(
        "DIALOG.improveAbilityDialog.researchRoll.contentChar",
        {
          chance: adapter.chance,
          chanceToGain: adapter.chanceToGain,
          speciesMax: adapter.speciesMax,
          name: adapter.name,
          typeLocName: adapter.typeLocName,
        }
      );

      const expRoll = new Roll("1d100");
      await expRoll.toMessage({
        speaker: { alias: speakerName },
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        flavor: `<h3>${rollFlavor}</h3><p>${rollContent}</p>`,
      });

      if (expRoll.total !== undefined && expRoll.total <= adapter.chanceToGain) {
        const flavor = getGame().i18n.format(
          "DIALOG.improveAbilityDialog.researchResultCard.flavor",
          {
            name: adapter.name,
            typeLocName: adapter.typeLocName,
          }
        );
        const content = getGame().i18n.format(
          "DIALOG.improveAbilityDialog.researchResultCard.contentChoseRandom",
          { gain: adapter.trainingGainRandom }
        );
        const gainRoll = new Roll(adapter.researchGainRandom);
        await gainRoll.toMessage({
          speaker: { alias: speakerName },
          type: CONST.CHAT_MESSAGE_TYPES.ROLL,
          flavor: `<h3>${flavor}</h3><p>${content}</p>`,
        });
        gain = Number(gainRoll.total) || 0;
      } else {
        // no increase, clear experience check
        gain = 0;
        const failedFlavor = getGame().i18n.format(
          "DIALOG.improveAbilityDialog.researchGainFailed.flavor",
          { name: adapter.name, typeLocName: adapter.typeLocName }
        );
        const failedContent = getGame().i18n.format(
          "DIALOG.improveAbilityDialog.researchGainFailed.content",
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
    }

    //update
    const charUpdate: any = {
      data: { characteristics: { [char.name]: { value: char.value + gain } } },
    };

    if (char.hasExperience) {
      charUpdate.data.characteristics[char.name].hasExperience = false;
    }

    await actor.update(charUpdate);
  }
}

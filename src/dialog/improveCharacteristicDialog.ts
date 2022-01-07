import { RqgActor } from "../actors/rqgActor";
import { localize } from "../system/util";

//**Shows a dialog for improving a Characteristic */
export async function showImproveCharacteristicDialog(
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
      name: localize("RQG.Actor.Characteristics." + char.name + "-full"),
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
  
    const btnImprove = localize("RQG.Dialog.improveAbilityDialog.btnDoImprovement");
    const btnCancel = localize("RQG.Dialog.improveAbilityDialog.btnCancel");
    const buttons: any = {};
    if (adapter.showExperience || adapter.showTraining || adapter.showResearch) {
      // There's at least one thing to do so show the Submit button
      buttons.submit = {
        icon: '<i class="fas fa-check"></i>',
        label: btnImprove,
        callback: async (html: JQuery | HTMLElement) =>
          await submitImproveCharacteristicDialog(html as JQuery, actor, char, speakerName, adapter),
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
    const title = localize("RQG.Dialog.improveAbilityDialog.titleChar", {
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
  
  export async function submitImproveCharacteristicDialog(
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
        const rollFlavor = localize(
          "RQG.Dialog.improveAbilityDialog.experienceRoll.flavor",
          { actorName: actor.name, name: adapter.name, typeLocName: adapter.typeLocName }
        );
        let rollContent = localize(
          "RQG.Dialog.improveAbilityDialog.experienceRoll.contentChar",
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
  
          const resultFlavor = localize(
            "RQG.Dialog.improveAbilityDialog.experienceResultCard.flavor",
            { name: adapter.name, typeLocName: adapter.typeLocName }
          );
          if (gaintype === "experience-gain-fixed") {
            const resultContentChoseFixed = localize(
              "RQG.Dialog.improveAbilityDialog.experienceResultCard.contentChoseFixed",
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
            const resultContentChoseRandom = localize(
              "RQG.Dialog.improveAbilityDialog.experienceResultCard.contentChoseRandom",
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
          const failedFlavor = localize(
            "RQG.Dialog.improveAbilityDialog.experienceGainFailed.flavor",
            { name: adapter.name, typeLocName: adapter.typeLocName }
          );
          const failedContent = localize(
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
        const msg = localize("RQG.Dialog.improveAbilityDialog.notifications.noExperience", {
          actorName: actor.name,
          name: adapter.name,
          typeLocName: adapter.typeLocName,
        });
        ui.notifications?.error(msg);
      }
    }
    if (gaintype === "training-gain-random") {
      const flavor = localize("RQG.Dialog.improveAbilityDialog.trainingResultCard.flavor", {
        name: adapter.name,
        typeLocName: adapter.typeLocName,
      });
      const content = localize(
        "RQG.Dialog.improveAbilityDialog.trainingResultCard.contentChoseRandom",
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
      const rollFlavor = localize("RQG.Dialog.improveAbilityDialog.researchRoll.flavor", {
        actorName: actor.name,
        name: adapter.name,
        typeLocName: adapter.typeLocName,
      });
      let rollContent = localize(
        "RQG.Dialog.improveAbilityDialog.researchRoll.contentChar",
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
        const flavor = localize(
          "RQG.Dialog.improveAbilityDialog.researchResultCard.flavor",
          {
            name: adapter.name,
            typeLocName: adapter.typeLocName,
          }
        );
        const content = localize(
          "RQG.Dialog.improveAbilityDialog.researchResultCard.contentChoseRandom",
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
        const failedFlavor = localize(
          "RQG.Dialog.improveAbilityDialog.researchGainFailed.flavor",
          { name: adapter.name, typeLocName: adapter.typeLocName }
        );
        const failedContent = localize(
          "RQG.Dialog.improveAbilityDialog.researchGainFailed.content",
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
  
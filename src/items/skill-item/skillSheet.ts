import {
  SkillCategoryEnum,
  SkillDataProperties,
  SkillDataPropertiesData,
} from "../../data-model/item-data/skillData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgActorSheet } from "../../actors/rqgActorSheet";
import { RqgItemSheet } from "../RqgItemSheet";
import { assertItemType, getAllRunesIndex, getJournalEntryName, RqgError } from "../../system/util";
import { IndexTypeForMetadata } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/foundry.js/collections/documentCollections/compendiumCollection";
import { RqgItem } from "../rqgItem";
import { RqgActor } from "../../actors/rqgActor";
import { Ability, ResultEnum } from "../../data-model/shared/ability";
import { getGame } from "../../system/util";

interface SkillSheetData {
  isEmbedded: boolean;
  data: SkillDataProperties; // Actually contains more...complete with effects, flags etc
  skillData: SkillDataPropertiesData;
  sheetSpecific: {
    skillCategories: SkillCategoryEnum[];
    journalEntryName: string;
    allRunes: IndexTypeForMetadata<CompendiumCollection.Metadata>;
  };
}

export class SkillSheet extends RqgItemSheet<ItemSheet.Options, SkillSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Skill],
      template: "systems/rqg/items/skill-item/skillSheet.hbs",
      width: 505,
      height: 405,
    });
  }

  getData(): SkillSheetData | ItemSheet.Data {
    const itemData = this.document.data.toObject(false);
    assertItemType(itemData.type, ItemTypeEnum.Skill);
    const skillData = itemData.data;
    if (!skillData.skillName) {
      skillData.skillName = itemData.name;
    }
    skillData.runes = Array.isArray(skillData.runes) ? skillData.runes : [skillData.runes];

    return {
      cssClass: this.isEditable ? "editable" : "locked",
      editable: this.isEditable,
      limited: this.document.limited,
      owner: this.document.isOwner,
      isEmbedded: this.document.isEmbedded,
      options: this.options,
      data: itemData,
      skillData: itemData.data,
      sheetSpecific: {
        skillCategories: Object.values(SkillCategoryEnum),
        journalEntryName: getJournalEntryName(skillData),
        allRunes: getAllRunesIndex(),
      },
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<RqgItem | undefined> {
    const specialization = formData["data.specialization"]
      ? ` (${formData["data.specialization"]})`
      : "";
    formData["name"] =
      formData["data.skillName"] + specialization + " - " + formData["data.category"];

    let runes = formData["data.runes"];
    runes = Array.isArray(runes) ? runes : [runes];
    runes = runes.filter((r: any) => r); // Remove empty
    formData["data.runes"] = duplicate(runes);
    return super._updateObject(event, formData);
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);
    (this.form as HTMLElement).addEventListener("drop", this._onDrop.bind(this));

    // Open Linked Journal Entry
    (this.form as HTMLElement).querySelectorAll("[data-journal-id]").forEach((el: Element) => {
      const elem = el as HTMLElement;
      const pack = elem.dataset.journalPack;
      const id = elem.dataset.journalId;
      if (!id) {
        const msg = "couldn't find linked journal entry from Skill Item Sheet";
        ui.notifications?.error(msg);
        throw new RqgError(msg, elem, pack, id);
      }
      el.addEventListener("click", () => RqgActorSheet.showJournalEntry(id, pack));
    });
  }

  protected async _onDrop(event: DragEvent): Promise<void> {
    super._onDrop(event);
    // Try to extract the data
    let droppedItemData;
    try {
      droppedItemData = JSON.parse(event.dataTransfer!.getData("text/plain"));
    } catch (err) {
      return;
    }
    if (droppedItemData.type === "JournalEntry") {
      const pack = droppedItemData.pack ? droppedItemData.pack : "";
      await this.item.update(
        { "data.journalId": droppedItemData.id, "data.journalPack": pack },
        {}
      );
    } else {
      ui.notifications?.warn("You can only drop a journalEntry");
    }
  }

  static async showImproveSkillDialog(
    actor: RqgActor,
    skillItemId: string,
    speakerName: string
  ): Promise<void> {
    const item = actor.items.get(skillItemId);
    if (!item || item.data.type !== ItemTypeEnum.Skill) {
      const msg = `Couldn't find skill with itemId [${skillItemId}] on actor ${actor.name} to show Improve Skill dialog.`;
      ui.notifications?.error(msg);
      throw new RqgError(msg);
    }
    const skill = item.data as SkillDataProperties;

    if (item.data.data.chance > 75) {
      //@ts-ignore hideTraining
      item.data.data.hideTraining = true;
    }

    const chance: number = Number(item.data.data.chance) || 0;
    const categoryMod: number = Number(item.data.data.categoryMod) || 0;
    var chanceToGain = 0;
    if (chance > 100) {
      chanceToGain = categoryMod;
    } else {
      chanceToGain = 100 - chance + categoryMod;
    }

    const btnImprove = getGame().i18n.format("DIALOG.improveSkillDialog.btnDoImprovement");
    const btnCancel = getGame().i18n.format("DIALOG.improveSkillDialog.btnCancel");
    const buttons: any = {};

    if (skill.data.hasExperience || skill.data.chance < 75) {
      buttons.submit = {
        icon: '<i class="fas fa-check"></i>',
        label: btnImprove,
        callback: async (html: JQuery | HTMLElement) =>
          await SkillSheet.submitImproveSkillDialog(html as JQuery, actor, item, speakerName),
      };
    }

    buttons.cancel = {
      icon: '<i class="fas fa-times"></i>',
      label: btnCancel,
      callback: () => null,
    };

    const experience1d6Checked = skill.data.hasExperience;
    const training1d6minus1Checked = !experience1d6Checked ? true : false;

    const content: string = await renderTemplate(
      "systems/rqg/items/skill-item/dialogShowImproveSkill.hbs",
      {
        skill: skill,
        chanceToGain: chanceToGain,
        experience1d6Checked: experience1d6Checked,
        training1d6minus1Checked: training1d6minus1Checked,
      }
    );

    const title = getGame().i18n.format("DIALOG.improveSkillDialog.title", {
      skillName: skill.data.skillName,
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

  private static async submitImproveSkillDialog(
    html: JQuery,
    actor: RqgActor,
    item: RqgItem,
    speakerName: string
  ) {
    assertItemType(item.data.type, ItemTypeEnum.Skill);
    const skillData = item.data as SkillDataProperties;
    const formData = new FormData(html.find("form")[0]);
    // @ts-ignore entries
    const data = Object.fromEntries(formData.entries());
    const gaintype: string = data.experiencegaintype;
    var gain: number = 0;

    if (gaintype === "experience3" || gaintype === "experience1d6") {
      if (skillData.data.hasExperience) {
        var chance: number = Number(item.data.data.chance) || 0;
        var categoryMod: number = Number(item.data.data.categoryMod) || 0;
        const rollFlavor = getGame().i18n.format(
          "DIALOG.improveSkillDialog.experienceRoll.flavor",
          { actorName: actor.name, skillName: skillData.data.skillName }
        );
        const rollContent = getGame().i18n.format(
          "DIALOG.improveSkillDialog.experienceRoll.content",
          { mod: categoryMod, skillChance: skillData.data.chance }
        );

        // roll 1d100 and add the category mod
        const expRoll = new Roll("1d100+" + categoryMod);
        await expRoll.toMessage({
          speaker: { alias: speakerName },
          type: CONST.CHAT_MESSAGE_TYPES.ROLL,
          flavor: `<h3>${rollFlavor}</h3><p>${rollContent}</p>`,
        });

        // Gain if the modified d100 roll is greater than (but not equal to) the skill chance, or if the roll is greater than or equal to 100
        if (
          expRoll.total !== undefined &&
          (expRoll.total > skillData.data.chance || expRoll.total >= 100)
        ) {
          // increase skill learnedChance, clear experience check
          const resultFlavor = getGame().i18n.format(
            "DIALOG.improveSkillDialog.experienceResultCard.flavor",
            { skillName: skillData.data.skillName }
          );
          if (gaintype === "experience3") {
            const resultContentChose3 = getGame().i18n.format(
              "DIALOG.improveSkillDialog.experienceResultCard.contentChose3"
            );
            const gainRoll = new Roll("3");
            await gainRoll.toMessage({
              speaker: { alias: speakerName },
              type: CONST.CHAT_MESSAGE_TYPES.ROLL,
              flavor: `<h3>${resultFlavor}</h3><p>${resultContentChose3}</p>`,
            });
            gain = 3;
          }
          if (gaintype === "experience1d6") {
            const resultContentChose1d6 = getGame().i18n.format(
              "DIALOG.improveSkillDialog.experienceResultCard.contentChose1d6"
            );
            const gainRoll = new Roll("1d6");
            await gainRoll.toMessage({
              speaker: { alias: speakerName },
              type: CONST.CHAT_MESSAGE_TYPES.ROLL,
              flavor: `<h3>${resultFlavor}</h3><p>${resultContentChose1d6}</p>`,
            });
            gain = Number(gainRoll.total) || 0;
          }
          ui.notifications?.info(`${actor.name} gained ${gain}% in ${item.name}!`);
        } else {
          // no increase, clear experience check
          gain = 0;
          const failedFlavor = getGame().i18n.format(
            "DIALOG.improveSkillDialog.experienceGainFailed.flavor",
            { skillName: skillData.data.skillName }
          );
          const failedContent = getGame().i18n.format(
            "DIALOG.improveSkillDialog.experienceGainFailed.content",
            { actorName: actor.name, skillName: skillData.data.skillName }
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
        const msg = getGame().i18n.format("DIALOG.improveSkillDialog.notifications.noExperience", {
          actorName: actor.name,
          skillName: skillData.data.skillName,
        });
        ui.notifications?.error(msg);
      }
    }
    if (gaintype === "training2") {
      const flavor = getGame().i18n.format("DIALOG.improveSkillDialog.trainingResultCard.flavor", {
        skillName: skillData.data.skillName,
      });
      const content = getGame().i18n.format(
        "DIALOG.improveSkillDialog.trainingResultCard.contentChose2"
      );
      const roll = new Roll("2");
      await roll.toMessage({
        speaker: { alias: speakerName },
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        flavor: `<h3>${flavor}</h3><p>${content}</p>`,
      });
      gain = 2;
    }
    if (gaintype === "training1d6minus1") {
      const flavor = getGame().i18n.format("DIALOG.improveSkillDialog.trainingResultCard.flavor", {
        skillName: skillData.data.skillName,
      });
      const content = getGame().i18n.format(
        "DIALOG.improveSkillDialog.trainingResultCard.contentChose1d6minus1"
      );
      const gainRoll = new Roll("1d6-1");
      await gainRoll.toMessage({
        speaker: { alias: speakerName },
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        flavor: `<h3>${flavor}</h3><p>${content}</p>`,
      });
      gain = Number(gainRoll.total) || 0;
    }
    let newLearnedChance: number = Number(skillData.data.learnedChance) + gain;
    await actor.updateEmbeddedDocuments("Item", [
      { _id: item.id, data: { hasExperience: false, learnedChance: newLearnedChance } },
    ]);
  }
}

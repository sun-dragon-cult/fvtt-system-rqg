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

  static showImproveSkillDialog(actor: RqgActor, skillItemId: string, speakerName: string): void {
    const item = actor.items.get(skillItemId);
    if (!item || item.data.type !== ItemTypeEnum.Skill) {
      const msg = `Couldn't find skill with itemId [${skillItemId}] on actor ${actor.name} to show Improve Skill dialog.`;
      ui.notifications?.error(msg);
      throw new RqgError(msg);
    }
    const dialogContent = `<form>
    <h1>What type of improvement are you attempting?</h1>
    <p>See pages 415-417.</p>
    <div class="experience">
        <h2>From experience:</h2>
        <p>Roll 1d100 and add the skill category mod.  If this FAILS:</p>
        <label>
            <input type="checkbox" class="improvement-type-checkbox" name="experience3"> Gain 3%
        </label>
        <label>
            <input type="checkbox" class="improvement-type-checkbox" name="experience1d6"> Gain 1d6%
        </label>
    </div>
    <div class="training">
        <h2>Through training:</h2>
        <p>After training:</p>
        <label>
            <input type="checkbox" class="improvement-type-checkbox" name="training2"> Gain 2
        </label>
        <label>
            <input type="checkbox" class="improvement-type-checkbox" name="training1d6minus1"> Gain 1d6-1%
        </label>
    </div>
</form>`;
    new Dialog(
      {
        title: `Skill Improvement ${item.name}`,
        content: dialogContent,
        default: "submit",
        render: () => {
          $(".improvement-type-checkbox").on('change', function() {
            // ensure only one checkbox is checked
            $('.improvement-type-checkbox').not(this).prop('checked', false);
          });
        },
        buttons: {
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: "Attempt Improvement",
            callback: async (html: JQuery | HTMLElement) =>
              await SkillSheet.submitImproveSkillDialog(
                html as JQuery,
                actor,
                item,
                speakerName
              )
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => null,
          },
        },
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
    const skillData = item.data as SkillDataProperties;
    const formData = new FormData(html.find("form")[0]);
    // @ts-ignore entries
    const data = Object.fromEntries(formData.entries());
    console.log(data);
    const experience3: boolean = !!data.experience3;
    const experience1d6: boolean = !!data.experience1d6;
    const training2: boolean = !!data.training2;
    const training1d6minus1: boolean = !!data.training1d6minus1;

    //TODO: data validation to ensure they didn't figure out some way to check more than one?

    var gain: number = 0;

    console.log(item);

    if (experience3 || experience1d6) {
      if (skillData.data.hasExperience) {
        // @ts-ignore chance
        var chance: number = Number(item.data.data.chance) || 0;
        // @ts-ignore categoryMod
        var categoryMod: number = Number(item.data.data.categoryMod) || 0;
        const flavor = `<h3>${item.name} experience improvement</h3><p>Requires FAILURE or FUMBLE to gain.</p>`;
        const result = await Ability.roll(flavor, chance, categoryMod, speakerName);
        console.log("Result: " + result);
        if (result >= ResultEnum.Failure) {
          // FAILED ability check means increase skill
          if (experience3) {
            const roll = new Roll("3");
            const result = await roll.evaluate({ async: true});
            await roll.toMessage({
              speaker: { alias: speakerName},
              type: CONST.CHAT_MESSAGE_TYPES.ROLL,
              flavor: `<h3>Experience improvement for ${item.name}</h3><p>Chose fixed gain of 3%.</p>`
            });
            gain = 3;
          }
          if (experience1d6) {
            const roll = new Roll("1d6");
            const result = await roll.evaluate({ async: true});
            await roll.toMessage({
              speaker: { alias: speakerName},
              type: CONST.CHAT_MESSAGE_TYPES.ROLL,
              flavor: `<h3>Experience improvement for ${item.name}</h3>`
            });
            gain = Number(result.total) || 0; 
          }
          ui.notifications?.info(`${actor.name} gained ${gain}% in ${item.name}!`);
        } else {
          // SUCCEEDED ability check means no skill increase 
          gain = 0;
          ui.notifications?.info(`${actor.name} did not gain in ${item.name}, and the experience check has been removed.`);
        }
      } else {
        ui.notifications?.error(`The ${item.name} skill does not have an experience and cannot be improved right now.`);
      }
    }
    if (training2) {
      const roll = new Roll("2");
      const result = await roll.evaluate({ async: true});
      await roll.toMessage({
        speaker: { alias: speakerName},
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        flavor: `<h3>Training improvement for ${item.name}</h3><p>Chose fixed gain of 2%.</p>`
      });
      gain = 2;
    }
    if (training1d6minus1) {
      const roll = new Roll("1d6-1");
      const result = await roll.evaluate({ async: true});
      await roll.toMessage({
        speaker: { alias: speakerName},
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        flavor: `<h3>Training improvement for ${item.name}</h3>`
      });
      gain = Number(result.total) || 0; 
    }
    let newLearnedChance: number = Number(skillData.data.learnedChance) + gain;
    await actor.updateEmbeddedDocuments("Item", [
      { _id: item.id, data: { hasExperience: false, learnedChance: newLearnedChance } }
    ]);

  }
}

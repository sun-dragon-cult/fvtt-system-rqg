import { SkillCategoryEnum } from "../data-model/item-data/skillData";
import {
  HomeLandEnum,
  OccupationEnum,
} from "../data-model/actor-data/background";
import { Ability, ResultEnum } from "../data-model/shared/ability";
import { RqgActorData } from "../data-model/actor-data/rqgActorData";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { HitLocationData } from "../data-model/item-data/hitLocationData";

export class RqgActorSheet extends ActorSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", "actor"],
      template: "systems/rqg/module/actor/rqgActorSheet.html",
      width: 600,
      height: 600,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "description",
        },
      ],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
    });
  }

  /* -------------------------------------------- */

  getData(): ActorSheetData {
    const sheetData: any = super.getData();
    const data: RqgActorData = sheetData.data;

    data.occupations = Object.values(OccupationEnum);
    data.homelands = Object.values(HomeLandEnum);

    // Separate different item types for easy access
    const elementalRunes = sheetData.items.filter(
      (i: Item) => i.type === ItemTypeEnum.ElementalRune
    );
    const powerRunes = sheetData.items
      .filter((i: Item) => i.type === ItemTypeEnum.PowerRune)
      .reduce((acc, item) => {
        acc[item.name] = item;
        return acc;
      }, {});
    const passions = sheetData.items.filter(
      (i: Item) => i.type === ItemTypeEnum.Passion
    );
    const allSkills = sheetData.items.filter(
      (i: Item) => i.type === ItemTypeEnum.Skill
    );
    const skills = {};
    Object.values(SkillCategoryEnum).forEach((cat: string) => {
      skills[cat] = allSkills.filter((s) => cat === s.data.category);
    });
    const hitLocations: Item<HitLocationData> = sheetData.items.filter(
      (i: Item) => i.type === ItemTypeEnum.HitLocation
    );
    // TODO Sort on dieFrom

    data.ownedItems = {
      skills,
      elementalRunes,
      powerRunes,
      passions,
      hitLocations,
    };
    return sheetData;
  }

  activateListeners(html): void {
    super.activateListeners(html);

    // Use attributes data-item-edit, data-item-delete & data-item-roll to specify what should be clicked to perform the action
    // Set data-item-edit=actor.items._id on the same or an outer element to specify what item the action should be performed on.

    // Roll against Item Ability Chance
    this.form.querySelectorAll("[data-item-roll]").forEach((el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset
        .itemId;
      const item: Item = this.actor.items.get(itemId);
      el.addEventListener("click", () => {
        const result = Ability.rollAgainst(item.data.data.chance, 0, item.name);
        if (result <= ResultEnum.Success) {
          // TODO Chain rolls depending on outcome. Just playing around for now...
          ChatMessage.create({
            content: "Roll damage [[/r d8 + 1]] and hit location [[/r d20]]",
          });
        }
      });
    });

    // Edit Item (open the item sheet)
    this.form.querySelectorAll("[data-item-edit]").forEach((el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset
        .itemId;
      el.addEventListener("click", () =>
        this.actor.getOwnedItem(itemId).sheet.render(true)
      );
    });

    // Delete Item (remove item from actor)
    this.form.querySelectorAll("[data-item-delete]").forEach((el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset
        .itemId;
      el.addEventListener("click", () => this.actor.deleteOwnedItem(itemId));
    });
  }

  _updateObject(event: Event, formData: any): Promise<any> {
    // TODO  | JQuery.Event - hur funkar eg det där? Hur vet man vad man får?
    console.log("*** Event + formData", event.target, formData);
    return this.object.update(formData);
  }
}

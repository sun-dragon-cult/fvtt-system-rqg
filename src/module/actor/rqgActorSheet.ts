import {
  SkillCategoryEnum,
  SkillData,
} from "../data-model/item-data/skillData";
import {
  HomeLandEnum,
  OccupationEnum,
} from "../data-model/actor-data/background";
import { Ability, ResultEnum } from "../data-model/shared/ability";
import { RqgActorData } from "../data-model/actor-data/rqgActorData";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { HitLocationData } from "../data-model/item-data/hitLocationData";
import { RqgItem } from "../item/rqgItem";
import { PowerRuneData } from "../data-model/item-data/powerRuneData";
import { PassionData } from "../data-model/item-data/passionData";
import { ElementalRuneData } from "../data-model/item-data/elementalRuneData";

export class RqgActorSheet extends ActorSheet<RqgActorData> {
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

  getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const items: Collection<Item<RqgItem>> = sheetData.items;
    const data: RqgActorData = sheetData.data;

    data.occupations = Object.values(OccupationEnum);
    data.homelands = Object.values(HomeLandEnum);

    // Separate different item types for easy access
    const elementalRunes: ItemData<ElementalRuneData>[] = items.filter(
      (i: Item) => i.type === ItemTypeEnum.ElementalRune
    );
    const powerRunes: ItemData<PowerRuneData>[] = items
      .filter((i: Item) => i.type === ItemTypeEnum.PowerRune)
      .reduce((acc, item: Item<RqgItem>) => {
        acc[item.name] = item;
        return acc;
      }, {});
    const passions: ItemData<PassionData>[] = items.filter(
      (i: Item) => i.type === ItemTypeEnum.Passion
    );
    const allSkills: ItemData<SkillData>[] = items.filter(
      (i: Item) => i.type === ItemTypeEnum.Skill
    );
    const skills = {};
    Object.values(SkillCategoryEnum).forEach((cat: string) => {
      skills[cat] = allSkills.filter((s) => cat === s.data.category);
    });
    const hitLocations: Item<HitLocationData>[] = items.filter(
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

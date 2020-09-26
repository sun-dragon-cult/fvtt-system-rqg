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
import { PowerRuneData } from "../data-model/item-data/powerRuneData";
import { PassionData } from "../data-model/item-data/passionData";
import { ElementalRuneData } from "../data-model/item-data/elementalRuneData";
import { HitLocationSheet } from "../items/hit-location-item/hitLocationSheet";
import { GearData } from "../data-model/item-data/gearData";
import { ArmorData } from "../data-model/item-data/armorData";

export class RqgActorSheet extends ActorSheet<RqgActorData> {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", "actor"],
      template: "systems/rqg/actors/rqgActorSheet.html",
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
    const items: Array<ItemData> = sheetData.items; // Not correctly typed in foundry-pc-types ?
    const data: RqgActorData = sheetData.data;

    data.occupations = Object.values(OccupationEnum);
    data.homelands = Object.values(HomeLandEnum);

    // Separate different item types for easy access
    const elementalRunes: ItemData<ElementalRuneData>[] = items.filter(
      (i) => i.type === ItemTypeEnum.ElementalRune
    );
    const powerRunes: ItemData<PowerRuneData>[] = items
      .filter((i) => i.type === ItemTypeEnum.PowerRune)
      .reduce((acc, item) => {
        acc[item.name] = item;
        return acc;
      }, []);
    const passions: ItemData<PassionData>[] = items.filter(
      (i) => i.type === ItemTypeEnum.Passion
    );
    const allSkills: ItemData<SkillData>[] = items.filter(
      (i) => i.type === ItemTypeEnum.Skill
    );
    const skills = {};
    Object.values(SkillCategoryEnum).forEach((cat: string) => {
      skills[cat] = allSkills.filter((s) => cat === s.data.category);
    });
    const hitLocations: ItemData<HitLocationData>[] = items
      .filter((i) => i.type === ItemTypeEnum.HitLocation)
      .sort(
        (a: ItemData<HitLocationData>, b: ItemData<HitLocationData>) =>
          b.data.dieFrom - a.data.dieFrom
      );
    const gear: ItemData<GearData>[] = items.filter(
      (i) => i.type === ItemTypeEnum.Gear
    );
    const armor: ItemData<ArmorData>[] = items.filter(
      (i) => i.type === ItemTypeEnum.Armor
    );

    data.ownedItems = {
      skills,
      elementalRunes,
      powerRunes,
      passions,
      hitLocations,
      gear,
      armor,
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
            content: "Roll damage [[/r 1d8 + 1]] and hit location [[/r 1d20]]",
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
      el.addEventListener("click", () =>
        RqgActorSheet.confirmItemDelete(this.actor, itemId)
      );
    });

    // Add Item (create owned item)
    this.form.querySelectorAll("[data-item-add]").forEach((el) => {
      const itemType = (el.closest("[data-item-type]") as HTMLElement).dataset
        .itemType;
      el.addEventListener("click", () => {
        // Create item and render sheet afterwards
        this.actor
          .createOwnedItem({ name: "Newone", type: itemType })
          .then((item) => {
            // We have to reload the item for it to have a sheet
            const createdItem = this.actor.getOwnedItem(item._id);
            createdItem.sheet.render(true);
          });
      });
    });

    // Add wound to hit location TODO move listener to hitlocation
    this.form.querySelectorAll("[data-item-add-wound]").forEach((el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset
        .itemId;
      el.addEventListener("click", () =>
        HitLocationSheet.addWound(this.actor, itemId)
      );
    });

    // Edit wounds to hit location TODO move listener to hitlocation
    this.form.querySelectorAll("[data-item-edit-wounds]").forEach((el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset
        .itemId;
      el.addEventListener("click", () =>
        HitLocationSheet.editWounds(this.actor, itemId)
      );
    });
  }

  static confirmItemDelete(actor, itemId) {
    const item = actor.getOwnedItem(itemId);
    new Dialog(
      {
        title: `Delete ${item.name}`,
        content: "Do you want to delete this item",
        default: "submit",
        buttons: {
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => null,
          },
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: "Confirm",
            callback: () => {
              actor.deleteOwnedItem(itemId);
            },
          },
        },
      },
      {
        classes: ["rqg", "dialog"],
      }
    ).render(true);
  }
}

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
import { HitLocationSheet } from "../items/hit-location-item/hitLocationSheet";
import { RqgItem } from "../items/rqgItem";
import { MeleeWeaponData } from "../data-model/item-data/meleeWeaponData";

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
    const data: RqgActorData = sheetData.data;

    data.occupations = Object.values(OccupationEnum);
    data.homelands = Object.values(HomeLandEnum);

    // Separate different item types for easy access

    // ownedItems looks like {armor: [RqgItem], elementalRune: [RqgItem], ... }
    data.ownedItems = this.actor.itemTypes;

    // Organise powerRunes as { beast: RqgItem, death: RqgItem, ... }
    data.ownedItems[ItemTypeEnum.PowerRune] = data.ownedItems[
      ItemTypeEnum.PowerRune
    ].reduce((acc, item: RqgItem) => {
      acc[item.name] = item;
      return acc;
    }, []);

    // Separate skills into skill categories {agility: [RqgItem], communication: [RqgItem], ... }
    const skills = {};
    Object.values(SkillCategoryEnum).forEach((cat: string) => {
      skills[cat] = data.ownedItems[ItemTypeEnum.Skill].filter(
        (s: RqgItem<SkillData>) => cat === s.data.data.category
      );
    });
    data.ownedItems[ItemTypeEnum.Skill] = skills;

    // Sort the hit locations
    data.ownedItems[ItemTypeEnum.HitLocation].sort(
      (a: ItemData<HitLocationData>, b: ItemData<HitLocationData>) =>
        b.data.dieFrom - a.data.dieFrom
    );
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
      });
    });

    // Weapon roll
    this.form.querySelectorAll("[data-weapon-roll]").forEach((el) => {
      const attackType = (el as HTMLElement).dataset.weaponRoll;
      const weaponItemId = (el.closest("[data-item-id]") as HTMLElement).dataset
        .itemId;
      const weaponItem: Item<MeleeWeaponData> = this.actor.items.get(
        weaponItemId
      );
      const skillId = (el.closest("[data-item-id]") as HTMLElement).dataset
        .skillId;
      const skillItem: Item<SkillData> = this.actor.items.get(skillId);
      el.addEventListener("click", () => {
        const result = Ability.rollAgainst(
          skillItem.data.data.chance,
          0,
          `${weaponItem.name} ${attackType} (${skillItem.name})`
        );
        if (result <= ResultEnum.Success) {
          // TODO Make damage vary depending on success
          ChatMessage.create({
            content: `Roll damage [[/r ${weaponItem.data.data.damage} + ${this.actor.data.data.attributes.damageBonus} #Damage]]<br><br>
                      and hit location [[/r 1d20 #Hit Location]]`,
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

    // Equip a physical Item
    this.form.querySelectorAll("[data-item-equip]").forEach((el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset
        .itemId;
      el.addEventListener("click", () => {
        const item = this.actor.getOwnedItem(itemId);
        item.update({ "data.equipped": !item.data.data.equipped }, {});
      });
    });

    // Edit item value
    this.form.querySelectorAll("[data-item-edit-value]").forEach((el) => {
      const path = (el as HTMLElement).dataset.itemEditValue;
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset
        .itemId;
      el.addEventListener("change", (event) => {
        const item = this.actor.getOwnedItem(itemId);
        console.log("QQQQ", {
          [path]: (event.target as HTMLInputElement).value,
        });
        item.update({ [path]: (event.target as HTMLInputElement).value }, {});
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

    // Edit Active Effect
    this.form.querySelectorAll("[data-effect-edit]").forEach((el) => {
      const effectId = (el.closest("[data-effect-id]") as HTMLElement).dataset
        .effectId;
      el.addEventListener("click", () =>
        // @ts-ignore 0.7
        new ActiveEffectConfig(this.actor.effects.get(effectId)).render(true)
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

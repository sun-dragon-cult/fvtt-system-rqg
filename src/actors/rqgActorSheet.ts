import { SkillCategoryEnum, SkillData } from "../data-model/item-data/skillData";
import { HomeLandEnum, OccupationEnum } from "../data-model/actor-data/background";
import { Ability, ResultEnum } from "../data-model/shared/ability";
import { RqgActorData } from "../data-model/actor-data/rqgActorData";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { HitLocationData } from "../data-model/item-data/hitLocationData";
import { HitLocationSheet } from "../items/hit-location-item/hitLocationSheet";
import { RqgItem } from "../items/rqgItem";
import { MeleeWeaponData } from "../data-model/item-data/meleeWeaponData";
import { MissileWeaponData } from "../data-model/item-data/missileWeaponData";
import { RuneData, RuneTypeEnum } from "../data-model/item-data/runeData";

export class RqgActorSheet extends ActorSheet<RqgActorData> {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", "actor"],
      template: "systems/rqg/actors/rqgActorSheet.html",
      width: 720,
      height: 650,
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

    // Separate skills into skill categories {agility: [RqgItem], communication: [RqgItem], ... }
    const skills = {};
    Object.values(SkillCategoryEnum).forEach((cat: string) => {
      skills[cat] = data.ownedItems[ItemTypeEnum.Skill].filter(
        (s: RqgItem<SkillData>) => cat === s.data.data.category
      );
    });
    // Sort the skills inside each category
    Object.values(skills).forEach((skillList) =>
      (skillList as RqgItem[]).sort((a: RqgItem<SkillData>, b: RqgItem<SkillData>) =>
        ("" + a.data.name).localeCompare(b.data.name)
      )
    );
    data.ownedItems[ItemTypeEnum.Skill] = skills;

    // Separate runes into types (elemental, power, form, technique)
    const runes = {};
    Object.values(RuneTypeEnum).forEach((type: string) => {
      runes[type] = data.ownedItems[ItemTypeEnum.Rune].filter(
        (r: RqgItem<RuneData>) => type === r.data.data.runeType
      );
    });
    data.ownedItems[ItemTypeEnum.Rune] = runes;

    // Organise powerRunes as { fertility: RqgItem, death: RqgItem, ... }
    data.ownedItems[ItemTypeEnum.Rune][RuneTypeEnum.Power] = {
      ...data.ownedItems[ItemTypeEnum.Rune][RuneTypeEnum.Power].reduce((acc, item: RqgItem) => {
        acc[item.data.data.rune] = item;
        return acc;
      }, []),
    };

    // Organise formRunes as { man: RqgItem, beast: RqgItem, ... }
    data.ownedItems[ItemTypeEnum.Rune][RuneTypeEnum.Form] = {
      ...data.ownedItems[ItemTypeEnum.Rune][RuneTypeEnum.Form].reduce((acc, item: RqgItem) => {
        acc[item.data.data.rune] = item;
        return acc;
      }, []),
    };

    // Sort the hit locations
    data.ownedItems[ItemTypeEnum.HitLocation].sort(
      (a: RqgItem<HitLocationData>, b: RqgItem<HitLocationData>) =>
        b.data.data.dieFrom - a.data.data.dieFrom
    );

    data.spiritCombatSkill = data.ownedItems[ItemTypeEnum.Skill][SkillCategoryEnum.Magic].find(
      (s) => s.data.name === "Spirit Combat"
    );
    data.dodgeSkill = data.ownedItems[ItemTypeEnum.Skill][SkillCategoryEnum.Agility].find(
      (s) => s.data.name === "Dodge"
    );

    data.powCrystals =
      data.effects &&
      data.effects
        .filter((e) => e.changes.find((e) => e.key === "data.attributes.magicPoints.max"))
        .map((e) => {
          return {
            name: e.label,
            size: e.changes
              .filter((c) => c.key === "data.attributes.magicPoints.max")
              .reduce((acc, c) => acc + c.value, 0),
          };
        });

    data.spiritMagicPointSum = data.ownedItems[ItemTypeEnum.SpiritMagic].reduce(
      (acc, m) => acc + m.data.data.points,
      0
    );

    data.freeInt =
      data.characteristics.intelligence.value -
      data.spiritMagicPointSum -
      data.ownedItems[ItemTypeEnum.Skill].magic.filter((s) => s.data.data.runes.length).length;

    return sheetData;
  }

  protected _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    if (
      formData["data.attributes.hitPoints.value"] > this.actor.data.data.attributes.hitPoints.max
    ) {
      formData["data.attributes.hitPoints.value"] = this.actor.data.data.attributes.hitPoints.max;
    }
    return super._updateObject(event, formData);
  }

  activateListeners(html): void {
    super.activateListeners(html);

    // Use attributes data-item-edit, data-item-delete & data-item-roll to specify what should be clicked to perform the action
    // Set data-item-edit=actor.items._id on the same or an outer element to specify what item the action should be performed on.

    // Roll against Item Ability Chance
    this.form.querySelectorAll("[data-item-roll]").forEach((el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      const item: Item = this.actor.items.get(itemId);
      el.addEventListener("click", () => {
        const result = Ability.rollAgainst(item.data.data.chance, 0, item.name);
      });
    });

    // Melee Weapon roll
    this.form.querySelectorAll("[data-melee-roll]").forEach((el) => {
      const attackType = (el as HTMLElement).dataset.meleeRoll;
      const weaponItemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      const weaponItem: Item<MeleeWeaponData> = this.actor.items.get(weaponItemId);
      const skillId = (el.closest("[data-item-id]") as HTMLElement).dataset.skillId;
      const skillItem: Item<SkillData> = this.actor.items.get(skillId);
      el.addEventListener("click", async () => {
        const result = Ability.rollAgainst(
          skillItem.data.data.chance,
          0,
          `${weaponItem.name} ${attackType} (${skillItem.name})`
        );
        if (result <= ResultEnum.Success) {
          // TODO Make damage vary depending on success
          const damageBonus =
            this.actor.data.data.attributes.damageBonus !== "0"
              ? `+ ${this.actor.data.data.attributes.damageBonus}[Damage Bonus]`
              : "";
          await ChatMessage.create({
            content: `Roll damage [[/r ${weaponItem.data.data.damage} ${damageBonus} #Damage]]<br><br>
                      and hit location [[/r 1D20 #Hit Location]]`,
          });
        }
      });
    });

    // Missile Weapon roll
    this.form.querySelectorAll("[data-missile-roll]").forEach((el) => {
      const attackType = (el as HTMLElement).dataset.missileRoll;
      const weaponItemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      const weaponItem: Item<MissileWeaponData> = this.actor.items.get(weaponItemId);
      const skillId = (el.closest("[data-item-id]") as HTMLElement).dataset.skillId;
      const skillItem: Item<SkillData> = this.actor.items.get(skillId);
      const projectileItem = weaponItem.data.data.isProjectileWeapon
        ? this.actor.items.get(weaponItem.data.data.projectileId)
        : weaponItem;

      el.addEventListener("click", async () => {
        if (projectileItem.data.data.quantity > 0) {
          // projectileItem.data.data.quantity = projectileItem.data.data
          //   .quantity--;
          await this.actor.updateOwnedItem({
            _id: projectileItem.id,
            "data.quantity": --projectileItem.data.data.quantity,
          });

          const result = Ability.rollAgainst(
            skillItem.data.data.chance,
            0,
            `${weaponItem.name} ${attackType} (${skillItem.name})`
          );
          if (result <= ResultEnum.Success) {
            // TODO Make damage vary depending on success
            const damageBonus: string =
              weaponItem.data.data.isThrownWeapon &&
              this.actor.data.data.attributes.damageBonus !== "0"
                ? ` + ceil(${this.actor.data.data.attributes.damageBonus}[Damage Bonus] / 2)`
                : "";
            await ChatMessage.create({
              content: `Roll damage [[/r ${weaponItem.data.data.damage} ${damageBonus} #Damage]]<br><br>
              and hit location [[/r 1D20 #Hit Location]]`,
            });
          }
        } else {
          await ChatMessage.create({ content: `Out of ammo!` });
        }
      });
    });

    // Edit Item (open the item sheet)
    this.form.querySelectorAll("[data-item-edit]").forEach((el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      el.addEventListener("click", () => this.actor.getOwnedItem(itemId).sheet.render(true));
    });

    // Delete Item (remove item from actor)
    this.form.querySelectorAll("[data-item-delete]").forEach((el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      el.addEventListener("click", () => RqgActorSheet.confirmItemDelete(this.actor, itemId));
    });

    // Add Item (create owned item)
    this.form.querySelectorAll("[data-item-add]").forEach((el) => {
      const itemType = (el.closest("[data-item-type]") as HTMLElement).dataset.itemType;
      el.addEventListener("click", () => {
        // Create item and render sheet afterwards
        this.actor.createOwnedItem({ name: "Newone", type: itemType }).then((item) => {
          // We have to reload the item for it to have a sheet
          const createdItem = this.actor.getOwnedItem(item._id);
          createdItem.sheet.render(true);
        });
      });
    });

    // Equip a physical Item
    this.form.querySelectorAll("[data-item-equip]").forEach((el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      el.addEventListener("click", async () => {
        const item = this.actor.getOwnedItem(itemId);
        await item.update({ "data.isEquipped": !item.data.data.isEquipped }, {});
      });
    });

    // Toggle experience flag
    this.form.querySelectorAll("[data-item-experience]").forEach((el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      el.addEventListener("click", async () => {
        const item = this.actor.getOwnedItem(itemId);
        await item.update({ "data.experience": !item.data.data.experience }, {});
      });
    });

    // Edit item value
    this.form.querySelectorAll("[data-item-edit-value]").forEach((el) => {
      const path = (el as HTMLElement).dataset.itemEditValue;
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      el.addEventListener("change", async (event) => {
        const item = this.actor.getOwnedItem(itemId);
        await item.update({ [path]: (event.target as HTMLInputElement).value }, {});
      });
    });

    // Add wound to hit location TODO move listener to hitlocation
    this.form.querySelectorAll("[data-item-add-wound]").forEach((el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      el.addEventListener("click", () => HitLocationSheet.addWound(this.actor, itemId));
    });

    // Edit wounds to hit location TODO move listener to hitlocation
    this.form.querySelectorAll("[data-item-edit-wounds]").forEach((el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      el.addEventListener("click", () => HitLocationSheet.editWounds(this.actor, itemId));
    });

    // Edit Actor Active Effect
    this.form.querySelectorAll("[data-actor-effect-edit]").forEach((el) => {
      const effectId = (el.closest("[data-effect-id]") as HTMLElement).dataset.effectId;
      el.addEventListener("click", () =>
        new ActiveEffectConfig(this.actor.effects.get(effectId)).render(true)
      );
    });
  }

  static confirmItemDelete(actor, itemId) {
    const item = actor.getOwnedItem(itemId);
    new Dialog(
      {
        title: `Delete ${item.type}: ${item.name}`,
        content: "Do you want to delete this item",
        default: "submit",
        buttons: {
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: "Confirm",
            callback: () => {
              actor.deleteOwnedItem(itemId);
            },
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
}

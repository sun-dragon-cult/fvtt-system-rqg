import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { CombatManeuver, MeleeWeaponData } from "../../data-model/item-data/meleeWeaponData";
import { SkillCategoryEnum, SkillData } from "../../data-model/item-data/skillData";
import { RqgItemSheet } from "../RqgItemSheet";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";

export class MeleeWeaponSheet extends RqgItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.MeleeWeapon],
      template: "systems/rqg/items/melee-weapon-item/meleeWeaponSheet.html",
      width: 355,
      height: 510,
    });
  }

  // @ts-ignore
  async getData() {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: MeleeWeaponData = sheetData.item.data;
    data.allCombatManeuvers = Object.values(CombatManeuver).reduce((acc, m) => {
      const v = data.combatManeuvers.includes(m);
      acc[m] = { name: m, value: v };
      return acc;
    }, {});
    data.isOwned = this.item.isOwned;
    if (this.item.isOwned) {
      data.meleeWeaponSkills = this.actor
        .getEmbeddedCollection("OwnedItem")
        .filter(
          (i: ItemData<SkillData>) =>
            i.type === ItemTypeEnum.Skill &&
            (i.data.category === SkillCategoryEnum.MeleeWeapons ||
              i.data.category === SkillCategoryEnum.Shields ||
              i.data.category === SkillCategoryEnum.NaturalWeapons)
        );
    } else {
      if (data.skillOrigin) {
        // @ts-ignore
        const skill = await fromUuid(data.skillOrigin);
        data.skillName = skill?.name || "";
      }
    }
    return sheetData;
  }

  protected async _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    const combatManeuvers = [];
    Object.values(CombatManeuver).forEach((m) => {
      if (formData[`data.allCombatManeuvers.${m}.value`]) {
        combatManeuvers.push(m);
      }
    });
    formData["data.combatManeuvers"] = combatManeuvers;
    Object.values(CombatManeuver).forEach(
      (cm) => delete formData[`data.allCombatManeuvers.${cm}.value`]
    );
    return super._updateObject(event, formData);
  }

  protected activateListeners(html: JQuery) {
    super.activateListeners(html);
    if (!this.item.isOwned) {
      this.form.addEventListener("drop", this._onDrop.bind(this));
    }
  }

  protected async _onDrop(event: DragEvent) {
    super._onDrop(event);
    // Try to extract the data
    let droppedItemData;
    try {
      droppedItemData = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch (err) {
      return false;
    }
    if (droppedItemData.type === "Item") {
      // @ts-ignore
      const item = await Item.fromDropData(droppedItemData);
      if (
        (item.type === ItemTypeEnum.Skill &&
          item.data.data.category === SkillCategoryEnum.MeleeWeapons) ||
        item.data.data.category === SkillCategoryEnum.NaturalWeapons ||
        item.data.data.category === SkillCategoryEnum.Shields
      ) {
        const skillId = item.uuid || "";
        await this.item.update({ "data.skillOrigin": skillId }, {});
      } else {
        ui.notifications.warn(
          "The item must be a weapon skill (category melee, shield or natural weapon)"
        );
      }
    }
  }
}

import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { CombatManeuver, MeleeWeaponItemData } from "../../data-model/item-data/meleeWeaponData";
import { SkillCategoryEnum, SkillData, SkillItemData } from "../../data-model/item-data/skillData";
import { RqgItem } from "../rqgItem";
import { equippedStatuses } from "../../data-model/item-data/IPhysicalItem";

export class MeleeWeaponSheet extends ItemSheet<MeleeWeaponItemData> {
  static get defaultOptions(): BaseEntitySheet.Options {
    // @ts-ignore mergeObject
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.MeleeWeapon],
      template: "systems/rqg/items/melee-weapon-item/meleeWeaponSheet.html",
      width: 355,
      height: 510,
    });
  }

  async getData(): Promise<MeleeWeaponItemData> {
    const sheetData = super.getData() as MeleeWeaponItemData;
    const data = sheetData.data;
    // TODO improve types
    data.allCombatManeuvers = Object.values(CombatManeuver).reduce((acc: any, m: any) => {
      const v = data.combatManeuvers.includes(m);
      acc[m] = { name: m, value: v };
      return acc;
    }, {});
    data.isOwned = this.item.isOwned;
    if (this.item.isOwned) {
      data.meleeWeaponSkills = this.actor!.getEmbeddedCollection("OwnedItem").filter(
        (i: Item.Data<SkillData>) =>
          i.type === ItemTypeEnum.Skill &&
          (i.data.category === SkillCategoryEnum.MeleeWeapons ||
            i.data.category === SkillCategoryEnum.Shields ||
            i.data.category === SkillCategoryEnum.NaturalWeapons)
      );
    } else {
      if (data.skillOrigin) {
        const skill = (await fromUuid(data.skillOrigin)) as Item<SkillItemData> | null;
        data.skillName = skill?.name || "";
      }
    }
    data.equippedStatuses = [...equippedStatuses];
    return sheetData;
  }

  protected async _updateObject(event: Event, formData: any): Promise<any> {
    const combatManeuvers: any = [];
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

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);
    if (!this.item.isOwned) {
      (this.form as HTMLElement).addEventListener("drop", this._onDrop.bind(this));
    }
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
    if (droppedItemData.type === "Item") {
      const item = (await Item.fromDropData(droppedItemData)) as RqgItem;
      if (
        item.data.type === ItemTypeEnum.Skill &&
        (item.data.data.category === SkillCategoryEnum.MeleeWeapons ||
          item.data.data.category === SkillCategoryEnum.NaturalWeapons ||
          item.data.data.category === SkillCategoryEnum.Shields)
      ) {
        const skillId = item.uuid || "";
        await this.item.update({ "data.skillOrigin": skillId }, {});
      } else {
        ui.notifications?.warn(
          "The item must be a weapon skill (category melee, shield or natural weapon)"
        );
      }
    }
  }
}

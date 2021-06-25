import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { CombatManeuver, MeleeWeaponData } from "../../data-model/item-data/meleeWeaponData";
import { SkillCategoryEnum, SkillItemData } from "../../data-model/item-data/skillData";
import { RqgItem } from "../rqgItem";
import { equippedStatuses } from "../../data-model/item-data/IPhysicalItem";
import { RqgItemSheet } from "../RqgItemSheet";
import { logMisconfiguration } from "../../system/util";

type MeleeWeaponsSheetSpecificData = {
  allCombatManeuvers: string[];
  isOwned: boolean;
  meleeWeaponSkills: string[];
  skillName: string;
  equippedStatuses: string[];
};

export class MeleeWeaponSheet extends RqgItemSheet {
  static get defaultOptions(): BaseEntitySheet.Options {
    // @ts-ignore mergeObject
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.MeleeWeapon],
      template: "systems/rqg/items/melee-weapon-item/meleeWeaponSheet.html",
      width: 355,
      height: 510,
    });
  }

  async getData(): Promise<any> {
    const context = super.getData() as any;
    const meleeWeaponData = (context.meleeWeaponData = context.data.data) as MeleeWeaponData;
    const sheetSpecific = (context.sheetSpecific = {} as MeleeWeaponsSheetSpecificData);

    sheetSpecific.allCombatManeuvers = Object.values(CombatManeuver).reduce((acc: any, m: any) => {
      const v = meleeWeaponData.combatManeuvers.includes(m);
      acc[m] = { name: m, value: v };
      return acc;
    }, {});
    // @ts-ignore 0.8 isOwned -> isEmbedded
    sheetSpecific.isOwned = this.item.isEmbedded;
    if (this.item.isOwned) {
      sheetSpecific.meleeWeaponSkills = this.actor!.getEmbeddedCollection("Item").filter(
        (i: RqgItem) =>
          i.data.type === ItemTypeEnum.Skill &&
          (i.data.data.category === SkillCategoryEnum.MeleeWeapons ||
            i.data.data.category === SkillCategoryEnum.Shields ||
            i.data.data.category === SkillCategoryEnum.NaturalWeapons)
      );
    } else {
      if (meleeWeaponData.skillOrigin) {
        const skill = (await fromUuid(meleeWeaponData.skillOrigin).catch(() => {
          logMisconfiguration(
            `Couldn't find melee weapon skill with uuid from skillOrigin ${meleeWeaponData.skillOrigin}`,
            true,
            meleeWeaponData
          );
        })) as Item<SkillItemData> | null;
        sheetSpecific.skillName = skill?.name || "";
      }
    }
    sheetSpecific.equippedStatuses = [...equippedStatuses];
    console.log("MELEEWEAPONSSHEET ", context);
    return context;
  }

  protected async _updateObject(event: Event, formData: any): Promise<any> {
    const combatManeuvers: any = [];
    Object.values(CombatManeuver).forEach((m) => {
      if (formData[`sheetSpecific.allCombatManeuvers.${m}.value`]) {
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

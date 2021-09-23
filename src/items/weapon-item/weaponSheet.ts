import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { CombatManeuver } from "../../data-model/item-data/weaponData";
import { SkillCategoryEnum } from "../../data-model/item-data/skillData";
import { RqgItem } from "../rqgItem";
import { equippedStatuses } from "../../data-model/item-data/IPhysicalItem";
import { RqgItemSheet } from "../RqgItemSheet";
import { assertItemType, logMisconfiguration } from "../../system/util";
import {
  WeaponDataProperties,
  WeaponDataPropertiesData,
} from "../../data-model/item-data/weaponData";

interface WeaponSheetData {
  isEmbedded: boolean;
  data: WeaponDataProperties; // Actually contains more...complete with effects, flags etc
  weaponData: WeaponDataPropertiesData;
  sheetSpecific: {
    allCombatManeuvers: string[];
    weaponSkills: any[];
    /** For showing the name of the linked skill if the item isn't owned */
    skillName: string;
    equippedStatuses: string[];
  };
}

export class WeaponSheet extends RqgItemSheet<ItemSheet.Options, WeaponSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Weapon],
      template: "systems/rqg/items/weapon-item/weaponSheet.html",
      width: 550,
      height: 750,
    });
  }

  async getData(): Promise<WeaponSheetData | ItemSheet.Data> {
    const itemData = this.document.data.toObject(false);
    assertItemType(itemData.type, ItemTypeEnum.Weapon);
    const weaponData = itemData.data;
    return {
      cssClass: this.isEditable ? "editable" : "locked",
      editable: this.isEditable,
      limited: this.document.limited,
      owner: this.document.isOwner,
      isEmbedded: this.document.isEmbedded,
      options: this.options,
      data: itemData,
      weaponData: weaponData,
      sheetSpecific: {
        allCombatManeuvers: this.getAllCombatManeuvers(weaponData),
        weaponSkills: this.getWeaponSkills(),
        skillName: await this.getSkillName(weaponData),
        equippedStatuses: [...equippedStatuses],
      },
    };
  }

  private getAllCombatManeuvers(weaponData: WeaponDataPropertiesData): any {
    return Object.values(CombatManeuver).reduce((acc: any, m: CombatManeuver) => {
      const v = weaponData.combatManeuvers.includes(m);
      acc[m] = { name: m, value: v };
      return acc;
    }, {});
  }

  private getWeaponSkills(): any {
    return this.item.isEmbedded && this.actor
      ? this.actor
          .getEmbeddedCollection("Item")
          .filter(
            (i) =>
              i.data.type === ItemTypeEnum.Skill &&
              (i.data.data.category === SkillCategoryEnum.MeleeWeapons ||
                i.data.data.category === SkillCategoryEnum.Shields ||
                i.data.data.category === SkillCategoryEnum.NaturalWeapons)
          )
      : [];
  }

  private async getSkillName(weaponData: WeaponDataPropertiesData): Promise<any> {
    if (!this.item.isEmbedded && weaponData.skillOrigin) {
      const skill = await fromUuid(weaponData.skillOrigin).catch(() => {
        logMisconfiguration(
          `Couldn't find weapon skill with uuid from skillOrigin ${weaponData.skillOrigin}`,
          true,
          weaponData
        );
      });
      return skill?.name ?? "";
    }
    return "";
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

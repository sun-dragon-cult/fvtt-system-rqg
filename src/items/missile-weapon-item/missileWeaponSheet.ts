import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { SkillCategoryEnum, SkillData, SkillItemData } from "../../data-model/item-data/skillData";
import { MissileWeaponData } from "../../data-model/item-data/missileWeaponData";
import { CombatManeuver } from "../../data-model/item-data/meleeWeaponData";
import { EquippedStatus, equippedStatuses } from "../../data-model/item-data/IPhysicalItem";
import { RqgItem } from "../rqgItem";
import { RqgItemSheet } from "../RqgItemSheet";
import { logMisconfiguration } from "../../system/util";

type MissileWeaponsSheetSpecificData = {
  allCombatManeuvers?: any;
  missileWeaponSkills?: RqgItem[];
  ownedProjectiles?: RqgItem[];
  /** For showing the name of the linked skill if the item isn't owned */
  skillName?: string;
  isOwned?: boolean;
  /** For sheet dropdown */
  equippedStatuses?: EquippedStatus[];
};
export class MissileWeaponSheet extends RqgItemSheet {
  static get defaultOptions(): BaseEntitySheet.Options {
    // @ts-ignore mergeObject
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.MissileWeapon],
      template: "systems/rqg/items/missile-weapon-item/missileWeaponSheet.html",
      width: 450,
      height: 600,
    });
  }

  async getData(): Promise<any> {
    const context = super.getData() as any;
    const missileWeaponData = (context.missileWeaponData = context.data.data) as MissileWeaponData;
    const sheetSpecific = (context.sheetSpecific = {} as MissileWeaponsSheetSpecificData);

    // TODO improve types
    sheetSpecific.allCombatManeuvers = Object.values(CombatManeuver).reduce((acc: any, m: any) => {
      const v = missileWeaponData.combatManeuvers.includes(m);
      acc[m] = { name: m, value: v };
      return acc;
    }, {});
    sheetSpecific.isOwned = this.item.isOwned;
    if (this.item.isOwned) {
      sheetSpecific.missileWeaponSkills = this.actor!.getEmbeddedCollection("OwnedItem").filter(
        (i: Item.Data<SkillData>) =>
          i.type === ItemTypeEnum.Skill && i.data.category === SkillCategoryEnum.MissileWeapons
      );

      sheetSpecific.ownedProjectiles = this.actor!.getEmbeddedCollection("OwnedItem").filter(
        (i: Item.Data<MissileWeaponData>) =>
          i.type === ItemTypeEnum.MissileWeapon && i.data.isProjectile
      );
    } else if (missileWeaponData.skillOrigin) {
      const skill = (await fromUuid(missileWeaponData.skillOrigin).catch(() => {
        logMisconfiguration(
          `Couldn't find missile weapon skill with uuid from skillOrigin ${missileWeaponData.skillOrigin}`,
          true,
          missileWeaponData
        );
      })) as Item<SkillItemData> | null;
      sheetSpecific.skillName = skill?.name || "";
    }
    sheetSpecific.equippedStatuses = [...equippedStatuses];
    return context;
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    const combatManeuvers: any = [];
    Object.values(CombatManeuver).forEach((m) => {
      if (formData[`sheetSpecific.allCombatManeuvers.${m}.value`]) {
        combatManeuvers.push(m);
      }
    });

    formData["data.combatManeuvers"] = combatManeuvers;
    Object.values(CombatManeuver).forEach(
      (cm) => delete formData[`sheetSpecific.allCombatManeuvers.${cm}.value`]
    );

    formData["data.physicalItemType"] = formData["data.isProjectile"] ? "consumable" : "unique";

    if (
      !formData["data.isProjectile"] &&
      !formData["data.isProjectileWeapon"] &&
      !formData["data.isThrownWeapon"]
    ) {
      formData["data.isProjectileWeapon"] = true;
    }

    if (formData["data.physicalItemType"] === "unique") {
      formData["data.quantity"] = 1;
    }

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
        item.data.data.category === SkillCategoryEnum.MissileWeapons
      ) {
        const skillId = item.uuid || "";
        await this.item.update({ "data.skillOrigin": skillId }, {});
      } else {
        ui.notifications?.warn("The item must be a missile weapon skill");
      }
    }
  }
}

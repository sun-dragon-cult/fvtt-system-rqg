import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { SkillCategoryEnum } from "../../data-model/item-data/skillData";
import { RqgItem } from "../rqgItem";
import { equippedStatuses } from "../../data-model/item-data/IPhysicalItem";
import { RqgItemSheet } from "../RqgItemSheet";
import { assertItemType, getRequiredDomDataset, logMisconfiguration } from "../../system/util";
import {
  damageType,
  WeaponDataProperties,
  WeaponDataPropertiesData,
} from "../../data-model/item-data/weaponData";

interface WeaponSheetData {
  isEmbedded: boolean;
  data: WeaponDataProperties; // Actually contains more...complete with effects, flags etc
  weaponData: WeaponDataPropertiesData;
  sheetSpecific: {
    defaultCombatManeuverNames: string[];
    damageTypes: string[];
    weaponSkills: any[];
    /** For showing the name of the linked skill if the item isn't owned */
    skillNames: any;
    equippedStatuses: string[];
    rateOfFire: { [label: string]: number };
    ownedProjectiles: RqgItem[];
  };
}

export class WeaponSheet extends RqgItemSheet<ItemSheet.Options, WeaponSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.Weapon],
      template: "systems/rqg/items/weapon-item/weaponSheet.html",
      width: 960,
      height: 800,
    });
  }

  async getData(): Promise<WeaponSheetData | ItemSheet.Data> {
    const itemData = this.document.data.toObject(false);
    assertItemType(itemData.type, ItemTypeEnum.Weapon);
    const weaponData = itemData.data;
    if (isNaN(Number(weaponData.quantity))) {
      weaponData.quantity = 1;
    }

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
        defaultCombatManeuverNames: Array.from(CONFIG.RQG.combatManeuvers.keys()),
        damageTypes: Object.values(damageType),
        weaponSkills: this.getWeaponSkills(),
        skillNames: await this.getSkillNames(),
        equippedStatuses: [...equippedStatuses],
        ownedProjectiles: this.getOwnedProjectiles(),
        rateOfFire: {
          "S/MR": 0,
          "1/MR": 1,
          "1/2MR": 2,
          "1/3MR": 3,
          "1/4MR": 4,
          "1/5MR": 5,
        },
      },
    };
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

  private async getSkillNames(): Promise<any> {
    if (!this.item.isEmbedded) {
      assertItemType(this.item.data.type, ItemTypeEnum.Weapon);
      return {
        oneHand: await this.getSkillName(this.item.data.data.usage.oneHand.skillOrigin),
        offHand: await this.getSkillName(this.item.data.data.usage.offHand.skillOrigin),
        twoHand: await this.getSkillName(this.item.data.data.usage.twoHand.skillOrigin),
        missile: await this.getSkillName(this.item.data.data.usage.missile.skillOrigin),
      };
    }
  }

  private async getSkillName(origin: string): Promise<string> {
    const skill = origin
      ? await fromUuid(origin).catch(() => {
          logMisconfiguration(`Couldn't find weapon skill with uuid`, true, this.item);
        })
      : null;
    return skill?.name ?? "";
  }

  private getOwnedProjectiles(): any {
    if (this.item.isOwned) {
      return this.actor!.getEmbeddedCollection("Item").filter(
        (i) => i.data.type === ItemTypeEnum.Weapon && i.data.data.isProjectile
      );
    }
    return [];
  }

  protected async _updateObject(event: Event, formData: any): Promise<any> {
    formData["data.usage.oneHand.combatManeuvers"] = this.getUsageCombatManeuvers(
      "oneHand",
      formData
    );
    formData["data.usage.offHand.combatManeuvers"] = this.getUsageCombatManeuvers(
      "offHand",
      formData
    );
    formData["data.usage.twoHand.combatManeuvers"] = this.getUsageCombatManeuvers(
      "twoHand",
      formData
    );
    formData["data.usage.missile.combatManeuvers"] = this.getUsageCombatManeuvers(
      "missile",
      formData
    );

    formData["data.rate"] = Number(formData["data.rate"]);

    formData["data.physicalItemType"] =
      formData["data.isProjectile"] || formData["data.isThrownWeapon"] ? "consumable" : "unique";

    if (formData["data.physicalItemType"] === "unique") {
      formData["data.quantity"] = 1;
    }

    // Non projectile weapons should not decrease any projectile quantity (remove link)
    if (!formData["data.isProjectileWeapon"] && !formData["data.isThrownWeapon"]) {
      formData["data.projectileId"] = "";
    }

    // Thrown weapons should decrease quantity of themselves
    if (formData["data.isThrownWeapon"]) {
      formData["data.projectileId"] = this.item.id;
    }

    return super._updateObject(event, formData);
  }

  private getUsageCombatManeuvers(usage: string, formData: any): any[] {
    const usageNames = formData[`data.usage.${usage}.combatManeuvers.name`];
    const usageCombatManueversNames = Array.isArray(usageNames) ? usageNames : [usageNames];

    const usageCombatManeuvers = usageCombatManueversNames.reduce((acc, name, i) => {
      if (name) {
        const dmgType = formData[`data.usage.${usage}.combatManeuvers.damageTypes`];
        const damageTypes = Array.isArray(dmgType) ? dmgType : [dmgType];
        const defaultDamageTypeDescription =
          CONFIG.RQG.combatManeuvers.get(name)?.specialDescriptionHtml;
        const damageType =
          damageTypes.length > i
            ? damageTypes[i]
            : CONFIG.RQG.combatManeuvers.get(name)?.defaultDamageType;

        const desc = formData[`data.usage.${usage}.combatManeuvers.description`];
        const descriptions = Array.isArray(desc) ? desc : [desc];
        const description = descriptions.length > i ? descriptions[i] : "";
        acc.push({
          name: name,
          damageType: damageType,
          description: description,
          placeholder:
            defaultDamageTypeDescription ??
            "Enter description of how this attack works, or get normal damage buttons (no special handling of critical success damage etc.)",
        });
      }
      return acc;
    }, []);

    return duplicate(usageCombatManeuvers);
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);
    if (!this.item.isOwned) {
      html[0].querySelectorAll<HTMLElement>("[data-dropzone]").forEach((elem) => {
        elem.addEventListener("drop", this._onDrop.bind(this));
        elem.addEventListener("dragover", (e) => {
          e.preventDefault();
          const dropzone = (e.target as HTMLElement)?.closest("[data-dropzone]");
          dropzone && dropzone.classList.add("drag-hover");
        });
        elem.addEventListener("dragenter", (e) => {
          e.preventDefault();
          const dropzone = (e.target as HTMLElement)?.closest("[data-dropzone]");
          dropzone && dropzone.classList.add("drag-hover");
        });
        elem.addEventListener("dragleave", (e) => {
          e.preventDefault();
          const dropzone = (e.target as HTMLElement)?.closest("[data-dropzone]");
          dropzone && dropzone.classList.remove("drag-hover");
        });
      });
    }
  }

  protected async _onDrop(event: DragEvent): Promise<void> {
    super._onDrop(event);
    const usage = getRequiredDomDataset(event, "dropzone");
    const dropzone = (event.target as HTMLElement)?.closest("[data-dropzone]");
    dropzone && dropzone.classList.remove("drag-hover");
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
          item.data.data.category === SkillCategoryEnum.MissileWeapons ||
          item.data.data.category === SkillCategoryEnum.NaturalWeapons ||
          item.data.data.category === SkillCategoryEnum.Shields)
      ) {
        const skillId = item.uuid || "";
        await this.item.update({ [`data.usage.${usage}.skillOrigin`]: skillId }, {});
      } else {
        ui.notifications?.warn(
          "The item must be a weapon skill (category melee, shield or natural weapon)"
        );
      }
    }
  }
}

import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { SkillCategoryEnum } from "../../data-model/item-data/skillData";
import { RqgItem } from "../rqgItem";
import { equippedStatuses } from "../../data-model/item-data/IPhysicalItem";
import { RqgItemSheet } from "../RqgItemSheet";
import { getDomDataset, getGameUser, localize } from "../../system/util";
import { damageType } from "../../data-model/item-data/weaponData";
import { systemId } from "../../system/config";
import { EffectsItemSheetData } from "../shared/sheetInterfaces";
import { getAllowedDropDocumentTypes, isAllowedDocumentType } from "../../documents/dragDrop";
import { documentRqidFlags } from "../../data-model/shared/rqgDocumentFlags";
import { RqidLink } from "../../data-model/shared/rqidLink";

interface WeaponSheetData {
  defaultCombatManeuverNames: string[];
  damageTypes: string[];
  weaponSkills: any[];
  /** For showing the name of the linked skill if the item isn't owned */
  skillNames: any;
  equippedStatuses: string[];
  rateOfFire: { [label: string]: number };
  ownedProjectiles: RqgItem[];
}

export class WeaponSheet extends RqgItemSheet<ItemSheet.Options, WeaponSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Weapon],
      template: "systems/rqg/items/weapon-item/weaponSheet.hbs",
      width: 960,
      height: 800,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "weapon",
        },
      ],
    });
  }

  async getData(): Promise<WeaponSheetData & EffectsItemSheetData> {
    // @ts-expect-error _source Read from the original data unaffected by any AEs
    const system = duplicate(this.document._source.system);

    if (isNaN(Number(system.quantity))) {
      system.quantity = 1;
    }

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isGM: getGameUser().isGM,
      isEmbedded: this.document.isEmbedded,
      isEditable: this.isEditable,
      system: system,
      effects: this.document.effects,
      // @ts-expect-error async
      enrichedDescription: await TextEditor.enrichHTML(system.description, { async: true }),
      // @ts-expect-error async
      enrichedGmNotes: await TextEditor.enrichHTML(system.gmNotes, { async: true }),
      defaultCombatManeuverNames: Array.from(CONFIG.RQG.combatManeuvers.keys()).map((cm) =>
        localize(`RQG.Item.Weapon.combatManeuver.${cm}`),
      ),
      damageTypes: Object.values(damageType),
      equippedStatuses: [...equippedStatuses],
      ownedProjectiles: this.getOwnedProjectiles(),
      rateOfFire: {
        [localize("RQG.Game.SrMeleeRoundAbbr")]: 0,
        [`1/${localize("RQG.Game.MeleeRoundAbbr")}`]: 1,
        [`1/2${localize("RQG.Game.MeleeRoundAbbr")}`]: 2,
        [`1/3${localize("RQG.Game.MeleeRoundAbbr")}`]: 3,
        [`1/4${localize("RQG.Game.MeleeRoundAbbr")}`]: 4,
        [`1/5${localize("RQG.Game.MeleeRoundAbbr")}`]: 5,
      },
    };
  }

  private getOwnedProjectiles(): any[] {
    if (this.item.isOwned) {
      return [
        [{ _id: "", name: "---" }],
        ...this.actor!.getEmbeddedCollection("Item").filter(
          // @ts-expect-error system
          (i) => i.type === ItemTypeEnum.Weapon && i.system.isProjectile,
        ),
      ];
    }
    return [];
  }

  protected async _updateObject(event: Event, formData: any): Promise<any> {
    formData["system.usage.oneHand.combatManeuvers"] = this.getUsageCombatManeuvers(
      "oneHand",
      formData,
    );
    formData["system.usage.offHand.combatManeuvers"] = this.getUsageCombatManeuvers(
      "offHand",
      formData,
    );
    formData["system.usage.twoHand.combatManeuvers"] = this.getUsageCombatManeuvers(
      "twoHand",
      formData,
    );
    formData["system.usage.missile.combatManeuvers"] = this.getUsageCombatManeuvers(
      "missile",
      formData,
    );

    this.copyOneHandData2offHand(formData);

    // Make sure only at most one of thrown / projectile & ranged weapon is selected
    if ((event.currentTarget as HTMLInputElement)?.name === "system.isThrownWeapon") {
      formData["system.isProjectileWeapon"] = false;
      formData["system.isRangedWeapon"] = false;
    } else if ((event.currentTarget as HTMLInputElement)?.name === "system.isProjectileWeapon") {
      formData["system.isThrownWeapon"] = false;
      formData["system.isRangedWeapon"] = false;
    } else if ((event.currentTarget as HTMLInputElement)?.name === "system.isRangedWeapon") {
      formData["system.isThrownWeapon"] = false;
      formData["system.isProjectileWeapon"] = false;
    }

    formData["system.rate"] = Number(formData["system.rate"]);

    formData["system.physicalItemType"] =
      formData["system.isProjectile"] || formData["system.isThrownWeapon"]
        ? "consumable"
        : "unique";

    if (formData["system.physicalItemType"] === "unique") {
      formData["system.quantity"] = 1;
    }

    // Non projectile weapons should not decrease any projectile quantity (remove link)
    if (!formData["system.isProjectileWeapon"] && !formData["system.isThrownWeapon"]) {
      formData["system.projectileId"] = "";
    }

    // Thrown weapons should decrease quantity of themselves
    if (formData["system.isThrownWeapon"]) {
      formData["system.projectileId"] = this.item.id;
    }

    if (formData["system.hitPointLocation"]) {
      formData["system.hitPoints.value"] = "";
      formData["system.hitPoints.max"] = "";
    }

    return super._updateObject(event, formData);
  }

  private copyOneHandData2offHand(formData: any): void {
    formData["system.usage.offHand.combatManeuvers"] =
      formData["system.usage.oneHand.combatManeuvers"];
    formData["system.usage.offHand.damage"] = formData["system.usage.oneHand.damage"];
    formData["system.usage.offHand.minStrength"] = formData["system.usage.oneHand.minStrength"];
    formData["system.usage.offHand.minDexterity"] = formData["system.usage.oneHand.minDexterity"];
    formData["system.usage.offHand.strikeRank"] = formData["system.usage.oneHand.strikeRank"];
  }

  private getUsageCombatManeuvers(usage: string, formData: any): any[] {
    const usageNames = formData[`system.usage.${usage}.combatManeuvers.name`];
    const usageCombatManueversNames = Array.isArray(usageNames) ? usageNames : [usageNames];

    const usageCombatManeuvers = usageCombatManueversNames.reduce((acc, name, i) => {
      if (name) {
        const dmgType =
          formData[`system.usage.${usage}.combatManeuvers.damageTypes`] ??
          CONFIG.RQG.combatManeuvers.get(name)?.defaultDamageType;

        const damageTypes = Array.isArray(dmgType) ? dmgType : [dmgType];
        const defaultDamageTypeDescription =
          CONFIG.RQG.combatManeuvers.get(name)?.specialDescriptionHtml;
        const damageType =
          damageTypes.length > i
            ? damageTypes[i]
            : CONFIG.RQG.combatManeuvers.get(name)?.defaultDamageType;

        const desc = formData[`system.usage.${usage}.combatManeuvers.description`];
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

  /**
   * Update the weapon skill link and if the weapon is embedded in an actor
   * embed the dropped skill items if the actor does not yet have it.
   */
  async _onDropItem(
    event: DragEvent,
    data: { type: string; uuid: string },
  ): Promise<boolean | RqgItem[]> {
    const allowedDropDocumentTypes = getAllowedDropDocumentTypes(event);
    // @ts-expect-error fromDropData
    const droppedItem = await Item.implementation.fromDropData(data);
    const usage = getDomDataset(event, "dropzone");

    if (!isAllowedDocumentType(droppedItem, allowedDropDocumentTypes)) {
      return false;
    }
    if (
      ![
        SkillCategoryEnum.MeleeWeapons,
        SkillCategoryEnum.MissileWeapons,
        SkillCategoryEnum.NaturalWeapons,
        SkillCategoryEnum.Shields,
      ].includes(droppedItem.system.category)
    ) {
      const msg = localize("RQG.Item.Weapon.WrongTypeDropped");
      // @ts-expect-error console
      ui.notifications?.warn(msg, { console: false });
      console.warn(`RQG | ${msg}`);
      return false;
    }
    const droppedItemRqid = droppedItem.getFlag(systemId, documentRqidFlags)?.id;
    const actorItemWithSameRqid = this.actor?.getBestEmbeddedDocumentByRqid(droppedItemRqid);

    if (!actorItemWithSameRqid) {
      await this.actor?.createEmbeddedDocuments("Item", [droppedItem]);
    }
    await this.item.update({
      [`system.usage.${usage}.skillRqidLink`]: new RqidLink(droppedItemRqid, droppedItem.name),
    });
    return [this.item];
  }
}

import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { SkillCategoryEnum } from "../../data-model/item-data/skillData";
import { RqgItem } from "../rqgItem";
import { equippedStatuses } from "../../data-model/item-data/IPhysicalItem";
import { RqgItemSheet } from "../RqgItemSheet";
import {
  assertItemType,
  getGameUser,
  getRequiredDomDataset,
  localize,
  uuid2Name,
} from "../../system/util";
import { damageType } from "../../data-model/item-data/weaponData";
import { Weapon } from "./weapon";
import { systemId } from "../../system/config";
import { EffectsItemSheetData } from "../shared/sheetInterfaces";

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
      dragDrop: [
        {
          dragSelector: ".item",
          dropSelector: "[data-dropzone]",
        },
      ],
      tabs: [
        { navSelector: ".item-sheet-nav-tabs", contentSelector: ".sheet-body", initial: "weapon" },
      ],
    });
  }

  async getData(): Promise<WeaponSheetData & EffectsItemSheetData> {
    const system = duplicate(this.document.system);

    if (isNaN(Number(system.quantity))) {
      system.quantity = 1;
    }

    return {
      id: this.document.id ?? "",
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
        localize(`RQG.Item.Weapon.combatManeuver.${cm}`)
      ),
      damageTypes: Object.values(damageType),
      weaponSkills: this.getWeaponSkills(),
      skillNames: this.getSkillNames(),
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
    };
  }

  private getWeaponSkills(): any {
    return this.item.isEmbedded && this.actor
      ? this.actor.getEmbeddedCollection("Item").filter(
          (i) =>
            // @ts-expect-error v10
            i.type === ItemTypeEnum.Skill &&
            // @ts-expect-error system
            (i.system.category === SkillCategoryEnum.MeleeWeapons ||
              // @ts-expect-error system
              i.system.category === SkillCategoryEnum.Shields ||
              // @ts-expect-error system
              i.system.category === SkillCategoryEnum.NaturalWeapons)
        )
      : [];
  }

  private getSkillNames(): any {
    assertItemType(this.item.type, ItemTypeEnum.Weapon);
    return {
      oneHand: this.getName(
        this.item.system.usage.oneHand.skillOrigin,
        this.item.system.usage.oneHand.skillId
      ),
      offHand: this.getName(
        this.item.system.usage.offHand.skillOrigin,
        this.item.system.usage.offHand.skillId
      ),
      twoHand: this.getName(
        this.item.system.usage.twoHand.skillOrigin,
        this.item.system.usage.twoHand.skillId
      ),
      missile: this.getName(
        this.item.system.usage.missile.skillOrigin,
        this.item.system.usage.missile.skillId
      ),
    };
  }

  private getOwnedProjectiles(): any[] {
    if (this.item.isOwned) {
      return [
        [{ _id: "", name: "---" }],
        ...this.actor!.getEmbeddedCollection("Item").filter(
          // @ts-expect-error system
          (i) => i.type === ItemTypeEnum.Weapon && i.system.isProjectile
        ),
      ];
    }
    return [];
  }

  // Look for item name first in uuid link then in embedded actor
  private getName(uuid: string, embeddedSkillId: string): string {
    const uuidName = uuid2Name(uuid);
    if (uuidName) {
      return uuidName;
    }
    const embeddedName = this.actor?.items.get(embeddedSkillId)?.name;
    if (embeddedName) {
      return `${embeddedName} (embedded)`;
    }
    return "";
  }

  protected async _updateObject(event: Event, formData: any): Promise<any> {
    formData["system.usage.oneHand.combatManeuvers"] = this.getUsageCombatManeuvers(
      "oneHand",
      formData
    );
    formData["system.usage.offHand.combatManeuvers"] = this.getUsageCombatManeuvers(
      "offHand",
      formData
    );
    formData["system.usage.twoHand.combatManeuvers"] = this.getUsageCombatManeuvers(
      "twoHand",
      formData
    );
    formData["system.usage.missile.combatManeuvers"] = this.getUsageCombatManeuvers(
      "missile",
      formData
    );

    this.copyOneHandData2offHand(formData);

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

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);

    const that = this;

    // Foundry doesn't provide dragenter & dragleave in its DragDrop handling
    html[0].querySelectorAll<HTMLElement>("[data-dropzone]").forEach((elem) => {
      elem.addEventListener("dragenter", that._onDragEnter);
      elem.addEventListener("dragleave", that._onDragLeave);
    });

    html[0].querySelectorAll<HTMLElement>("[data-delete-skill]").forEach((elem) => {
      elem.addEventListener("click", async () => {
        const use = getRequiredDomDataset(elem, "delete-skill");
        await this.item.update({ [`system.usage.${use}.skillOrigin`]: "" });
      });
    });
  }

  _onDragEnter(event: DragEvent): void {
    const dropZone = event.currentTarget as Element | null; // Target the event handler was attached to
    const relatedTarget = event.relatedTarget as Element | null; // EventTarget the pointer exited from

    if ((dropZone && dropZone === relatedTarget) || dropZone?.contains(relatedTarget)) {
      event.preventDefault();
      dropZone.classList.add("drag-hover");
    }
  }

  _onDragLeave(event: DragEvent): void {
    const dropZone = event.currentTarget as Element | null; // Target the event handler was attached to
    const relatedTarget = event.relatedTarget as Element | null; // EventTarget the pointer exited from
    // Workaround for Chrome bug https://bugs.chromium.org/p/chromium/issues/detail?id=68629
    const sameShadowDom = dropZone?.getRootNode() === relatedTarget?.getRootNode();
    if (sameShadowDom && !dropZone?.contains(relatedTarget)) {
      event.preventDefault();
      dropZone && dropZone.classList.remove("drag-hover");
    }
  }

  async _onDrop(event: DragEvent): Promise<void> {
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
      const droppedItem = (await Item.fromDropData(droppedItemData)) as RqgItem;
      if (
        droppedItem.type === ItemTypeEnum.Skill &&
        (droppedItem.system.category === SkillCategoryEnum.MeleeWeapons ||
          droppedItem.system.category === SkillCategoryEnum.MissileWeapons ||
          droppedItem.system.category === SkillCategoryEnum.NaturalWeapons ||
          droppedItem.system.category === SkillCategoryEnum.Shields)
      ) {
        const originSkillId = droppedItem.uuid || "";
        if (this.item.isOwned) {
          const weaponItem = this.item;
          assertItemType(weaponItem.type, ItemTypeEnum.Weapon);
          const embeddedSkillId = await Weapon.embedLinkedSkill("", originSkillId, this.actor!);
          await this.item.update({
            [`system.usage.${usage}.skillId`]: embeddedSkillId,
            [`system.usage.${usage}.skillOrigin`]: originSkillId,
          });
        } else {
          await this.item.update({
            [`system.usage.${usage}.skillOrigin`]: originSkillId,
          });
        }
      } else {
        ui.notifications?.warn(
          "The item must be a weapon skill (category melee, shield or natural weapon)"
        );
      }
    }
  }
}

import { SkillCategoryEnum, SkillData } from "../data-model/item-data/skillData";
import { HomeLandEnum, OccupationEnum } from "../data-model/actor-data/background";
import { RqgActorData } from "../data-model/actor-data/rqgActorData";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { HitLocationData } from "../data-model/item-data/hitLocationData";
import { HitLocationSheet } from "../items/hit-location-item/hitLocationSheet";
import { RqgItem } from "../items/rqgItem";
import { RuneData, RuneTypeEnum } from "../data-model/item-data/runeData";
import { skillMenuOptions } from "./context-menues/skill-context-menu";
import { combatMenuOptions } from "./context-menues/combat-context-menu";
import { hitLocationMenuOptions } from "./context-menues/health-context-menu";
import { passionMenuOptions } from "./context-menues/passion-context-menu";
import { gearMenuOptions } from "./context-menues/gear-context-menu";
import { spiritMagicMenuOptions } from "./context-menues/spirit-magic-context-menu";
import { cultMenuOptions } from "./context-menues/cult-context-menu";
import { runeMagicMenuOptions } from "./context-menues/rune-magic-context-menu";
import { runeMenuOptions } from "./context-menues/rune-context-menu";
import { equippedStatuses } from "../data-model/item-data/IPhysicalItem";
import { characteristicMenuOptions } from "./context-menues/characteristic-context-menu";
import { createItemLocationTree, LocationNode } from "../items/shared/locationNode";
import { CharacteristicCard } from "../chat/characteristicCard";
import { WeaponCard } from "../chat/weaponCard";
import { SpiritMagicCard } from "../chat/spiritMagicCard";
import { ItemCard } from "../chat/itemCard";
import { HealthEnum } from "../data-model/actor-data/attributes";
import { SpiritMagicData } from "../data-model/item-data/spiritMagicData";

// Data fed to handlebars renderer
type ActorSheetTemplate = {
  // Basic (Foundry) data
  cssClass: string;
  editable: boolean;
  limited: boolean;
  options: object;
  owner: boolean;
  title: string;

  // The actor and reorganised owned items
  rqgActorData: Actor.Data<RqgActorData>;
  ownedItems: any; // reorganized for presentation TODO type it better

  spiritCombatSkillData: Item.Data<SkillData>; // Find this skill to show on spirit combat part
  dodgeSkillData: Item.Data<SkillData>; // Find this skill to show on combat part

  // Lists for dropdown values
  occupations: Array<`${OccupationEnum}`>;
  homelands: Array<`${HomeLandEnum}`>;
  locations: Array<string>;

  // Other data needed for the sheet
  characterRunes: Array<string>; // Array of img urls to runes with > 0% chance
  loadedMissileSr: Array<string>; // (html) Precalculated missile weapon SRs if loaded at start of round
  unloadedMissileSr: Array<string>; // (html) Precalculated missile weapon SRs if not loaded at start of round
  itemLocationTree: LocationNode; // physical items reorganised as a tree of items containing items
  powCrystals: any; //  list of pow-crystals TODO type it better
  spiritMagicPointSum: number;
  freeInt: number;
  combinedHealth: HealthEnum; // a combination of total HP & attributes.health (extra damage effects)

  // UI toggles
  isGM: boolean;
  showUiSection: {
    health: boolean;
    combat: boolean;
    runes: boolean;
    spiritMagic: boolean;
    runeMagic: boolean;
    sorcery: boolean;
    skills: boolean;
    gear: boolean;
    passions: boolean;
    background: boolean;
    activeEffects: boolean;
  };
};

export class RqgActorSheet extends ActorSheet<RqgActorData> {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", "actor"],
      template: "systems/rqg/actors/rqgActorSheet.html",
      width: 550,
      height: 650,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "combat",
        },
        {
          navSelector: ".gear-tabs",
          contentSelector: ".gear-body",
          initial: "by-item-type",
        },
      ],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
    });
  }

  /* -------------------------------------------- */

  getData(): any {
    const isOwner: boolean = this.entity.owner;
    const spiritMagicPointSum = this.getSpiritMagicPointSum();
    const sheetData: ActorSheetTemplate = {
      cssClass: isOwner ? "editable" : "locked",
      editable: this.isEditable,
      limited: this.entity.limited,
      options: this.options,
      owner: isOwner,
      title: this.title,

      rqgActorData: duplicate(this.entity.data),
      ownedItems: this.organizeOwnedItems(),

      spiritCombatSkillData: this.getSkillDataByName("Spirit Combat"),
      dodgeSkillData: this.getSkillDataByName("Dodge"),

      characterRunes: this.getCharacterRuneImgs(), // Array of img urls to runes with > 0% chance
      loadedMissileSr: this.getLoadedMissileSr(), // (html) Precalculated missile weapon SRs if loaded at start of round
      unloadedMissileSr: this.getUnloadedMissileSr(), // (html) Precalculated missile weapon SRs if not loaded at start of round
      itemLocationTree: this.getItemLocationTree(), // physical items reorganised as a tree of items containing items
      powCrystals: this.getPowCrystals(),
      spiritMagicPointSum: spiritMagicPointSum,
      freeInt: this.getFreeInt(spiritMagicPointSum),
      combinedHealth: this.getCombinedHealth(),

      // Lists for dropdown values
      occupations: Object.values(OccupationEnum),
      homelands: Object.values(HomeLandEnum),
      locations: this.getPhysicalItemLocations(),

      // UI toggles
      isGM: game.user.isGM,
      showUiSection: this.getUiSectionVisibility(),
    };
    console.log("Actor SheetData", sheetData);
    return sheetData;
  }

  private getPhysicalItemLocations(): Array<string> {
    // Used for DataList input dropdown
    const physicalItems: RqgItem[] = this.actor.items.filter(
      (i: Item<any>) => i.data.data.physicalItemType
    );
    return [
      ...new Set([
        ...this.actor.items.filter((i: Item<any>) => i.data.data.isContainer).map((i) => i.name),
        ...physicalItems.map((i) => i.data.data.location),
      ]),
    ];
  }

  private getItemLocationTree(): LocationNode {
    const physicalItems: RqgItem[] = this.actor.items.filter(
      (i: Item<any>) => i.data.data.physicalItemType
    );
    return createItemLocationTree(physicalItems);
  }

  private getSpiritMagicPointSum(): number {
    return this.actor.items
      .filter((i) => i.type === ItemTypeEnum.SpiritMagic)
      .reduce((acc, m: Item<SpiritMagicData>) => acc + m.data.data.points, 0);
  }

  private getPowCrystals(): any {
    return (
      this.actor.effects &&
      this.actor.effects
        .filter((e) => e.data.changes.find((e) => e.key === "data.attributes.magicPoints.max"))
        .map((e: any) => {
          // TODO check typing
          return {
            name: e.label,
            size: e.changes
              .filter((c) => c.key === "data.attributes.magicPoints.max")
              .reduce((acc, c) => acc + c.value, 0),
          };
        })
    );
  }

  private getFreeInt(spiritMagicPointSum: number): number {
    return (
      this.actor.data.data.characteristics.intelligence.value -
      spiritMagicPointSum -
      this.actor.items.filter(
        (i: Item<SkillData>) =>
          i.type === ItemTypeEnum.Skill &&
          i.data.data.category === SkillCategoryEnum.Magic &&
          !!i.data.data.runes.length
      ).length
    );
  }

  private getCombinedHealth(): HealthEnum {
    const healthEffects = this.actor.data.data.attributes.health;
    const totalHitPoints = this.actor.data.data.attributes.hitPoints.value;

    if (totalHitPoints <= 0) {
      return HealthEnum.Dead;
    } else if (totalHitPoints <= 2) {
      return HealthEnum.Unconscious;
    } else if (
      totalHitPoints !== this.actor.data.data.attributes.hitPoints.max &&
      ![HealthEnum.Shock, HealthEnum.Unconscious].includes(healthEffects)
    ) {
      return HealthEnum.Wounded;
    } else if (totalHitPoints === this.actor.data.data.attributes.hitPoints.max) {
      return HealthEnum.Healthy;
    } else {
      return healthEffects;
    }

    // ![HealthEnum.Healthy, HealthEnum.Shock, HealthEnum.Unconscious].includes(healthEffects)
  }

  private getLoadedMissileSr(): Array<string> {
    const reloadIcon = CONFIG.RQG.missileWeaponReloadIcon;
    const loadedMissileSr = [
      ["1", reloadIcon, "5", reloadIcon, "10"],
      ["1", reloadIcon, "7", reloadIcon],
      ["2", reloadIcon, "9"],
      ["3", reloadIcon, "11"],
      ["4", reloadIcon],
      ["5", reloadIcon],
    ];
    return loadedMissileSr[this.actor.data.data.attributes.dexStrikeRank];
  }

  private getUnloadedMissileSr(): Array<string> {
    const reloadIcon = CONFIG.RQG.missileWeaponReloadIcon;
    const unloadedMissileSr = [
      [reloadIcon, "5", reloadIcon, "10"],
      [reloadIcon, "6", reloadIcon, "12"],
      [reloadIcon, "7", reloadIcon],
      [reloadIcon, "8"],
      [reloadIcon, "9"],
      [reloadIcon, "10"],
    ];
    return unloadedMissileSr[this.actor.data.data.attributes.dexStrikeRank];
  }

  private getCharacterRuneImgs(): Array<string> {
    return this.actor.items
      .filter(
        (i: Item<RuneData>) =>
          i.data.type === ItemTypeEnum.Rune &&
          i.data.data.runeType === RuneTypeEnum.Element &&
          !!i.data.data.chance
      )
      .sort((a: Item<RuneData>, b: Item<RuneData>) => b.data.data.chance - a.data.data.chance)
      .map((r) => r.img);
  }

  private getSkillDataByName(name: String): Item.Data<SkillData> {
    const skillItem = this.actor.items.find(
      (i: Item<SkillData>) => i.data.name === name && i.type === ItemTypeEnum.Skill
    ) as Item<SkillData>;
    return skillItem?.data;
  }

  /**
   * Take the owned items of the actor and rearrange them for presentation.
   * returns something like this {armor: [RqgItem], elementalRune: [RqgItem], ... }
   * @private
   */
  private organizeOwnedItems(): any {
    const itemTypes = Object.fromEntries(game.system.entityTypes.Item.map((t) => [t, []]));
    this.actor.items.forEach((item: RqgItem) => {
      itemTypes[item.type].push(item);
    });

    // Separate skills into skill categories {agility: [RqgItem], communication: [RqgItem], ... }
    const skills = {};
    Object.values(SkillCategoryEnum).forEach((cat: string) => {
      skills[cat] = itemTypes[ItemTypeEnum.Skill].filter(
        (s: RqgItem<SkillData>) => cat === s.data.data.category
      );
    });
    // Sort the skills inside each category
    Object.values(skills).forEach((skillList) =>
      (skillList as RqgItem[]).sort((a: RqgItem<SkillData>, b: RqgItem<SkillData>) =>
        ("" + a.data.name).localeCompare(b.data.name)
      )
    );
    itemTypes[ItemTypeEnum.Skill] = skills;

    // Separate runes into types (elemental, power, form, technique)
    const runes = {};
    Object.values(RuneTypeEnum).forEach((type: string) => {
      runes[type] = itemTypes[ItemTypeEnum.Rune].filter(
        (r: RqgItem<RuneData>) => type === r.data.data.runeType
      );
    });
    itemTypes[ItemTypeEnum.Rune] = runes;

    // Organise powerRunes as { fertility: RqgItem, death: RqgItem, ... }
    itemTypes[ItemTypeEnum.Rune][RuneTypeEnum.Power] = {
      ...itemTypes[ItemTypeEnum.Rune][RuneTypeEnum.Power].reduce((acc, item: RqgItem) => {
        acc[item.data.data.rune] = item;
        return acc;
      }, []),
    };

    // Organise formRunes as { man: RqgItem, beast: RqgItem, ... }
    itemTypes[ItemTypeEnum.Rune][RuneTypeEnum.Form] = {
      ...itemTypes[ItemTypeEnum.Rune][RuneTypeEnum.Form].reduce((acc, item: RqgItem) => {
        acc[item.data.data.rune] = item;
        return acc;
      }, []),
    };

    // Sort the hit locations
    itemTypes[ItemTypeEnum.HitLocation].sort(
      (a: RqgItem<HitLocationData>, b: RqgItem<HitLocationData>) =>
        b.data.data.dieFrom - a.data.data.dieFrom
    );

    return itemTypes;
  }

  private getUiSectionVisibility() {
    return {
      health:
        CONFIG.RQG.debug.showAllUiSections ||
        !!this.actor.items.filter((i) => i.type === ItemTypeEnum.HitLocation).length,
      combat:
        CONFIG.RQG.debug.showAllUiSections ||
        !!this.actor.items.filter((i) =>
          [ItemTypeEnum.MeleeWeapon, ItemTypeEnum.MissileWeapon].includes(ItemTypeEnum[i.type])
        ).length,
      runes:
        CONFIG.RQG.debug.showAllUiSections ||
        !!this.actor.items.filter((i) => i.type === ItemTypeEnum.Rune).length,
      spiritMagic:
        CONFIG.RQG.debug.showAllUiSections ||
        !!this.actor.items.filter((i) => i.type === ItemTypeEnum.SpiritMagic).length,
      runeMagic:
        CONFIG.RQG.debug.showAllUiSections ||
        !!this.actor.items.filter((i) =>
          [ItemTypeEnum.Cult, ItemTypeEnum.RuneMagic].includes(ItemTypeEnum[i.type])
        ).length,
      sorcery:
        CONFIG.RQG.debug.showAllUiSections ||
        !!this.actor.items.filter(
          (i: Item<RuneData>) => i.type === ItemTypeEnum.Rune && i.data.data.isMastered
        ).length,
      skills:
        CONFIG.RQG.debug.showAllUiSections ||
        !!this.actor.items.filter((i) => i.type === ItemTypeEnum.Skill).length,
      gear:
        CONFIG.RQG.debug.showAllUiSections ||
        !!this.actor.items.filter((i) =>
          [
            ItemTypeEnum.Gear,
            ItemTypeEnum.MeleeWeapon,
            ItemTypeEnum.MissileWeapon,
            ItemTypeEnum.Armor,
          ].includes(ItemTypeEnum[i.type])
        ).length,
      passions:
        CONFIG.RQG.debug.showAllUiSections ||
        !!this.actor.items.filter((i) => i.type === ItemTypeEnum.Passion).length,
      background: true,
      activeEffects: CONFIG.RQG.debug.showActorActiveEffectsTab && game.user.isGM,
    };
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

    if (!this.actor.owner) {
      // Only owners are allowed to interact
      return;
    }

    new ContextMenu(html, ".characteristic-contextmenu", characteristicMenuOptions(this.actor));
    new ContextMenu(html, ".combat-contextmenu", combatMenuOptions(this.actor));
    new ContextMenu(html, ".hit-location-contextmenu", hitLocationMenuOptions(this.actor));
    new ContextMenu(html, ".rune-contextmenu", runeMenuOptions(this.actor));
    new ContextMenu(html, ".spirit-magic-contextmenu", spiritMagicMenuOptions(this.actor));
    new ContextMenu(html, ".cult-contextmenu", cultMenuOptions(this.actor));
    new ContextMenu(html, ".rune-magic-contextmenu", runeMagicMenuOptions(this.actor));
    new ContextMenu(html, ".skill-contextmenu", skillMenuOptions(this.actor));
    new ContextMenu(html, ".gear-contextmenu", gearMenuOptions(this.actor));
    new ContextMenu(html, ".passion-contextmenu", passionMenuOptions(this.actor));

    // Use attributes data-item-edit, data-item-delete & data-item-roll to specify what should be clicked to perform the action
    // Set data-item-edit=actor.items._id on the same or an outer element to specify what item the action should be performed on.

    // Roll Characteristic
    (this.form as HTMLElement).querySelectorAll("[data-characteristic-roll]").forEach((el) => {
      const characteristic = (el.closest("[data-characteristic]") as HTMLElement).dataset
        .characteristic;

      let clickCount = 0;

      el.addEventListener("click", async (ev: MouseEvent) => {
        clickCount = Math.max(clickCount, ev.detail);

        if (clickCount >= 2) {
          await CharacteristicCard.roll(
            this.actor as any,
            characteristic,
            this.actor.data.data.characteristics[characteristic].value,
            5,
            0
          );
          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await CharacteristicCard.show(this.actor as any, {
                name: characteristic,
                data: this.actor.data.data.characteristics[characteristic],
              });
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Roll against Item Ability Chance
    (this.form as HTMLElement).querySelectorAll("[data-item-roll]").forEach((el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      const item: Item = this.actor.items.get(itemId);

      let clickCount = 0;

      el.addEventListener("click", async (ev: MouseEvent) => {
        clickCount = Math.max(clickCount, ev.detail);

        if (clickCount >= 2) {
          await ItemCard.roll(this.actor as any, item.data, 0);
          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await ItemCard.show(this.actor as any, itemId);
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Roll Spirit Magic
    (this.form as HTMLElement).querySelectorAll("[data-spirit-magic-roll]").forEach((el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      const item = this.actor.items.get(itemId) as Item<SpiritMagicData>;

      let clickCount = 0;

      el.addEventListener("click", async (ev: MouseEvent) => {
        clickCount = Math.max(clickCount, ev.detail);

        if (clickCount >= 2) {
          if (item.data.data.isVariable && item.data.data.points > 1) {
            await SpiritMagicCard.show(this.actor as any, itemId);
          } else {
            await SpiritMagicCard.roll(this.actor as any, item.data, item.data.data.points, 0);
          }

          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await SpiritMagicCard.show(this.actor as any, itemId);
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Show Weapon Chat Card
    (this.form as HTMLElement).querySelectorAll("[data-weapon-roll]").forEach((el) => {
      const weaponItemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      const skillItemId = (el.closest("[data-skill-id]") as HTMLElement).dataset.skillId;

      let clickCount = 0;

      el.addEventListener("click", async (ev: MouseEvent) => {
        clickCount = Math.max(clickCount, ev.detail);

        if (clickCount >= 2) {
          // Ignore double clicks by doing the same as on single click
          await WeaponCard.show(this.actor as any, skillItemId, weaponItemId);
          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await WeaponCard.show(this.actor as any, skillItemId, weaponItemId);
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Open Linked Journal Entry
    (this.form as HTMLElement).querySelectorAll("[data-journal-id]").forEach((el: HTMLElement) => {
      const pack = el.dataset.journalPack;
      const id = el.dataset.journalId;
      el.addEventListener("click", () => RqgActorSheet.showJournalEntry(id, pack));
    });

    // Edit Item (open the item sheet)
    (this.form as HTMLElement).querySelectorAll("[data-item-edit]").forEach((el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      el.addEventListener("click", () => this.actor.getOwnedItem(itemId).sheet.render(true));
    });

    // Delete Item (remove item from actor)
    (this.form as HTMLElement).querySelectorAll("[data-item-delete]").forEach((el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      el.addEventListener("click", () => RqgActorSheet.confirmItemDelete(this.actor, itemId));
    });

    // Cycle the equipped state of a physical Item
    (this.form as HTMLElement).querySelectorAll("[data-item-equipped-toggle]").forEach((el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      el.addEventListener("click", async () => {
        const item = this.actor.getOwnedItem(itemId) as Item<any>;
        const newStatus =
          equippedStatuses[
            (equippedStatuses.indexOf(item.data.data.equippedStatus) + 1) % equippedStatuses.length
          ];
        // Will trigger a Actor#_onModifyEmbeddedEntity that will update the other physical items in the same location tree
        await item.update({ "data.equippedStatus": newStatus }, {});
      });
    });

    // Edit item value
    (this.form as HTMLElement).querySelectorAll("[data-item-edit-value]").forEach((el) => {
      const path = (el as HTMLElement).dataset.itemEditValue;
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      el.addEventListener("change", async (event) => {
        const item = this.actor.getOwnedItem(itemId);
        await item.update({ [path]: (event.target as HTMLInputElement).value }, {});
      });
    });

    // Add wound to hit location TODO move listener to hitlocation
    (this.form as HTMLElement).querySelectorAll("[data-item-add-wound]").forEach((el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      el.addEventListener("click", () => HitLocationSheet.showAddWoundDialog(this.actor as any, itemId));
    });

    // Edit wounds to hit location TODO move listener to hitlocation
    (this.form as HTMLElement).querySelectorAll("[data-item-edit-wounds]").forEach((el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      el.addEventListener("click", () => HitLocationSheet.showHealWoundDialog(this.actor as any, itemId));
    });

    // Edit Actor Active Effect
    (this.form as HTMLElement).querySelectorAll("[data-actor-effect-edit]").forEach((el) => {
      const effectId = (el.closest("[data-effect-id]") as HTMLElement).dataset.effectId;
      el.addEventListener("click", () =>
        new ActiveEffectConfig(this.actor.effects.get(effectId)).render(true)
      );
    });
  }

  static confirmItemDelete(actor, itemId): void {
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

  // TODO Move somewhere else!
  static async showJournalEntry(id: string, packName?: string): Promise<void> {
    let entity;

    // Compendium Link
    if (packName) {
      const pack = game.packs.get(packName);
      entity = id ? await pack.getEntity(id) : null;

      // World Entity Link
    } else {
      const cls = CONFIG.JournalEntry.entityClass;
      entity = cls.collection.get(id);
    }

    entity && entity.sheet.render(true);
  }
}

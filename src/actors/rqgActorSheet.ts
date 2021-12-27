import { SkillCategoryEnum, SkillDataProperties } from "../data-model/item-data/skillData";
import { HomeLandEnum, OccupationEnum } from "../data-model/actor-data/background";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { HitLocationSheet } from "../items/hit-location-item/hitLocationSheet";
import { RqgItem } from "../items/rqgItem";
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
import { createItemLocationTree, LocationNode } from "./item-specific/shared/locationNode";
import { CharacteristicCard } from "../chat/characteristicCard";
import { WeaponCard } from "../chat/weaponCard";
import { SpiritMagicCard } from "../chat/spiritMagicCard";
import { ItemCard } from "../chat/itemCard";
import { Characteristics } from "../data-model/actor-data/characteristics";
import { RqgActor } from "./rqgActor";
import {
  assertActorType,
  assertItemType,
  getDocumentTypes,
  getDomDataset,
  getGame,
  getGameUser,
  getRequiredDomDataset,
  hasOwnProperty,
  requireValue,
  RqgError,
  usersThatOwnActor,
} from "../system/util";
import { RuneDataSource, RuneTypeEnum } from "../data-model/item-data/runeData";
import { DamageCalculations } from "../system/damageCalculations";
import { actorHealthStatuses, LocomotionEnum } from "../data-model/actor-data/attributes";
import { RqgToken } from "../combat/rqgToken";
import {
  ActorTypeEnum,
  CharacterDataProperties,
  CharacterDataPropertiesData,
} from "../data-model/actor-data/rqgActorData";
import { ItemDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";
import { RuneMagicCard } from "../chat/runeMagicCard";

interface UiSections {
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
}

interface CharacterSheetData {
  data: CharacterDataProperties;
  characterData: CharacterDataPropertiesData;

  // sheetSpecific { ... TODO organize as in itemSheets with sheetSpecific & data + characterData (data = current Characterdata)
  tokenId?: string;
  /** reorganized for presentation TODO type it better */
  ownedItems: any;

  /** Find this skill to show on spirit combat part */
  spiritCombatSkillData: SkillDataProperties | undefined;
  /** Find this skill to show on combat part */
  dodgeSkillData: SkillDataProperties | undefined;

  // Lists for dropdown values
  occupations: `${OccupationEnum}`[];
  homelands: `${HomeLandEnum}`[];
  locations: string[];
  healthStatuses: typeof actorHealthStatuses;

  // Other data needed for the sheet
  /** Array of element runes with > 0% chance */
  characterElementRunes: RuneDataSource[];
  characterPowerRunes: RuneDataSource[];
  characterFormRunes: RuneDataSource[];
  /** (html) Precalculated missile weapon SRs if loaded at start of round */
  loadedMissileSr: string[];
  /** (html) Precalculated missile weapon SRs if not loaded at start of round */
  unloadedMissileSr: string[];
  /** physical items reorganised as a tree of items containing items */
  itemLocationTree: LocationNode;
  /** list of pow-crystals */
  powCrystals: { name: string; size: number }[];
  spiritMagicPointSum: number;
  freeInt: number;
  baseStrikeRank: number | undefined;

  locomotionModes: { [a: string]: string };

  // UI toggles
  isGM: boolean;
  isPC: boolean;
  showUiSection: UiSections;
}

// Half prepared for introducing more actor types. this would then be split into CharacterSheet & RqgActorSheet
export class RqgActorSheet extends ActorSheet<
  ActorSheet.Options,
  CharacterSheetData | ActorSheet.Data
> {
  get title(): string {
    const linked = this.actor.data.token.actorLink;
    const isToken = this.actor.isToken;

    let prefix = "";
    if (!linked) {
      prefix = isToken ? "[Token] " : "[Prototype] ";
    }
    const speakerName = isToken ? this.actor.token!.data.name : this.actor.data.token.name;
    const postfix = isToken ? ` (${this.actor.data.token.name})` : "";

    return prefix + speakerName + postfix;
  }

  static get defaultOptions(): ActorSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ActorTypeEnum.Character],
      template: "systems/rqg/actors/rqgActorSheet.hbs",
      width: 800,
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

  getData(): CharacterSheetData | ActorSheet.Data {
    const actorData = this.document.data.toObject(false);
    assertActorType(actorData.type, ActorTypeEnum.Character);

    const isOwner: boolean = this.document.isOwner;
    const spiritMagicPointSum = this.getSpiritMagicPointSum();
    const dexStrikeRank = actorData.data.attributes.dexStrikeRank;

    return {
      cssClass: isOwner ? "editable" : "locked",
      editable: this.isEditable,
      limited: this.document.limited,
      options: this.options,
      owner: isOwner,
      title: this.title,

      data: actorData,
      characterData: actorData.data,

      // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
      tokenId: this.token?.id, // TODO check if different from actorData.token.id - if not the use data
      ownedItems: this.organizeOwnedItems(),

      spiritCombatSkillData: this.getSkillDataByName(CONFIG.RQG.skillName.spiritCombat),
      dodgeSkillData: this.getSkillDataByName(CONFIG.RQG.skillName.dodge),

      characterElementRunes: this.getCharacterElementRuneImgs(), // Sorted array of element runes with > 0% chance
      characterPowerRunes: this.getCharacterPowerRuneImgs(), // Sorted array of power runes with > 50% chance
      characterFormRunes: this.getCharacterFormRuneImgs(), // Sorted array of form runes that define the character
      loadedMissileSr: this.getLoadedMissileSr(dexStrikeRank), // (html) Precalculated missile weapon SRs if loaded at start of round
      unloadedMissileSr: this.getUnloadedMissileSr(dexStrikeRank), // (html) Precalculated missile weapon SRs if not loaded at start of round
      itemLocationTree: createItemLocationTree(this.actor.items.toObject()), // physical items reorganised as a tree of items containing items
      powCrystals: this.getPowCrystals(),
      spiritMagicPointSum: spiritMagicPointSum,
      freeInt: this.getFreeInt(spiritMagicPointSum),
      baseStrikeRank: this.getBaseStrikeRank(
        dexStrikeRank,
        actorData.data.attributes.sizStrikeRank
      ),

      // Lists for dropdown values
      occupations: Object.values(OccupationEnum),
      homelands: Object.values(HomeLandEnum),
      locations: this.getPhysicalItemLocations(),
      healthStatuses: [...actorHealthStatuses],
      locomotionModes: {
        [LocomotionEnum.Walk]: "Walk",
        [LocomotionEnum.Swim]: "Swim",
        [LocomotionEnum.Fly]: "Fly",
      },

      // UI toggles
      isGM: getGameUser().isGM,
      isPC: this.actor.hasPlayerOwner,
      showUiSection: this.getUiSectionVisibility(),
    };
  }

  private getPhysicalItemLocations(): string[] {
    // Used for DataList input dropdown
    const physicalItems: RqgItem[] = this.actor.items.filter((i: RqgItem) =>
      hasOwnProperty(i.data.data, "physicalItemType")
    );
    return [
      ...new Set([
        // Make a unique list of names of container items and "free text" locations
        ...this.actor.items.reduce((acc: string[], i: RqgItem) => {
          if (hasOwnProperty(i.data.data, "isContainer") && i.data.data.isContainer && i.name) {
            acc.push(i.name);
          }
          return acc;
        }, []),
        ...physicalItems.map((i: RqgItem) => (i.data.data as any).location ?? ""),
      ]),
    ];
  }

  private getSpiritMagicPointSum(): number {
    return this.actor.items.reduce((acc: number, item: RqgItem) => {
      if (item.data.type === ItemTypeEnum.SpiritMagic && !item.data.data.isMatrix) {
        return acc + item.data.data.points;
      } else {
        return acc;
      }
    }, 0);
  }

  private getPowCrystals(): { name: string; size: number }[] {
    return (
      this.actor.effects &&
      this.actor.effects
        .filter(
          (e) =>
            e.data.changes.find((e) => e.key === "data.attributes.magicPoints.max") !== undefined
        )
        .map((e) => {
          return {
            name: e.data.label,
            size: e.data.changes
              .filter((c: any) => c.key === "data.attributes.magicPoints.max")
              .reduce((acc: number, c: any) => acc + Number(c.value), 0),
          };
        })
    );
  }

  private getFreeInt(spiritMagicPointSum: number): number {
    return (
      this.actor.data.data.characteristics.intelligence.value -
      spiritMagicPointSum -
      this.actor.items.filter(
        (i: RqgItem) =>
          i.data.type === ItemTypeEnum.Skill &&
          i.data.data.category === SkillCategoryEnum.Magic &&
          !!i.data.data.runes.length
      ).length
    );
  }

  private getLoadedMissileSr(dexSr: number | undefined): string[] {
    const reloadIcon = CONFIG.RQG.missileWeaponReloadIcon;
    const loadedMissileSr = [
      ["1", reloadIcon, "5", reloadIcon, "10"],
      ["1", reloadIcon, "7", reloadIcon],
      ["2", reloadIcon, "9"],
      ["3", reloadIcon, "11"],
      ["4", reloadIcon],
      ["5", reloadIcon],
    ];
    return dexSr ? loadedMissileSr[dexSr] : [];
  }

  private getUnloadedMissileSr(dexSr: number | undefined): string[] {
    const reloadIcon = CONFIG.RQG.missileWeaponReloadIcon;
    const unloadedMissileSr = [
      [reloadIcon, "5", reloadIcon, "10"],
      [reloadIcon, "6", reloadIcon, "12"],
      [reloadIcon, "7", reloadIcon],
      [reloadIcon, "8"],
      [reloadIcon, "9"],
      [reloadIcon, "10"],
    ];
    return dexSr ? unloadedMissileSr[dexSr] : [];
  }

  private getBaseStrikeRank(
    dexStrikeRank: number | undefined,
    sizStrikeRank: number | undefined
  ): number | undefined {
    if (dexStrikeRank == null && sizStrikeRank == null) {
      return undefined;
    }

    return [dexStrikeRank, sizStrikeRank].reduce(
      (acc: number, value: number | undefined) => (Number(value) ? acc + Number(value) : acc),
      0
    );
  }

  private getCharacterElementRuneImgs(): RuneDataSource[] {
    return this.actor.items
      .reduce((acc: RuneDataSource[], i: RqgItem) => {
        if (
          i.data.type === ItemTypeEnum.Rune &&
          i.data.data.runeType === RuneTypeEnum.Element &&
          !!i.data.data.chance
        ) {
          acc.push(i.data);
        }
        return acc;
      }, [])
      .sort((a: RuneDataSource, b: RuneDataSource) => b.data.chance - a.data.chance);
  }

  private getCharacterPowerRuneImgs(): RuneDataSource[] {
    return this.actor.items
      .reduce((acc: RuneDataSource[], i: RqgItem) => {
        if (
          i.data.type === ItemTypeEnum.Rune &&
          i.data.data.runeType === RuneTypeEnum.Power &&
          i.data.data.chance > 50
        ) {
          acc.push(i.data);
        }
        return acc;
      }, [])
      .sort((a: RuneDataSource, b: RuneDataSource) => b.data.chance - a.data.chance);
  }

  private getCharacterFormRuneImgs(): RuneDataSource[] {
    return this.actor.items
      .reduce((acc: RuneDataSource[], i: RqgItem) => {
        if (
          i.data.type === ItemTypeEnum.Rune &&
          i.data.data.runeType === RuneTypeEnum.Form &&
          (!i.data.data.opposingRune || i.data.data.chance > 50)
        ) {
          acc.push(i.data);
        }
        return acc;
      }, [])
      .sort((a: RuneDataSource, b: RuneDataSource) => b.data.chance - a.data.chance);
  }

  private getSkillDataByName(name: String): SkillDataProperties | undefined {
    const skillItem = this.actor.items.find(
      (i: RqgItem) => i.data.name === name && i.type === ItemTypeEnum.Skill
    );

    if (!skillItem) {
      return;
    }
    assertItemType(skillItem.data.type, ItemTypeEnum.Skill);
    return skillItem.data;
  }

  /**
   * Take the owned items of the actor and rearrange them for presentation.
   * returns something like this {armor: [RqgItem], elementalRune: [RqgItem], ... }
   * TODO Fix the typing
   */
  private organizeOwnedItems(): any {
    const itemTypes: any = Object.fromEntries(getDocumentTypes().Item.map((t: string) => [t, []]));
    this.actor.items.forEach((item) => {
      itemTypes[item.type].push(item);
    });

    // Separate skills into skill categories {agility: [RqgItem], communication: [RqgItem], ... }
    const skills: any = {};
    Object.values(SkillCategoryEnum).forEach((cat: string) => {
      skills[cat] = itemTypes[ItemTypeEnum.Skill].filter((s: any) => cat === s.data.data.category);
    });
    // Sort the skills inside each category
    Object.values(skills).forEach((skillList) =>
      (skillList as RqgItem[]).sort((a: RqgItem, b: RqgItem) =>
        ("" + a.data.name).localeCompare(b.data.name)
      )
    );
    itemTypes[ItemTypeEnum.Skill] = skills;

    // Separate runes into types (elemental, power, form, technique)
    const runes: any = {};
    Object.values(RuneTypeEnum).forEach((type: string) => {
      runes[type] = itemTypes[ItemTypeEnum.Rune].filter((r: any) => type === r.data.data.runeType);
    });
    itemTypes[ItemTypeEnum.Rune] = runes;

    // Organise powerRunes as { fertility: RqgItem, death: RqgItem, ... }
    itemTypes[ItemTypeEnum.Rune][RuneTypeEnum.Power] = {
      ...itemTypes[ItemTypeEnum.Rune][RuneTypeEnum.Power].reduce((acc: any, item: Item) => {
        assertItemType(item.data.type, ItemTypeEnum.Rune);
        acc[item.data.data.rune] = item;
        return acc;
      }, []),
    };

    // Organise formRunes as { man: RqgItem, beast: RqgItem, ... }
    itemTypes[ItemTypeEnum.Rune][RuneTypeEnum.Form] = {
      ...itemTypes[ItemTypeEnum.Rune][RuneTypeEnum.Form].reduce((acc: any, item: Item) => {
        assertItemType(item.data.type, ItemTypeEnum.Rune);
        acc[item.data.data.rune] = item;
        return acc;
      }, []),
    };

    // Sort the hit locations
    itemTypes[ItemTypeEnum.HitLocation].sort(
      (a: any, b: any) => b.data.data.dieFrom - a.data.data.dieFrom
    );

    //@ts-ignore
    itemTypes[ItemTypeEnum.Weapon].forEach((weapon) => {
      assertItemType(weapon.data.type, ItemTypeEnum.Weapon);

      let usages = weapon.data.data.usage;
      let actorStr = this.actor.data.data.characteristics.strength.value;
      let actorDex = this.actor.data.data.characteristics.dexterity.value;
      for (const key in usages) {
        let usage = usages[key];
        if (usage.skillId) {
          usage.unusable = false;
          usage.underMinSTR = false;
          usage.underMinDEX = false;
          if (actorStr < usage.minStrength) {
            usage.underMinSTR = true;
          }
          if (actorDex < usage.minDexterity) {
            usage.underMinDEX = true;
          }
          if (usage.underMinSTR) {
            usage.unusable = true;
          }
          if (usage.underMinDEX) {
            // STR can compensate for being under DEX min on 2 for 1 basis
            let deficiency = usage.minDexterity - actorDex;
            let strover = Math.floor((actorStr - usage.minStrength) / 2);
            if (usage.minStrength === null) {
              usage.unusable = true;
            } else if (deficiency > strover) {
              usage.unusable = true;
            } else {
              // Character has enough STR to compensate for being below DEX min
              usage.unusable = false;
            }
          }
        }
      }
    });

    return itemTypes;
  }

  private getUiSectionVisibility(): UiSections {
    return {
      health:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some((i: RqgItem) => i.type === ItemTypeEnum.HitLocation),
      combat:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some(
          (i: RqgItem) => i.name === CONFIG.RQG.skillName.dodge || i.type === ItemTypeEnum.Weapon
        ),
      runes:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some((i: RqgItem) => i.type === ItemTypeEnum.Rune),
      spiritMagic:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some((i: RqgItem) => i.type === ItemTypeEnum.SpiritMagic),
      runeMagic:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some((i: RqgItem) =>
          [ItemTypeEnum.Cult, ItemTypeEnum.RuneMagic].includes(i.type)
        ),
      sorcery:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some(
          (i: RqgItem) =>
            i.data.type === ItemTypeEnum.Rune &&
            (i.data.data.isMastered || i.data.data.runeType === RuneTypeEnum.Technique)
        ),
      skills:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some((i: RqgItem) => i.type === ItemTypeEnum.Skill),
      gear:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some((i: RqgItem) =>
          [ItemTypeEnum.Gear, ItemTypeEnum.Weapon, ItemTypeEnum.Armor].includes(i.type)
        ),
      passions:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some((i: RqgItem) => i.type === ItemTypeEnum.Passion),
      background: true,
      activeEffects: CONFIG.RQG.debug.showActorActiveEffectsTab && getGameUser().isGM,
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<RqgActor | undefined> {
    let maxHitPoints = this.actor.data.data.attributes.hitPoints.max;
    requireValue(maxHitPoints, "Actor does not have max hitpoints set.", this.actor);
    if (
      formData["data.attributes.hitPoints.value"] == null || // Actors without hit locations should not get undefined
      formData["data.attributes.hitPoints.value"] > maxHitPoints
    ) {
      formData["data.attributes.hitPoints.value"] = maxHitPoints;
    }

    // Hack: Temporarily change hp.value to what it will become so getCombinedActorHealth will work
    const hpTmp = this.actor.data.data.attributes.hitPoints.value;
    this.actor.data.data.attributes.hitPoints.value = formData["data.attributes.hitPoints.value"];

    const newHealth = DamageCalculations.getCombinedActorHealth(this.actor.data);
    if (newHealth !== this.actor.data.data.attributes.health) {
      // @ts-ignore wait for foundry-vtt-types issue #1165
      const speakerName = this.token?.name || this.actor.data.token.name;
      let message;
      if (newHealth === "dead" && !this.actor.effects.find((e) => e.data.label === "dead")) {
        message = `${speakerName} runs out of hitpoints and dies here and now!`;
      }
      if (
        newHealth === "unconscious" &&
        !this.actor.effects.find((e) => e.data.label === "unconscious")
      ) {
        message = `${speakerName} faints from lack of hitpoints!`;
      }
      message &&
        ChatMessage.create({
          user: getGameUser().id,
          speaker: { alias: speakerName },
          content: message,
          whisper: usersThatOwnActor(this.actor).map((u) => u.id),
          type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
        });
    }

    this.actor.data.data.attributes.hitPoints.value = hpTmp; // Restore hp so the form will work
    if (this.token) {
      // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
      const tokenHealthBefore = this.token?.actor?.data.data.attributes.health;
      // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
      this.token.actor.data.data.attributes.health = newHealth; // "Pre update" the health to make the setTokenEffect call work
      // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
      HitLocationSheet.setTokenEffect(this.token.object as RqgToken, tokenHealthBefore);
    }

    formData["data.attributes.health"] = newHealth;

    return super._updateObject(event, formData);
  }

  activateListeners(html: JQuery): void {
    super.activateListeners(html);
    if (!this.actor.isOwner) {
      // Only owners are allowed to interact
      return;
    }

    new ContextMenu(
      html,
      ".characteristic.contextmenu",
      // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
      characteristicMenuOptions(this.actor, this.token)
    );
    // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
    new ContextMenu(html, ".combat.contextmenu", combatMenuOptions(this.actor, this.token));
    new ContextMenu(html, ".hit-location.contextmenu", hitLocationMenuOptions(this.actor));
    // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
    new ContextMenu(html, ".rune.contextmenu", runeMenuOptions(this.actor, this.token));
    new ContextMenu(
      html,
      ".spirit-magic.contextmenu",
      // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
      spiritMagicMenuOptions(this.actor, this.token)
    );
    new ContextMenu(html, ".cult.contextmenu", cultMenuOptions(this.actor));
    // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
    new ContextMenu(html, ".rune-magic.contextmenu", runeMagicMenuOptions(this.actor, this.token));
    // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
    new ContextMenu(html, ".skill.contextmenu", skillMenuOptions(this.actor, this.token));
    new ContextMenu(html, ".gear.contextmenu", gearMenuOptions(this.actor));
    // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
    new ContextMenu(html, ".passion.contextmenu", passionMenuOptions(this.actor, this.token));

    // Use attributes data-item-edit, data-item-delete & data-item-roll to specify what should be clicked to perform the action
    // Set data-item-edit=actor.items._id on the same or an outer element to specify what item the action should be performed on.

    // Roll Characteristic
    this.form?.querySelectorAll("[data-characteristic-roll]").forEach((el) => {
      const characteristicName = (el.closest("[data-characteristic]") as HTMLElement).dataset
        .characteristic;

      let clickCount = 0;
      const actorCharacteristics: Characteristics = this.actor.data.data.characteristics;
      if (!characteristicName || !(characteristicName in actorCharacteristics)) {
        const msg = `Characteristic [${characteristicName}] isn't found on actor [${this.actor.name}].`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, this.actor);
      }
      el.addEventListener("click", async (ev: Event) => {
        clickCount = Math.max(clickCount, (ev as MouseEvent).detail);

        if (clickCount >= 2) {
          // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
          const speakerName = this.token?.name || this.actor.data.token.name;
          await CharacteristicCard.roll(
            characteristicName,
            actorCharacteristics[characteristicName as keyof typeof actorCharacteristics].value,
            5,
            0,
            this.actor,
            speakerName
          );
          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await CharacteristicCard.show(
                {
                  name: characteristicName,
                  data: actorCharacteristics[
                    characteristicName as keyof typeof actorCharacteristics
                  ],
                },
                this.actor,
                // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
                this.token
              );
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Roll against Item Ability Chance
    this.form?.querySelectorAll("[data-item-roll]").forEach((el) => {
      const itemId = getRequiredDomDataset($(el as HTMLElement), "item-id");
      const item = this.actor.items.get(itemId);
      requireValue(item, "AbilityChance roll couldn't find skillItem");
      let clickCount = 0;

      el.addEventListener("click", async (ev: Event) => {
        if (
          hasOwnProperty(item.data.data, "category") &&
          [SkillCategoryEnum.MeleeWeapons, SkillCategoryEnum.MissileWeapons].includes(
            item.data.data.category
          )
        ) {
          ui.notifications?.warn(
            "To use a weapon please make sure it is equipped and use the Combat tab instead."
          );
          return;
        }

        clickCount = Math.max(clickCount, (ev as MouseEvent).detail);

        if (clickCount >= 2) {
          // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
          const speakerName = this.token?.name || this.actor.data.token.name;
          await ItemCard.roll(
            item.data.toObject(false) as unknown as ItemDataProperties,
            0,
            this.actor,
            speakerName
          );
          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
              await ItemCard.show(itemId, this.actor, this.token);
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Roll Rune Magic
    this.form?.querySelectorAll("[data-rune-magic-roll]").forEach((el) => {
      const itemId = getRequiredDomDataset($(el as HTMLElement), "item-id");
      const item = this.actor.items.get(itemId);
      if (!item) {
        const msg = `Couldn't find item [${itemId}] to roll Rune Magic against`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, el);
      }
      let clickCount = 0;

      el.addEventListener("click", async (ev: Event) => {
        console.log("CLICK RUNE MAGIC");
        if (item.data.type !== ItemTypeEnum.RuneMagic) {
          const msg = "Tried to roll a Rune Magic Roll against some other Item";
          ui.notifications?.error(msg);
          throw new RqgError(msg, item);
        }
        clickCount = Math.max(clickCount, (ev as MouseEvent).detail);
        if (clickCount >= 2) {
          if (item.data.data.points > 1) {
            // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
            await RuneMagicCard.show(itemId, this.actor, this.token);
          } else {
            // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
            const speakerName = this.token?.name || this.actor.data.token.name;
            await RuneMagicCard.roll(
              item.data.toObject(),
              item.data.data.points,
              this.actor,
              speakerName
            );
          }

          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
              await RuneMagicCard.show(itemId, this.actor, this.token);
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Roll Spirit Magic
    this.form?.querySelectorAll("[data-spirit-magic-roll]").forEach((el) => {
      const itemId = getRequiredDomDataset($(el as HTMLElement), "item-id");
      const item = this.actor.items.get(itemId);
      if (!item) {
        const msg = `Couldn't find item [${itemId}] to roll Spirit Magic against`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, el);
      }
      let clickCount = 0;

      el.addEventListener("click", async (ev: Event) => {
        if (item.data.type !== ItemTypeEnum.SpiritMagic) {
          const msg = "Tried to roll a Spirit Magic Roll against some other Item";
          ui.notifications?.error(msg);
          throw new RqgError(msg, item);
        }
        clickCount = Math.max(clickCount, (ev as MouseEvent).detail);
        if (clickCount >= 2) {
          if (item.data.data.isVariable && item.data.data.points > 1) {
            // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
            await SpiritMagicCard.show(itemId, this.actor, this.token);
          } else {
            // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
            const speakerName = this.token?.name || this.actor.data.token.name;
            await SpiritMagicCard.roll(
              item.data.toObject(),
              item.data.data.points,
              0,
              this.actor,
              speakerName
            );
          }

          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
              await SpiritMagicCard.show(itemId, this.actor, this.token);
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Show Weapon Chat Card
    this.form?.querySelectorAll<HTMLElement>("[data-weapon-roll]").forEach((el) => {
      const weaponUsage = getRequiredDomDataset(el, "weapon-roll");
      const weaponItemId = getRequiredDomDataset(el, "item-id");
      const skillItemId = getDomDataset(el, "skill-id");
      if (!skillItemId) {
        console.warn(
          `Weapon ${weaponItemId} is missing a skill. Normal if you just dragged the weapon in, but should only happen then`
        );
      }

      let clickCount = 0;
      el.addEventListener("click", async (ev: Event) => {
        clickCount = Math.max(clickCount, (ev as MouseEvent).detail);
        if (skillItemId && clickCount >= 2) {
          // Ignore double clicks by doing the same as on single click
          // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
          await WeaponCard.show(weaponItemId, weaponUsage, skillItemId, this.actor, this.token);
          clickCount = 0;
        } else if (skillItemId && clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
              await WeaponCard.show(weaponItemId, weaponUsage, skillItemId, this.actor, this.token);
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Set Token SR in Combat Tracker
    this.form?.querySelectorAll("[data-set-sr]").forEach((el: Element) => {
      const sr = getRequiredDomDataset($(el as HTMLElement), "set-sr");
      let token = this.token as TokenDocument | null;
      if (!token && this.actor.data.token.actorLink) {
        const activeTokens = this.actor.getActiveTokens();
        token = activeTokens ? activeTokens[0] : null; // TODO Just picks the first token found
      }

      let clickCount = 0;

      function setTokenCombatSr() {
        getGame().combats?.forEach(async (combat) => {
          const combatant = token && token.id ? combat.getCombatantByToken(token.id) : undefined;
          combatant &&
            (await combat.updateEmbeddedDocuments("Combatant", [
              {
                _id: combatant.id,
                initiative: sr,
              },
            ]));
        });
      }

      el.addEventListener("click", async (ev: Event) => {
        clickCount = Math.max(clickCount, (ev as MouseEvent).detail);
        if (clickCount >= 2) {
          // Ignore double clicks by doing the same as on single click
          setTokenCombatSr();
          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1 && token) {
              setTokenCombatSr();
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Open Linked Journal Entry
    this.form?.querySelectorAll<HTMLElement>("[data-journal-id]").forEach((el) => {
      const pack = getDomDataset(el, "journal-pack");
      const id = getRequiredDomDataset(el, "journal-id");
      el.addEventListener("click", () => RqgActorSheet.showJournalEntry(id, pack));
    });

    // Edit Item (open the item sheet)
    this.form?.querySelectorAll<HTMLElement>("[data-item-edit]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = this.actor.items.get(itemId);
      if (!item || !item.sheet) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${this.actor.name} to open item sheet (during setup).`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      el.addEventListener("click", () => item.sheet!.render(true));
    });

    // Delete Item (remove item from actor)
    this.form?.querySelectorAll<HTMLElement>("[data-item-delete]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("click", () => RqgActorSheet.confirmItemDelete(this.actor, itemId));
    });

    // Cycle the equipped state of a physical Item
    this.form?.querySelectorAll<HTMLElement>("[data-item-equipped-toggle]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("click", async () => {
        const item = this.actor.items.get(itemId);
        if (!item || !("equippedStatus" in item.data.data)) {
          const msg = `Couldn't find itemId [${itemId}] to toggle the equipped state (when clicked).`;
          ui.notifications?.error(msg);
          throw new RqgError(msg);
        }
        const newStatus =
          equippedStatuses[
            (equippedStatuses.indexOf(item.data.data.equippedStatus) + 1) % equippedStatuses.length
          ];
        // Will trigger a Actor#_onModifyEmbeddedEntity that will update the other physical items in the same location tree
        await item.update({ "data.equippedStatus": newStatus });
      });
    });

    // Edit item value
    this.form?.querySelectorAll<HTMLInputElement>("[data-item-edit-value]").forEach((el) => {
      const path = getRequiredDomDataset(el, "item-edit-value");
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("change", async (event) => {
        const item = this.actor.items.get(itemId);
        requireValue(item, `Couldn't find itemId [${itemId}] to edit an item (when clicked).`);
        await item.update({ [path]: (event.target as HTMLInputElement)?.value }, {});
      });
    });

    // Add wound to hit location TODO move listener to hitlocation
    this.form?.querySelectorAll<HTMLElement>("[data-item-add-wound]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
      const speakerName = (this.token?.name || this.actor.data.token.name) ?? "";
      el.addEventListener("click", () =>
        HitLocationSheet.showAddWoundDialog(this.actor, itemId, speakerName)
      );
    });

    // Heal wounds to hit location TODO move listener to hitlocation
    this.form?.querySelectorAll<HTMLElement>("[data-item-heal-wound]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("click", () => HitLocationSheet.showHealWoundDialog(this.actor, itemId));
    });

    // Edit Actor Active Effect
    this.form?.querySelectorAll<HTMLElement>("[data-actor-effect-edit]").forEach((el) => {
      const effectId = getRequiredDomDataset(el, "effect-id");
      el.addEventListener("click", () => {
        const effect = this.actor.effects.get(effectId);
        requireValue(effect, `No active effect id [${effectId}] to edit the effect`);
        new ActiveEffectConfig(effect).render(true);
      });
    });

    // Delete Item Active Effect
    this.form?.querySelectorAll<HTMLElement>("[data-actor-effect-delete]").forEach((el) => {
      const effectId = getRequiredDomDataset(el, "effect-id");
      el.addEventListener("click", () => {
        this.actor.getEmbeddedDocument("ActiveEffect", effectId)?.delete();
      });
    });

    // Roll Damage for spirit magic (and separate damage bonus)
    this.form?.querySelectorAll<HTMLElement>("[data-damage-roll]").forEach((el) => {
      const damage = el.dataset.damageRoll;
      requireValue(damage, "direct damage roll without damage");
      el.addEventListener("click", async () => {
        const r = new Roll(damage);
        await r.evaluate({ async: true });
        await r.toMessage({
          speaker: ChatMessage.getSpeaker(),
          type: CONST.CHAT_MESSAGE_TYPES.ROLL,
          flavor: `damage`,
        });
      });
    });
  }

  static confirmItemDelete(actor: RqgActor, itemId: string): void {
    const item = actor.items.get(itemId);
    requireValue(item, `No itemId [${itemId}] on actor ${actor.name} to show delete item Dialog`);

    new Dialog(
      {
        title: `Delete ${item.type}: ${item.name}`,
        content: "Do you want to delete this item",
        default: "submit",
        buttons: {
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: "Confirm",
            callback: async () => {
              await actor.deleteEmbeddedDocuments("Item", [itemId]);
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
  // TODO Compare to new foundry implementation!!!
  static async showJournalEntry(id: string, packName?: string): Promise<void> {
    let entity;

    // Compendium Link
    if (packName) {
      const pack = getGame().packs?.get(packName);
      entity = id && pack ? await pack.getDocument(id) : undefined;

      // World Entity Link
    } else {
      const collection = getGame().journal;
      requireValue(collection, "game.journal not yet initialised");
      // const collection = CONFIG.JournalEntry.collection.instance;
      entity = collection.get(id);
    }
    if (!entity) {
      const msg = `No journal with id [${id}] and packName ${packName} when showing it.`;
      ui.notifications?.warn(msg);
      console.warn(msg);
      return;
    }
    requireValue(entity.sheet, "journal entry entity.sheet not present");
    entity.sheet.render(true);
  }
}

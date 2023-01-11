import { SkillCategoryEnum, SkillDataProperties } from "../data-model/item-data/skillData";
import { HomeLandEnum, OccupationEnum } from "../data-model/actor-data/background";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { HitLocationSheet } from "../items/hit-location-item/hitLocationSheet";
import { RqgItem } from "../items/rqgItem";
import { skillMenuOptions } from "./context-menus/skill-context-menu";
import { combatMenuOptions } from "./context-menus/combat-context-menu";
import { hitLocationMenuOptions } from "./context-menus/hit-location-context-menu";
import { passionMenuOptions } from "./context-menus/passion-context-menu";
import { gearMenuOptions } from "./context-menus/gear-context-menu";
import { spiritMagicMenuOptions } from "./context-menus/spirit-magic-context-menu";
import { cultMenuOptions } from "./context-menus/cult-context-menu";
import { runeMagicMenuOptions } from "./context-menus/rune-magic-context-menu";
import { runeMenuOptions } from "./context-menus/rune-context-menu";
import { equippedStatuses } from "../data-model/item-data/IPhysicalItem";
import { characteristicMenuOptions } from "./context-menus/characteristic-context-menu";
import { createItemLocationTree, LocationNode } from "../items/shared/locationNode";
import { CharacteristicChatHandler } from "../chat/characteristicChatHandler";
import { RqgActor } from "./rqgActor";
import {
  assertItemType,
  getDocumentTypes,
  getDomDataset,
  getGame,
  getGameUser,
  getRequiredDomDataset,
  getRequiredRqgActorFromUuid,
  hasOwnProperty,
  localize,
  requireValue,
  RqgError,
  usersIdsThatOwnActor,
} from "../system/util";
import { RuneDataSource, RuneTypeEnum } from "../data-model/item-data/runeData";
import { DamageCalculations } from "../system/damageCalculations";
import { actorHealthStatuses, LocomotionEnum } from "../data-model/actor-data/attributes";
import { RqgToken } from "../combat/rqgToken";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";
import { ItemDataSource } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";
import { ReputationChatHandler } from "../chat/reputationChatHandler";
import { ActorWizard } from "../applications/actorWizardApplication";
import { systemId } from "../system/config";
import { RqidLink } from "../data-model/shared/rqidLink";
import { RqidLinkDragEvent } from "../items/RqgItemSheet";
import { actorWizardFlags, documentRqidFlags } from "../data-model/shared/rqgDocumentFlags";
import { addRqidSheetHeaderButton } from "../documents/rqidSheetButton";
import { RqgAsyncDialog } from "../applications/rqgAsyncDialog";
import { ActorSheetData } from "../items/shared/sheetInterfaces";

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
  /** reorganized for presentation TODO type it better */
  embeddedItems: any;

  /** Find this skill to show on spirit combat part */
  spiritCombatSkillData: any;
  /** Find this skill to show on combat part */
  dodgeSkillData: RqgItem | undefined;

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
  enrichedAllies: string;
  enrichedBiography: string;

  locomotionModes: { [a: string]: string };

  currencyTotals: any;

  showUiSection: UiSections;
  actorWizardFeatureFlag: boolean;
}

// Half prepared for introducing more actor types. this would then be split into CharacterSheet & RqgActorSheet
export class RqgActorSheet extends ActorSheet<
  ActorSheet.Options,
  CharacterSheetData | ActorSheet.Data
> {
  get title(): string {
    const linked = this.actor.prototypeToken?.actorLink;
    const isToken = this.actor.isToken;

    let prefix = "";
    if (!linked) {
      prefix = isToken ? "[Token] " : "[Prototype] ";
    }
    const speakerName = isToken ? this.actor.token!.name : this.actor.prototypeToken.name;
    const postfix = isToken ? ` (${this.actor.prototypeToken.name})` : "";

    return prefix + speakerName + postfix;
  }

  static get defaultOptions(): ActorSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "sheet", ActorTypeEnum.Character],
      template: "systems/rqg/actors/rqgActorSheet.hbs",
      width: 850,
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

  async getData(): Promise<CharacterSheetData & ActorSheetData> {
    const system = duplicate(this.document.system);
    const spiritMagicPointSum = this.getSpiritMagicPointSum();
    const dexStrikeRank = system.attributes.dexStrikeRank;

    return {
      id: this.document.id ?? "",
      tokenId: this.document?.token?.id ?? undefined, // TODO check if different from actorData.token.id - if not the use data
      // tokenId: this.token?.id, // TODO check if different from actorData.token.id - if not the use data

      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isEditable: this.isEditable,
      isGM: getGameUser().isGM,
      isPC: this.actor.hasPlayerOwner,
      system: system,
      effects: this.actor.effects,

      embeddedItems: await RqgActorSheet.organizeEmbeddedItems(this.actor),

      spiritCombatSkillData: this.actor.getBestEmbeddedItemByRqid(
        CONFIG.RQG.skillRqid.spiritCombat
      ),
      dodgeSkillData: this.actor.getBestEmbeddedItemByRqid(CONFIG.RQG.skillRqid.dodge),

      characterElementRunes: this.getCharacterElementRuneImgs(), // Sorted array of element runes with > 0% chance
      characterPowerRunes: this.getCharacterPowerRuneImgs(), // Sorted array of power runes with > 50% chance
      characterFormRunes: this.getCharacterFormRuneImgs(), // Sorted array of form runes that define the character
      loadedMissileSr: this.getLoadedMissileSr(dexStrikeRank), // (html) Precalculated missile weapon SRs if loaded at start of round
      unloadedMissileSr: this.getUnloadedMissileSr(dexStrikeRank), // (html) Precalculated missile weapon SRs if not loaded at start of round
      itemLocationTree: createItemLocationTree(this.actor.items.toObject()), // physical items reorganised as a tree of items containing items
      powCrystals: this.getPowCrystals(),
      spiritMagicPointSum: spiritMagicPointSum,
      freeInt: this.getFreeInt(spiritMagicPointSum),
      baseStrikeRank: this.getBaseStrikeRank(dexStrikeRank, system.attributes.sizStrikeRank),
      // @ts-expect-error async
      enrichedAllies: await TextEditor.enrichHTML(system.allies, { async: true }),
      enrichedBiography: await TextEditor.enrichHTML(system.background.biography ?? "", {
        // @ts-expect-error async
        async: true,
      }),

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

      currencyTotals: this.calcCurrencyTotals(),

      // UI toggles
      showUiSection: this.getUiSectionVisibility(),
      actorWizardFeatureFlag: getGame().settings.get(systemId, "actor-wizard-feature-flag"),
    };
  }

  private calcCurrencyTotals(): any {
    const currency: RqgItem[] = this.actor.items.filter(
      (i: RqgItem) => i.type === ItemTypeEnum.Gear && i.system.physicalItemType === "currency"
    );
    const result = { quantity: 0, price: { real: 0, estimated: 0 }, encumbrance: 0 };
    currency.forEach((curr) => {
      assertItemType(curr.type, ItemTypeEnum.Gear);
      result.quantity += Number(curr.system.quantity);
      result.price.real += curr.system.price.real * curr.system.quantity;
      result.price.estimated += curr.system.price.estimated * curr.system.quantity;
      if (curr.system.equippedStatus !== "notCarried") {
        result.encumbrance += curr.system.encumbrance * curr.system.quantity;
      }
      let conv;
      if (curr.system.price.estimated > 1) {
        conv = localize("RQG.Actor.Gear.CurrencyConversionTipOver1", {
          name: curr.name,
          value: curr.system.price.estimated,
        });
      } else if (curr.system.price.estimated === 1) {
        conv = localize("RQG.Actor.Gear.CurrencyConversionTipLunar");
      } else {
        conv = localize("RQG.Actor.Gear.CurrencyConversionTipUnder1", {
          name: curr.name,
          value: 1 / curr.system.price.estimated,
        });
      }
      //@ts-ignore
      curr.system.price.conversion = conv;
    });
    return result;
  }

  private getPhysicalItemLocations(): string[] {
    // Used for DataList input dropdown
    const physicalItems: RqgItem[] = this.actor.items.filter((i: RqgItem) =>
      hasOwnProperty(i.system, "physicalItemType")
    );
    return [
      ...new Set([
        // Make a unique list of names of container items and "free text" locations
        ...this.actor.items.reduce((acc: string[], i: RqgItem) => {
          if (hasOwnProperty(i.system, "isContainer") && i.system.isContainer && i.name) {
            acc.push(i.name);
          }
          return acc;
        }, []),
        ...physicalItems.map((i: RqgItem) => (i.system as any).location ?? ""),
      ]),
    ];
  }

  private getSpiritMagicPointSum(): number {
    return this.actor.items.reduce((acc: number, item: RqgItem) => {
      if (item.type === ItemTypeEnum.SpiritMagic && !item.system.isMatrix) {
        return acc + item.system.points;
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
          (
            e: any // TODO v10 any
          ) =>
            e.changes.find((e: any) => e.key === "system.attributes.magicPoints.max") != undefined
        )
        // TODO v10 any
        .map((e: any) => {
          return {
            name: e.label,
            size: e.changes
              .filter((c: any) => c.key === "system.attributes.magicPoints.max")
              .reduce((acc: number, c: any) => acc + Number(c.value), 0),
          };
        })
    );
  }

  private getFreeInt(spiritMagicPointSum: number): number {
    return (
      (this.actor.system.characteristics.intelligence.value ?? 0) -
      spiritMagicPointSum -
      this.actor.items.filter(
        (i: RqgItem) =>
          i.type === ItemTypeEnum.Skill &&
          i.system.category === SkillCategoryEnum.Magic &&
          !!i.system.runes.length
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
      .reduce((acc: any[], i: RqgItem) => {
        if (
          i.type === ItemTypeEnum.Rune &&
          i.system.runeType === RuneTypeEnum.Element &&
          !!i.system.chance
        ) {
          acc.push({
            id: i.id,
            img: i.img,
            chance: i.system.chance,
            descriptionRqid: i.system.descriptionRqidLink?.rqid,
          });
        }
        return acc;
      }, [])
      .sort((a: any, b: any) => b.chance - a.chance);
  }

  private getCharacterPowerRuneImgs(): RuneDataSource[] {
    return this.actor.items
      .reduce((acc: any[], i: RqgItem) => {
        if (
          i.type === ItemTypeEnum.Rune &&
          i.system.runeType === RuneTypeEnum.Power &&
          i.system.chance > 50
        ) {
          acc.push({
            id: i.id,
            img: i.img,
            chance: i.system.chance,
            descriptionRqid: i.system.descriptionRqidLink?.rqid,
          });
        }
        return acc;
      }, [])
      .sort((a: any, b: any) => b.chance - a.chance);
  }

  private getCharacterFormRuneImgs(): RuneDataSource[] {
    return this.actor.items
      .reduce((acc: any[], i: RqgItem) => {
        if (
          i.type === ItemTypeEnum.Rune &&
          i.system.runeType === RuneTypeEnum.Form &&
          (!i.system.opposingRune || i.system.chance > 50)
        ) {
          acc.push({
            id: i.id,
            img: i.img,
            chance: i.system.chance,
            descriptionRqid: i.system.descriptionRqidLink?.rqid,
          });
        }
        return acc;
      }, [])
      .sort((a: any, b: any) => b.chance - a.chance);
  }

  private getSkillDataByName(name: String): SkillDataProperties | undefined {
    const skillItem = this.actor.items.find(
      (i: RqgItem) => i.name === name && i.type === ItemTypeEnum.Skill
    );

    if (!skillItem) {
      return;
    }
    assertItemType(skillItem.type, ItemTypeEnum.Skill);
    return skillItem.system;
  }

  /**
   * Take the embedded items of the actor and rearrange them for presentation.
   * returns something like this {armor: [RqgItem], elementalRune: [RqgItem], ... }
   * TODO Fix the typing
   */
  public static async organizeEmbeddedItems(actor: RqgActor): Promise<any> {
    const itemTypes: any = Object.fromEntries(getDocumentTypes().Item.map((t: string) => [t, []]));
    actor.items.forEach((item) => {
      itemTypes[item.type].push(item);
    });

    const currency: any = [];
    actor.items.forEach((item) => {
      if (item.type === ItemTypeEnum.Gear) {
        //TODO: Assert that this is Gear or something else that has physicalItemType??
        //@ts-ignore physicalItemType
        if (item.system.physicalItemType === "currency") {
          currency.push(item);
        }
      }
    });

    currency.sort(
      (a: any, b: any) =>
        (Number(a.system.price.estimated) < Number(b.system.price.estimated) ? 1 : -1) - 1
    );

    itemTypes.currency = currency;

    // Separate skills into skill categories {agility: [RqgItem], communication: [RqgItem], ... }
    const skills: any = {};
    Object.values(SkillCategoryEnum).forEach((cat: string) => {
      skills[cat] = itemTypes[ItemTypeEnum.Skill].filter((s: any) => cat === s.system.category);
    });
    // Sort the skills inside each category
    Object.values(skills).forEach((skillList) =>
      (skillList as RqgItem[]).sort((a: RqgItem, b: RqgItem) =>
        ("" + a.name).localeCompare("" + b.name)
      )
    );
    itemTypes[ItemTypeEnum.Skill] = skills;

    // Separate runes into types (elemental, power, form, technique)
    const runes: any = {};
    Object.values(RuneTypeEnum).forEach((type: string) => {
      runes[type] = itemTypes[ItemTypeEnum.Rune].filter((r: any) => type === r.system.runeType);
    });
    itemTypes[ItemTypeEnum.Rune] = runes;

    // Organise powerRunes as { fertility: RqgItem, death: RqgItem, ... }
    itemTypes[ItemTypeEnum.Rune][RuneTypeEnum.Power] = {
      ...itemTypes[ItemTypeEnum.Rune][RuneTypeEnum.Power].reduce((acc: any, item: Item) => {
        assertItemType(item.type, ItemTypeEnum.Rune);
        // @ts-expect-error system
        acc[item.system.rune] = item;
        return acc;
      }, []),
    };

    // Organise formRunes as { man: RqgItem, beast: RqgItem, ... }
    itemTypes[ItemTypeEnum.Rune][RuneTypeEnum.Form] = {
      ...itemTypes[ItemTypeEnum.Rune][RuneTypeEnum.Form].reduce((acc: any, item: Item) => {
        assertItemType(item.type, ItemTypeEnum.Rune);
        // @ts-expect-error system
        acc[item.system.rune] = item;
        return acc;
      }, []),
    };

    // Sort the hit locations
    itemTypes[ItemTypeEnum.HitLocation].sort(
      (a: any, b: any) => b.system.dieFrom - a.system.dieFrom
    );

    // Enrich Cult texts for holyDays, gifts, geases, subCults
    await Promise.all(
      itemTypes[ItemTypeEnum.Cult].map(async (cult: any) => {
        cult.system.enrichedHolyDays = await TextEditor.enrichHTML(cult.system.holyDays, {
          // @ts-expect-error async
          async: true,
        });
        // @ts-expect-error async
        cult.system.enrichedGifts = await TextEditor.enrichHTML(cult.system.gifts, { async: true });
        cult.system.enrichedGeases = await TextEditor.enrichHTML(cult.system.geases, {
          // @ts-expect-error async
          async: true,
        });
        cult.system.enrichedSubCults = await TextEditor.enrichHTML(cult.system.subCults, {
          // @ts-expect-error async
          async: true,
        });
      })
    );

    // Enrich passion description texts
    await Promise.all(
      itemTypes[ItemTypeEnum.Passion].map(async (passion: any) => {
        passion.system.enrichedDescription = await TextEditor.enrichHTML(
          passion.system.description,
          {
            // @ts-expect-error async
            async: true,
          }
        );
      })
    );

    itemTypes[ItemTypeEnum.Weapon].forEach((weapon: RqgItem) => {
      assertItemType(weapon.type, ItemTypeEnum.Weapon);

      let usages = weapon.system.usage;
      let actorStr = actor.system.characteristics.strength.value ?? 0;
      let actorDex = actor.system.characteristics.dexterity.value ?? 0;
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
            if (usage.minStrength == null) {
              usage.unusable = true;
            } else usage.unusable = deficiency > strover;
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
        this.actor.system.attributes.hitPoints.max != null ||
        this.actor.items.some((i) => i.type === ItemTypeEnum.HitLocation),
      combat:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some(
          (i: RqgItem) =>
            i.getFlag(systemId, documentRqidFlags)?.id === CONFIG.RQG.skillRqid.dodge ||
            i.type === ItemTypeEnum.Weapon
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
            i.type === ItemTypeEnum.Rune &&
            (i.system.isMastered || i.system.runeType === RuneTypeEnum.Technique)
        ),
      skills:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some((i: RqgItem) => i.type === ItemTypeEnum.Skill),
      gear:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some(
          (i: RqgItem) =>
            [ItemTypeEnum.Gear, ItemTypeEnum.Weapon, ItemTypeEnum.Armor].includes(i.type) &&
            !(i.system as any).isNatural // Don't show gear tab for natural weapons
        ),
      passions:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some((i: RqgItem) => i.type === ItemTypeEnum.Passion),
      background: true,
      activeEffects: CONFIG.RQG.debug.showActorActiveEffectsTab && getGameUser().isGM,
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<RqgActor | undefined> {
    let maxHitPoints = this.actor.system.attributes.hitPoints.max;

    if (
      formData["system.attributes.hitPoints.value"] == null || // Actors without hit locations should not get undefined
      (formData["system.attributes.hitPoints.value"] ?? 0) >= (maxHitPoints ?? 0)
    ) {
      formData["system.attributes.hitPoints.value"] = maxHitPoints;
    }

    // Hack: Temporarily change hp.value to what it will become so getCombinedActorHealth will work
    const hpTmp = this.actor.system.attributes.hitPoints.value;

    this.actor.system.attributes.hitPoints.value = formData["system.attributes.hitPoints.value"];
    const newHealth = DamageCalculations.getCombinedActorHealth(this.actor);
    if (newHealth !== this.actor.system.attributes.health) {
      // @ts-expect-error this.token should be TokenDocument, but is typed as Token
      const speaker = ChatMessage.getSpeaker({ actor: this.actor, token: this.token });
      const speakerName = speaker.alias;
      let message;
      // TODO v10 any
      if (
        newHealth === "dead" &&
        // @ts-expect-error
        !this.token?.actorData.effects.find((e: any) => e.label.toLowerCase() === "dead")
      ) {
        message = `${speakerName} runs out of hitpoints and dies here and now!`;
      }
      if (
        newHealth === "unconscious" &&
        // TODO v10 any
        // @ts-expect-error
        !this.token?.actorData.effects.find((e: any) => e.label.toLowerCase() === "unconscious")
      ) {
        message = `${speakerName} faints from lack of hitpoints!`;
      }
      message &&
        ChatMessage.create({
          user: getGameUser().id,
          speaker: speaker,
          content: message,
          whisper: usersIdsThatOwnActor(this.actor),
          type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
        });
    }

    this.actor.system.attributes.hitPoints.value = hpTmp; // Restore hp so the form will work
    if (this.token) {
      // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
      const tokenHealthBefore = this.token?.actor?.system.attributes.health;
      // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
      this.token.actor.system.attributes.health = newHealth; // "Pre update" the health to make the setTokenEffect call work
      // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
      HitLocationSheet.setTokenEffect(this.token.object as RqgToken, tokenHealthBefore);
    }
    formData["system.attributes.health"] = newHealth;

    return super._updateObject(event, formData);
  }

  activateListeners(html: JQuery): void {
    super.activateListeners(html);
    if (!this.actor.isOwner) {
      // Only owners are allowed to interact
      return;
    }
    const htmlElement = html[0];

    new ContextMenu(
      html,
      ".characteristic.contextmenu",
      // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
      characteristicMenuOptions(this.actor, this.token)
    );
    // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
    new ContextMenu(html, ".combat.contextmenu", combatMenuOptions(this.actor));
    new ContextMenu(html, ".hit-location.contextmenu", hitLocationMenuOptions(this.actor));
    // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
    new ContextMenu(html, ".rune.contextmenu", runeMenuOptions(this.actor, this.token));
    new ContextMenu(
      html,
      ".spirit-magic.contextmenu",
      // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
      spiritMagicMenuOptions(this.actor)
    );
    new ContextMenu(html, ".cult.contextmenu", cultMenuOptions(this.actor));
    // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
    new ContextMenu(html, ".rune-magic.contextmenu", runeMagicMenuOptions(this.actor));
    // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
    new ContextMenu(html, ".skill.contextmenu", skillMenuOptions(this.actor, this.token));
    new ContextMenu(html, ".gear.contextmenu", gearMenuOptions(this.actor));
    // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
    new ContextMenu(html, ".passion.contextmenu", passionMenuOptions(this.actor, this.token));

    // Use attributes data-item-edit, data-item-delete & data-item-roll to specify what should be clicked to perform the action
    // Set data-item-edit=actor.items._id on the same or an outer element to specify what item the action should be performed on.

    // Roll actor Characteristic
    htmlElement.querySelectorAll<HTMLElement>("[data-characteristic-roll]").forEach((el) => {
      const characteristicName = (el.closest("[data-characteristic]") as HTMLElement)?.dataset
        .characteristic;

      let clickCount = 0;
      const actorCharacteristics = this.actor.system.characteristics;
      if (!characteristicName || !(characteristicName in actorCharacteristics)) {
        const msg = `Characteristic [${characteristicName}] isn't found on actor [${this.actor.name}].`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, this.actor);
      }
      el.addEventListener("click", async (ev: MouseEvent) => {
        clickCount = Math.max(clickCount, ev.detail);

        if (clickCount >= 2) {
          await CharacteristicChatHandler.roll(
            characteristicName,
            actorCharacteristics[characteristicName as keyof typeof actorCharacteristics].value,
            5,
            0,
            this.actor,
            // @ts-expect-error this.token should be TokenDocument, but is typed as Token
            ChatMessage.getSpeaker({ actor: this.actor, token: this.token })
          );
          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await CharacteristicChatHandler.show(
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

    // Roll actor Reputation
    htmlElement?.querySelectorAll<HTMLElement>("[data-reputation-roll]").forEach((el) => {
      let clickCount = 0;
      el.addEventListener("click", async (ev: MouseEvent) => {
        clickCount = Math.max(clickCount, ev.detail);

        if (clickCount >= 2) {
          // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
          const speaker = ChatMessage.getSpeaker({ actor: this.actor, token: this.token });
          await ReputationChatHandler.roll(
            this.actor.system.background.reputation ?? 0,
            0,
            speaker
          );
          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await ReputationChatHandler.show(
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

    // Roll Item (Rune, Skill, Passion)
    htmlElement?.querySelectorAll<HTMLElement>("[data-item-roll]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = this.actor.items.get(itemId);
      requireValue(item, "AbilityChance roll couldn't find skillItem");
      let clickCount = 0;

      el.addEventListener("click", async (ev: MouseEvent) => {
        if (
          hasOwnProperty(item.system, "category") &&
          [
            SkillCategoryEnum.MeleeWeapons,
            SkillCategoryEnum.MissileWeapons,
            SkillCategoryEnum.Shields,
            SkillCategoryEnum.NaturalWeapons,
          ].includes(item.system.category)
        ) {
          ui.notifications?.warn(
            "To use a weapon please make sure it is equipped and use the Combat tab instead."
          );
          return;
        }

        clickCount = Math.max(clickCount, ev.detail);
        if (clickCount >= 2) {
          await item.abilityRoll();
          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await item.toChat();
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Roll Rune Magic
    htmlElement?.querySelectorAll<HTMLElement>("[data-rune-magic-roll]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const runeMagicItem = this.actor.getEmbeddedDocument("Item", itemId) as RqgItem | undefined;
      assertItemType(runeMagicItem?.type, ItemTypeEnum.RuneMagic);
      let clickCount = 0;

      el.addEventListener("click", async (ev: MouseEvent) => {
        assertItemType(runeMagicItem.type, ItemTypeEnum.RuneMagic);
        clickCount = Math.max(clickCount, ev.detail);
        if (clickCount >= 2) {
          if (runeMagicItem.system.points > 1) {
            await runeMagicItem.toChat();
          } else {
            await runeMagicItem.abilityRoll();
          }

          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await runeMagicItem.toChat();
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Roll Spirit Magic
    htmlElement?.querySelectorAll<HTMLElement>("[data-spirit-magic-roll]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = this.actor.items.get(itemId);
      if (!item) {
        const msg = `Couldn't find item [${itemId}] to roll Spirit Magic against`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, el);
      }
      let clickCount = 0;

      el.addEventListener("click", async (ev: MouseEvent) => {
        if (item.type !== ItemTypeEnum.SpiritMagic) {
          const msg = "Tried to roll a Spirit Magic Roll against some other Item";
          ui.notifications?.error(msg);
          throw new RqgError(msg, item);
        }
        clickCount = Math.max(clickCount, ev.detail);
        if (clickCount >= 2) {
          if (item.system.isVariable && item.system.points > 1) {
            await item.toChat();
          } else {
            await item.abilityRoll({ level: item.system.points, boost: 0 });
          }

          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await item.toChat();
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Roll Weapon Ability (send to chat)
    htmlElement?.querySelectorAll<HTMLElement>("[data-weapon-roll]").forEach((el) => {
      const weaponItemId = getRequiredDomDataset(el, "item-id");
      const weapon = this.actor.items.get(weaponItemId);
      assertItemType(weapon?.type, ItemTypeEnum.Weapon);

      let clickCount = 0;
      el.addEventListener("click", async (ev: MouseEvent) => {
        clickCount = Math.max(clickCount, ev.detail);
        if (clickCount >= 2) {
          // Ignore double clicks by doing the same as on single click
          await weapon.toChat();
          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await weapon.toChat();
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Set Token SR in Combat Tracker
    htmlElement?.querySelectorAll<HTMLElement>("[data-set-sr]").forEach((el: HTMLElement) => {
      const sr = getRequiredDomDataset(el, "set-sr");
      let token = this.token as TokenDocument | null;
      if (!token && this.actor.prototypeToken?.actorLink) {
        const activeTokens = this.actor.getActiveTokens();
        token = activeTokens ? activeTokens[0] : null; // TODO Just picks the first token found
      }

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

      let clickCount = 0;
      el.addEventListener("click", async (ev: MouseEvent) => {
        clickCount = Math.max(clickCount, ev.detail);
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

    // Edit Item (open the item sheet)
    htmlElement?.querySelectorAll<HTMLElement>("[data-item-edit]").forEach((el) => {
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
    htmlElement?.querySelectorAll<HTMLElement>("[data-item-delete]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("click", () => RqgActorSheet.confirmItemDelete(this.actor, itemId));
    });

    // Cycle the equipped state of a physical Item
    htmlElement?.querySelectorAll<HTMLElement>("[data-item-equipped-toggle]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("click", async () => {
        const item = this.actor.items.get(itemId);
        if (!item || !("equippedStatus" in item.system)) {
          const msg = `Couldn't find itemId [${itemId}] to toggle the equipped state (when clicked).`;
          ui.notifications?.error(msg);
          throw new RqgError(msg);
        }
        const newStatus =
          equippedStatuses[
            (equippedStatuses.indexOf(item.system.equippedStatus) + 1) % equippedStatuses.length
          ];
        // Will trigger a Actor#_onModifyEmbeddedEntity that will update the other physical items in the same location tree
        await item.update({ "system.equippedStatus": newStatus });
      });
    });

    // Edit item value
    htmlElement?.querySelectorAll<HTMLInputElement>("[data-item-edit-value]").forEach((el) => {
      const path = getRequiredDomDataset(el, "item-edit-value");
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("change", async (event) => {
        const item = this.actor.items.get(itemId);
        requireValue(item, `Couldn't find itemId [${itemId}] to edit an item (when clicked).`);
        await item.update({ [path]: (event.target as HTMLInputElement)?.value }, {});
      });
    });

    // Add wound to hit location
    htmlElement?.querySelectorAll<HTMLElement>("[data-item-add-wound]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      // @ts-ignore wait for foundry-vtt-types issue #1165 #1166
      const speakerName = (this.token?.name || this.actor.prototypeToken.name) ?? "";
      el.addEventListener("click", () =>
        HitLocationSheet.showAddWoundDialog(this.actor, itemId, speakerName)
      );
    });

    // Heal wounds to hit location
    htmlElement?.querySelectorAll<HTMLElement>("[data-item-heal-wound]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("click", () => HitLocationSheet.showHealWoundDialog(this.actor, itemId));
    });

    // Edit Actor Active Effect
    htmlElement?.querySelectorAll<HTMLElement>("[data-actor-effect-edit]").forEach((el) => {
      const effectId = getRequiredDomDataset(el, "effect-id");
      el.addEventListener("click", () => {
        const effect = this.actor.effects.get(effectId);
        requireValue(effect, `No active effect id [${effectId}] to edit the effect`);
        new ActiveEffectConfig(effect).render(true);
      });
    });

    // Delete Item Active Effect
    htmlElement?.querySelectorAll<HTMLElement>("[data-actor-effect-delete]").forEach((el) => {
      const effectId = getRequiredDomDataset(el, "effect-id");
      el.addEventListener("click", () => {
        this.actor.getEmbeddedDocument("ActiveEffect", effectId)?.delete();
      });
    });

    // Roll Damage for spirit magic (and separate damage bonus)
    htmlElement?.querySelectorAll<HTMLElement>("[data-damage-roll]").forEach((el) => {
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

    // Handle rqid links
    RqidLink.addRqidLinkClickHandlers(html);

    // Handle deleting RqidLinks from RqidLink Array Properties
    $(htmlElement!)
      .find("[data-delete-from-property]")
      .each((i: number, el: HTMLElement) => {
        const deleteRqid = getRequiredDomDataset($(el), "delete-rqid");
        const deleteFromPropertyName = getRequiredDomDataset($(el), "delete-from-property");
        el.addEventListener("click", async () => {
          let deleteFromProperty = getProperty(this.actor.system, deleteFromPropertyName);
          if (Array.isArray(deleteFromProperty)) {
            const newValueArray = (deleteFromProperty as RqidLink[]).filter(
              (r) => r.rqid !== deleteRqid
            );
            await this.actor.update({ system: { [deleteFromPropertyName]: newValueArray } });
          } else {
            await this.actor.update({ system: { [deleteFromPropertyName]: "" } });
          }
        });
      });

    // Add Passion button
    htmlElement?.querySelectorAll<HTMLElement>("[data-passion-add]").forEach((el) => {
      el.addEventListener("click", async () => {
        console.log("CLICK");
        const defaultItemIconSettings: any = getGame().settings.get(
          systemId,
          "defaultItemIconSettings"
        );
        const newPassionName = localize("RQG.Item.Passion.PassionEnum.Loyalty");
        let passion = {
          name: newPassionName,
          type: "passion",
          img: defaultItemIconSettings["passion"],
          system: { passion: newPassionName },
        };
        //@ts-ignore
        await Item.createDocuments([passion], { parent: this.actor, renderSheet: true });
      });
    });
  }

  static async confirmItemDelete(actor: RqgActor, itemId: string): Promise<void> {
    const item = actor.items.get(itemId);
    requireValue(item, `No itemId [${itemId}] on actor ${actor.name} to show delete item Dialog`);

    const itemTypeLoc: string = RqgItem.localizeItemTypeName(item.type);

    const title = localize("RQG.Dialog.confirmItemDeleteDialog.title", {
      itemType: itemTypeLoc,
      itemName: item.name,
    });

    let content: string;
    if (item.type === ItemTypeEnum.Cult) {
      content = localize("RQG.Dialog.confirmItemDeleteDialog.contentCult", {
        itemType: itemTypeLoc,
        itemName: item.name,
        runeMagicSpell: RqgItem.localizeItemTypeName(ItemTypeEnum.RuneMagic),
      });
    } else {
      content = localize("RQG.Dialog.confirmItemDeleteDialog.content", {
        itemType: itemTypeLoc,
        itemName: item.name,
      });
    }

    const confirmDialog = new RqgAsyncDialog<boolean>(title, content);

    const buttons = {
      submit: {
        icon: '<i class="fas fa-check"></i>',
        label: localize("RQG.Dialog.Common.btnConfirm"),
        callback: async () => confirmDialog.resolve(true),
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: localize("RQG.Dialog.Common.btnCancel"),
        callback: () => confirmDialog.resolve(false),
      },
    };

    if (await confirmDialog.setButtons(buttons, "cancel").show()) {
      const idsToDelete = [];
      if (item.type === ItemTypeEnum.Cult) {
        const cultId = item.id;
        const runeMagicSpells = actor.items.filter(
          (i) => i.type === ItemTypeEnum.RuneMagic && i.system.cultId === cultId
        );
        runeMagicSpells.forEach((s) => {
          idsToDelete.push(s.id);
        });
      }

      idsToDelete.push(itemId);

      await actor.deleteEmbeddedDocuments("Item", idsToDelete);
    }
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

  protected async _onDrop(event: RqidLinkDragEvent): Promise<void> {
    super._onDrop(event);

    let droppedDocumentData;
    try {
      droppedDocumentData = JSON.parse(event.dataTransfer!.getData("text/plain"));
    } catch (err) {
      ui.notifications?.error(localize("RQG.Item.Notification.ErrorParsingItemData")); // TODO generic notification for all actors, items,  etc
      return;
    }

    const targetPropertyName = getDomDataset(event, "target-drop-property");

    const dropTypes = getDomDataset(event, "expected-drop-types")?.split(","); // TODO is not used ???

    let droppedDocument: Item | JournalEntry | undefined = undefined;

    if (droppedDocumentData.type === "Item") {
      droppedDocument = await Item.fromDropData(droppedDocumentData);
    }

    if (droppedDocumentData.type === "JournalEntry") {
      droppedDocument = await JournalEntry.fromDropData(droppedDocumentData);
    }

    if (droppedDocument && targetPropertyName) {
      const newLink = new RqidLink();
      newLink.rqid = droppedDocument.getFlag(systemId, documentRqidFlags)?.id ?? "";
      newLink.name = droppedDocument.name ?? "";
      newLink.documentType = droppedDocumentData.type;
      if (droppedDocument instanceof Item) {
        newLink.itemType = droppedDocument.type;
      }

      const targetProperty = getProperty(this.actor.system, targetPropertyName);

      if (targetProperty) {
        event.TargetPropertyName = targetPropertyName;
        if (Array.isArray(targetProperty)) {
          const targetPropertyRqidLinkArray = targetProperty as RqidLink[];
          if (!targetPropertyRqidLinkArray.map((j) => j.rqid).includes(newLink.rqid)) {
            targetPropertyRqidLinkArray.push(newLink);
            targetPropertyRqidLinkArray.sort((a, b) => a.name.localeCompare(b.name));
            await this.actor.update({
              system: { [targetPropertyName]: targetPropertyRqidLinkArray },
            });
          }
        } else {
          // Property is a single RqidLink, not an array
          await this.actor.update({ system: { [targetPropertyName]: newLink } });
        }
      } else {
        // Property does not already exist
        // TODO: Should we ensure that the Actor template actually is allowed
        // to have a property of the name contained in targetPropertyName?
        await this.actor.update({ system: { [targetPropertyName]: newLink } });
      }
    }
  }

  protected async _onDropItem(event: DragEvent, data: any): Promise<unknown> {
    // data is technically "ActorSheet.DropData.Item", but that doesn't expose ".actorId",
    // and it didn't seem useful to have it typed that way

    // It seems a player will not be able to copy an item to an Actor sheet
    // unless they are the owner.  It will error gracefully after this, but
    // this gives a better error.
    if (!this.actor.isOwner) {
      ui.notifications?.warn(
        localize("RQG.Actor.Notification.NotActorOwnerWarn", { actorName: this.actor.name })
      );
      return false;
    }

    // You can drop Items anywhere because we know what to do with them.
    const item = await Item.fromDropData(data);

    if (!item) {
      ui.notifications?.error(localize("RQG.Actor.Notification.DraggedItemNotFoundError"));
      return false;
    }

    const itemData = item?.toObject();

    if (!data.actorId) {
      // Dropped from Sidebar
      // if (itemData.type === ItemTypeEnum.RuneMagic) {
      //   assertItemType(itemData.type, ItemTypeEnum.RuneMagic);
      //   itemData.data.cultId = ""; // clear cult id to avoid errors, player will have to associate this spell with a cult
      // }
      return this._onDropItemCreate(itemData);
    }

    if (!itemData) {
      ui.notifications?.error(
        localize("RQG.Actor.Notification.CantMakeItemDataSourceError", { itemId: item.id })
      );
      return false;
    }

    // Check if the actor is the owner of the item
    // If so change the sort order
    const targetActor = this.actor;
    if (!targetActor) {
      return false;
    }

    let sameActor =
      data.actorId === targetActor.id ||
      (targetActor.isToken && data.tokenId === targetActor.token?.id);

    if (sameActor) {
      return this._onSortItem(event, itemData) ?? [];
    }

    const sourceActor =
      getGame().actors?.get(data.actorId) ??
      (await getRequiredRqgActorFromUuid<RqgActor>(data.actorId));

    if (!sourceActor) {
      return false;
    }

    if (
      itemData.type === ItemTypeEnum.Armor ||
      itemData.type === ItemTypeEnum.Gear ||
      itemData.type === ItemTypeEnum.Weapon
    ) {
      // Prompt to confirm giving physical item from one Actor to another,
      // and ask how many if it has a quantity of more than one.
      return await this.confirmTransferPhysicalItem(itemData, sourceActor);
    } else {
      // Prompt to ensure user wants to copy intangible items
      //(runes, skills, passions, etc) from one Actor to another
      return await this.confirmCopyIntangibleItem(itemData, sourceActor);
    }
  }

  private async confirmCopyIntangibleItem(
    incomingItemDataSource: ItemDataSource,
    sourceActor: RqgActor
  ): Promise<RqgItem[] | boolean> {
    const adapter: any = {
      incomingItemDataSource: incomingItemDataSource,
      sourceActor: sourceActor,
      targetActor: this.actor,
    };
    const content: string = await renderTemplate(
      "systems/rqg/applications/confirmCopyIntangibleItem.hbs",
      {
        adapter: adapter,
      }
    );

    const title = localize("RQG.Dialog.confirmCopyIntangibleItem.title", {
      itemName: incomingItemDataSource.name,
      targetActor: this.actor.name,
    });
    const confirmDialog = new RqgAsyncDialog<RqgItem[] | boolean>(title, content);

    const buttons = {
      submit: {
        icon: '<i class="fas fa-check"></i>',
        label: localize("RQG.Dialog.confirmCopyIntangibleItem.btnCopy"),
        callback: () => {
          confirmDialog.resolve(this.submitConfirmCopyIntangibleItem(incomingItemDataSource));
        },
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: localize("RQG.Dialog.Common.btnCancel"),
        callback: () => confirmDialog.resolve(false),
      },
    };
    return await confirmDialog.setButtons(buttons, "submit").show();
  }

  private async submitConfirmCopyIntangibleItem(
    incomingItemDataSource: ItemDataSource
  ): Promise<RqgItem[]> {
    return this._onDropItemCreate(incomingItemDataSource);
  }

  private async confirmTransferPhysicalItem(
    incomingItemDataSource: ItemDataSource,
    sourceActor: RqgActor
  ): Promise<RqgItem[] | boolean> {
    const adapter: any = {
      incomingItemDataSource: incomingItemDataSource,
      sourceActor: sourceActor,
      targetActor: this.actor,
      // @ts-ignore quantity
      showQuantity: incomingItemDataSource.system.quantity > 1,
    };

    const content: string = await renderTemplate(
      "systems/rqg/applications/confirmTransferPhysicalItem.hbs",
      {
        adapter: adapter,
      }
    );

    const title = localize("RQG.Dialog.confirmTransferPhysicalItem.title", {
      itemName: incomingItemDataSource.name,
      targetActor: this.actor.name,
    });

    const confirmDialog = new RqgAsyncDialog<RqgItem[] | boolean>(title, content);

    const buttons = {
      submit: {
        icon: '<i class="fas fa-check"></i>',
        label: localize("RQG.Dialog.confirmTransferPhysicalItem.btnGive"),
        callback: async (html: JQuery | HTMLElement) =>
          confirmDialog.resolve(
            this.submitConfirmTransferPhysicalItem(
              html as JQuery,
              incomingItemDataSource,
              sourceActor
            )
          ),
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: localize("RQG.Dialog.Common.btnCancel"),
        callback: () => confirmDialog.resolve(false),
      },
    };
    return await confirmDialog.setButtons(buttons, "submit").show();
  }

  private async submitConfirmTransferPhysicalItem(
    html: JQuery,
    incomingItemDataSource: ItemDataSource,
    sourceActor: RqgActor
  ): Promise<RqgItem[] | boolean> {
    const formData = new FormData(html.find("form")[0]);
    // @ts-ignore entries
    const data = Object.fromEntries(formData.entries());

    let quantityToTransfer: number = 1;
    if (data.numtotransfer) {
      quantityToTransfer = Number(data.numtotransfer);
    }
    return await this.transferPhysicalItem(incomingItemDataSource, quantityToTransfer, sourceActor);
  }

  private async transferPhysicalItem(
    incomingItemDataSource: ItemDataSource,
    quantityToTransfer: number,
    sourceActor: RqgActor
  ): Promise<RqgItem[] | boolean> {
    if (!incomingItemDataSource) {
      ui.notifications?.error(localize("RQG.Actor.Notification.NoIncomingItemDataSourceError"));
      return false;
    }
    if (!incomingItemDataSource.system.hasOwnProperty("quantity")) {
      ui.notifications?.error(
        localize("RQG.Actor.Notification.IncomingItemDataSourceNotPhysicalItemError")
      );
      return false;
    }
    if (quantityToTransfer < 1) {
      ui.notifications?.error(localize("RQG.Actor.Notification.CantTransferLessThanOneItemError"));
      return false;
    }
    // @ts-ignore quantity
    if (quantityToTransfer > incomingItemDataSource.system.quantity) {
      ui.notifications?.error(
        localize("RQG.Actor.Notification.CantTransferMoreThanSourceOwnsError", {
          itemName: incomingItemDataSource.name,
          sourceActorName: sourceActor.name,
        })
      );
      return false;
    }

    const existingItem = this.actor.items.find(
      (i: RqgItem) =>
        i.name === incomingItemDataSource.name && i.type === incomingItemDataSource.type
    );

    // @ts-ignore quantity
    let newTargetQty = quantityToTransfer;
    // @ts-ignore quantity
    const newSourceQty = Number(incomingItemDataSource.system.quantity) - quantityToTransfer;

    if (existingItem) {
      // Target actor has an item of this type with the same name

      // @ts-ignore quantity
      newTargetQty += Number(existingItem.system.quantity);
      const targetUpdate = await this.actor.updateEmbeddedDocuments("Item", [
        { _id: existingItem.id, system: { quantity: newTargetQty } },
      ]);
      if (targetUpdate) {
        if (newSourceQty > 0) {
          // update with new source quantity
          return (await sourceActor.updateEmbeddedDocuments("Item", [
            { _id: incomingItemDataSource._id, system: { quantity: newSourceQty } },
          ])) as RqgItem[];
        } else {
          // delete source item
          // @ts-ignore _id
          return sourceActor.deleteEmbeddedDocuments("Item", [incomingItemDataSource._id]);
        }
      }
    } else {
      // Target actor does not have an item of this type with the same name
      // @ts-ignore quantity
      incomingItemDataSource.system.quantity = newTargetQty;
      const targetCreate = await this._onDropItemCreate(incomingItemDataSource);
      if (targetCreate) {
        if (newSourceQty > 0) {
          // update with new source quantity
          return (await sourceActor.updateEmbeddedDocuments("Item", [
            { _id: incomingItemDataSource._id, system: { quantity: newSourceQty } },
          ])) as RqgItem[];
        } else {
          // delete source item
          // @ts-ignore _id
          return sourceActor.deleteEmbeddedDocuments("Item", [incomingItemDataSource._id]);
        }
      }
    }
    return false;
  }

  protected _getHeaderButtons(): Application.HeaderButton[] {
    const headerButtons = super._getHeaderButtons();
    addRqidSheetHeaderButton(headerButtons, this);

    if (
      getGame().settings.get(systemId, "actor-wizard-feature-flag") && // TODO remove when wizard is released
      !this.actor.getFlag(systemId, actorWizardFlags)?.actorWizardComplete &&
      !this.actor.getFlag(systemId, actorWizardFlags)?.isActorTemplate
    ) {
      headerButtons.splice(0, 0, {
        class: `actor-wizard-button-${this.actor.id}`,
        label: localize("RQG.ActorCreation.AdventurerCreationHeaderButton"),
        icon: "fas fa-user-edit",
        onclick: () => this._openActorWizard(),
      });
    }

    return headerButtons;
  }

  _openActorWizard() {
    new ActorWizard(this.actor, {}).render(true);
  }
}

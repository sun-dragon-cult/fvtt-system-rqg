import { PassionSheet } from "./passion-item/passionSheet";
import { ItemTypeEnum, ResponsibleItemClass } from "../data-model/item-data/itemTypes";
import { RuneSheet } from "./rune-item/runeSheet";
import { SkillSheet } from "./skill-item/skillSheet";
import { HitLocationSheet } from "./hit-location-item/hitLocationSheet";
import { GearSheet } from "./gear-item/gearSheet";
import { ArmorSheet } from "./armor-item/armorSheet";
import { WeaponSheet } from "./weapon-item/weaponSheet";
import { SpiritMagicSheet } from "./spirit-magic-item/spiritMagicSheet";
import { CultSheet } from "./cult-item/cultSheet";
import { RuneMagicSheet } from "./rune-magic-item/runeMagicSheet";
import {
  assertItemType,
  getGame,
  getSpeakerFromItem,
  hasOwnProperty,
  localize,
  requireValue,
  RqgError,
} from "../system/util";
import { HomelandSheet } from "./homeland-item/homelandSheet";
import { OccupationSheet } from "./occupation-item/occupationSheet";
import { systemId } from "../system/config";
import type { DocumentModificationOptions } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs";
import { AbilitySuccessLevelEnum } from "../rolls/AbilityRoll/AbilityRoll.defs";
import { AbilityRoll } from "../rolls/AbilityRoll/AbilityRoll";
import type { AbilityRollOptions } from "../rolls/AbilityRoll/AbilityRoll.types";
import { AbilityRollDialogV2 } from "../applications/AbilityRollDialog/abilityRollDialogV2";
import { SpiritMagicRollOptions } from "../rolls/SpiritMagicRoll/SpiritMagicRoll.types";
import { SpiritMagicRoll } from "../rolls/SpiritMagicRoll/SpiritMagicRoll";
import { SpiritMagicRollDialogV2 } from "../applications/SpiritMagicRollDialog/spiritMagicRollDialogV2";
import { RuneMagicRollDialogV2 } from "../applications/RuneMagicRollDialog/runeMagicRollDialogV2";
import { RuneMagicRoll } from "../rolls/RuneMagicRoll/RuneMagicRoll";
import type { RuneMagicRollOptions } from "../rolls/RuneMagicRoll/RuneMagicRoll.types";
import { RuneMagic } from "./rune-magic-item/runeMagic";
import { SpellRangeEnum } from "../data-model/item-data/spell";
import type { DamageType, UsageType } from "../data-model/item-data/weaponData";
import { DamageDegree } from "../system/combatCalculations.defs";
import {
  formatDamagePart,
  getNormalizedDamageFormulaAndDamageBonus,
} from "../system/combatCalculations";
import { AttackDialogV2 } from "../applications/AttackFlow/attackDialogV2";
import { Skill } from "./skill-item/skill";

export class RqgItem extends Item {
  public static init() {
    CONFIG.Item.documentClass = RqgItem;

    // @ts-expect-error applications
    const sheets = foundry.applications.apps.DocumentSheetConfig;

    // @ts-expect-error appv1
    sheets.unregisterSheet(Item, "core", foundry.appv1.sheets.ItemSheet);

    sheets.registerSheet(Item, systemId, PassionSheet, {
      label: "RQG.SheetName.Item.Passion",
      types: [ItemTypeEnum.Passion],
      makeDefault: true,
    });
    sheets.registerSheet(Item, systemId, RuneSheet, {
      label: "RQG.SheetName.Item.Rune",
      types: [ItemTypeEnum.Rune],
      makeDefault: true,
    });
    sheets.registerSheet(Item, systemId, SkillSheet, {
      label: "RQG.SheetName.Item.Skill",
      types: [ItemTypeEnum.Skill],
      makeDefault: true,
    });
    sheets.registerSheet(Item, systemId, HitLocationSheet, {
      label: "RQG.SheetName.Item.HitLocation",
      types: [ItemTypeEnum.HitLocation],
      makeDefault: true,
    });
    sheets.registerSheet(Item, systemId, HomelandSheet, {
      label: "RQG.SheetName.Item.Homeland",
      types: [ItemTypeEnum.Homeland],
      makeDefault: true,
    });
    sheets.registerSheet(Item, systemId, OccupationSheet, {
      label: "RQG.SheetName.Item.Occupation",
      types: [ItemTypeEnum.Occupation],
      makeDefault: true,
    });
    sheets.registerSheet(Item, systemId, GearSheet, {
      label: "RQG.SheetName.Item.Gear",
      types: [ItemTypeEnum.Gear],
      makeDefault: true,
    });
    sheets.registerSheet(Item, systemId, ArmorSheet, {
      label: "RQG.SheetName.Item.Armor",
      types: [ItemTypeEnum.Armor],
      makeDefault: true,
    });
    sheets.registerSheet(Item, systemId, WeaponSheet, {
      label: "RQG.SheetName.Item.Weapon",
      types: [ItemTypeEnum.Weapon],
      makeDefault: true,
    });
    sheets.registerSheet(Item, systemId, SpiritMagicSheet, {
      label: "RQG.SheetName.Item.SpiritMagicSpell",
      types: [ItemTypeEnum.SpiritMagic],
      makeDefault: true,
    });
    sheets.registerSheet(Item, systemId, CultSheet, {
      label: "RQG.SheetName.Item.Cult",
      types: [ItemTypeEnum.Cult],
      makeDefault: true,
    });
    sheets.registerSheet(Item, systemId, RuneMagicSheet, {
      label: "RQG.SheetName.Item.RuneMagicSpell",
      types: [ItemTypeEnum.RuneMagic],
      makeDefault: true,
    });
    // TODO this doesn't compile!? Sheet registration would be better in Item init
    // ResponsibleItemClass.forEach((itemClass) => itemClass.init());

    Hooks.on("preCreateItem", (document: any) => {
      const isOwnedItem =
        document instanceof RqgItem &&
        document.parent &&
        Object.values(ItemTypeEnum).includes(document.type);
      if (!isOwnedItem) {
        return true;
      }

      if (RqgItem.isDuplicateItem(document)) {
        ui.notifications?.warn(
          localize("RQG.Item.Notification.ItemNotUnique", {
            actorName: document.parent.name,
            documentType: document.type,
            documentName: document.name,
          }),
        );
        return false;
      }

      if (RqgItem.isRuneMagicWithoutCult(document)) {
        ui.notifications?.warn(
          localize("RQG.Actor.RuneMagic.EmbeddingRuneMagicWithoutCultWarning", {
            characterName: document.parent.name,
            spellName: document.name,
          }),
        );
        return false;
      }
      return true;
    });
  }

  declare system: any; // v10 type workaround
  declare flags: FlagConfig["Item"]; // type workaround

  /**
   * Open a dialog for an AbilityRoll
   */
  public async abilityRoll(): Promise<void> {
    // @ts-expect-error render
    await new AbilityRollDialogV2({ abilityItem: this }).render(true);
  }

  /**
   * Do an abilityRoll and handle checking experience afterward.
   */
  public async abilityRollImmediate(
    options: Omit<AbilityRollOptions, "naturalSkill" | "abilityItem"> = {},
  ): Promise<void> {
    if (!this.isEmbedded) {
      const msg = "Item is not embedded";
      ui.notifications?.error(msg);
      throw new RqgError(msg, this);
    }

    const chance: number = Number(this.system.chance) || 0; // Handle NaN

    const abilityRoll = await AbilityRoll.rollAndShow({
      naturalSkill: chance,
      modifiers: options?.modifiers,
      abilityName: this.name ?? undefined,
      abilityType: this.type,
      abilityImg: this.img ?? undefined,
      resultMessages: options?.resultMessages,
      speaker: getSpeakerFromItem(this),
      rollMode: options?.rollMode,
    });
    if (abilityRoll.successLevel == null) {
      throw new RqgError("Evaluated AbilityRoll didn't give successLevel");
    }
    await this.checkExperience(abilityRoll.successLevel);
  }

  /**
   * Open a dialog for a SpiritMagicRoll
   */
  public async spiritMagicRoll(): Promise<void> {
    assertItemType(this.type, ItemTypeEnum.SpiritMagic);

    // @ts-expect-error render
    await new SpiritMagicRollDialogV2({ spellItem: this }).render(true);
  }

  /**
   * Do a SpiritMagicRoll and possibly draw magic points afterward
   */
  public async spiritMagicRollImmediate(
    options: Omit<SpiritMagicRollOptions, "powX5"> = { levelUsed: this.system.points },
  ): Promise<void> {
    if (!this.isEmbedded) {
      const msg = "Item is not embedded";
      ui.notifications?.error(msg);
      throw new RqgError(msg, this);
    }

    const powX5: number = (Number(this.parent?.system.characteristics.power.value) || 0) * 5; // Handle NaN

    const spiritMagicRoll = await SpiritMagicRoll.rollAndShow({
      powX5: powX5,
      levelUsed: options.levelUsed ?? this.system.points,
      magicPointBoost: options.magicPointBoost ?? 0,
      modifiers: options?.modifiers,
      spellName: this.name ?? undefined,
      spellImg: this.img ?? undefined,
      speaker: getSpeakerFromItem(this),
      rollMode: options?.rollMode,
    });
    if (spiritMagicRoll.successLevel == null) {
      throw new RqgError("Evaluated AbilityRoll didn't give successLevel");
    }
    const mpCost = options.levelUsed + (options.magicPointBoost ?? 0);
    await this.actor?.drawMagicPoints(mpCost, spiritMagicRoll.successLevel);
  }

  /**
   * Open a dialog for a RuneMagicRoll
   */
  public async runeMagicRoll(): Promise<void> {
    assertItemType(this.type, ItemTypeEnum.RuneMagic);

    // @ts-expect-error render
    await new RuneMagicRollDialogV2({ spellItem: this }).render(true);
  }

  /**
   * Do a runeMagicRoll and possibly draw rune and magic points afterward. Also add experience to used rune.
   */
  public async runeMagicRollImmediate(options: Partial<RuneMagicRollOptions> = {}): Promise<void> {
    assertItemType(this.type, ItemTypeEnum.RuneMagic);
    if (!this.isEmbedded) {
      const msg = "Rune Magic item is not embedded";
      ui.notifications?.error(msg);
      throw new RqgError(msg, this);
    }

    const cult = this.parent?.items.find((i) => i.id === this.system.cultId);
    if (!cult) {
      const msg = "Rune Magic item isn't connected to a cult";
      ui.notifications?.error(msg);
      throw new RqgError(msg, this);
    }

    const levelUsedOrDefault = options.levelUsed ?? this.system.points;

    const validationError = RuneMagic.hasEnoughToCastSpell(
      cult,
      levelUsedOrDefault,
      options.magicPointBoost,
    );
    if (validationError) {
      ui.notifications?.warn(validationError);
      return;
    }

    const usedRune = options.usedRune
      ? options.usedRune
      : RuneMagic.getStrongestRune(RuneMagic.getEligibleRunes(this));
    if (!usedRune) {
      const msg = "Could not find a rune to use for rune magic";
      ui.notifications?.warn(msg);
      return;
    }

    const runeMagicRoll = await RuneMagicRoll.rollAndShow({
      usedRune: usedRune,
      runeMagicItem: this,
      levelUsed: levelUsedOrDefault,
      magicPointBoost: options.magicPointBoost ?? 0,
      modifiers: options?.modifiers ?? [],
      speaker: getSpeakerFromItem(this),
      rollMode: options?.rollMode,
    });
    if (runeMagicRoll.successLevel == null) {
      throw new RqgError("Evaluated RuneMagicRoll didn't give successLevel");
    }
    const mpCost = options.magicPointBoost ?? 0;
    const rpCost = options.levelUsed ?? this.system.points;
    await RuneMagic.handleRollResult(runeMagicRoll.successLevel, rpCost, mpCost, usedRune, this);
  }

  /**
   * Open an attackDialog to initiate an attack sequence
   */
  public async attack(): Promise<void> {
    assertItemType(this.type, ItemTypeEnum.Weapon);
    // @ts-expect-error render
    await new AttackDialogV2({ weaponItem: this }).render(true);
  }

  /**
   * Get a damage Roll depending on weapon usage and success level.
   * The damageBonus description & actual formula is added in applyDamageBonusToFormula
   * during combat calculations. From here it's only a placeholder like "+db".
   */
  public getDamageFormula(
    usage: UsageType | undefined,
    damageDegree: DamageDegree,
    damageType: DamageType,
  ): string | undefined {
    if (!usage) {
      return undefined;
    }
    assertItemType(this.type, ItemTypeEnum.Weapon);
    const weaponDamage = this.system.usage[usage].damage;

    requireValue(
      damageType,
      "Could not get damageType when calculating damage formula",
      this,
      usage,
      damageDegree,
      damageType,
    );

    if (damageDegree === "none") {
      return undefined;
    }

    const { damageFormula, damageBonusPlaceholder } =
      getNormalizedDamageFormulaAndDamageBonus(weaponDamage);

    if (damageDegree === "normal") {
      const weaponDamage = formatDamagePart(damageFormula, "RQG.Roll.DamageRoll.WeaponDamage");
      return `${weaponDamage}${damageBonusPlaceholder}`;
    }

    if (damageDegree === "special") {
      switch (damageType) {
        case "crush": {
          const db = this.parent?.system.attributes.damageBonus ?? "0";
          const maximisedDamageBonus = this.getMaximisedDamageBonusValue(db);

          const weaponDamage = formatDamagePart(damageFormula, "RQG.Roll.DamageRoll.WeaponDamage");
          const specialDamage = formatDamagePart(
            maximisedDamageBonus,
            "RQG.Roll.DamageRoll.SpecialDamage",
            "+",
          );
          return `${weaponDamage}${damageBonusPlaceholder}${specialDamage}`;
        }
        case "slash":
        case "impale": {
          const weaponDamage = formatDamagePart(damageFormula, "RQG.Roll.DamageRoll.WeaponDamage");
          const specialDamage = formatDamagePart(
            damageFormula,
            "RQG.Roll.DamageRoll.SpecialDamage",
            "+",
          );
          return `${weaponDamage}${specialDamage}${damageBonusPlaceholder}`;
        }
        default: {
          return undefined; // parry or special
        }
      }
    }

    if (damageDegree === "maxSpecial") {
      const db = this.parent?.system.attributes.damageBonus ?? "0";
      const maximisedDamageBonus = this.getMaximisedDamageBonusValue(db);
      const evaluatedDamageBonus = formatDamagePart(
        maximisedDamageBonus,
        "RQG.Roll.DamageRoll.DamageBonus",
        "+",
      );

      const damageFormulaRoll = new Roll(damageFormula);
      // @ts-expect-error evaluateSync
      damageFormulaRoll.evaluateSync({ maximize: true });
      const evaluatedWeaponDamage = formatDamagePart(
        damageFormulaRoll.total?.toString() ?? "",
        "RQG.Roll.DamageRoll.WeaponDamage",
      );

      switch (damageType) {
        case "crush": {
          const evaluatedSpecialDamage = formatDamagePart(
            maximisedDamageBonus,
            "RQG.Roll.DamageRoll.SpecialDamage",
            "+",
          );
          return `${evaluatedWeaponDamage}${evaluatedDamageBonus}${evaluatedSpecialDamage}`;
        }

        case "slash":
        case "impale": {
          const evaluatedSpecialDamage = formatDamagePart(
            damageFormulaRoll.total?.toString() ?? "",
            "RQG.Roll.DamageRoll.SpecialDamage",
            "+",
          );
          return `${evaluatedWeaponDamage}${evaluatedDamageBonus}${evaluatedSpecialDamage}`;
        }

        default: {
          return undefined; // parry or special
        }
      }
    }

    throw new RqgError("Tried to get damageFormula for invalid damageDegree");
  }

  /**
   * Create a string with the maximised or minimised result of a damage bonus roll.
   */
  getMaximisedDamageBonusValue(dbFormula: string): string {
    const dbRoll = new Roll(dbFormula);
    if (dbFormula.startsWith("-")) {
      // TODO Actors with negative db will actually do less damage with special success! Rule inconsistency.
      // @ts-expect-error evaluateSync
      dbRoll.evaluateSync({ minimize: true });
    } else {
      // @ts-expect-error evaluateSync
      dbRoll.evaluateSync({ maximize: true });
    }
    return dbRoll.total?.toString() ?? "";
  }

  /**
   * Give an experience check to this item if the result is a success or greater
   * and the item can get experience.
   */
  public async checkExperience(result: AbilitySuccessLevelEnum | undefined): Promise<void> {
    if (
      result &&
      result <= AbilitySuccessLevelEnum.Success &&
      !(this.system as any).hasExperience
    ) {
      await this.awardExperience();
    }
  }

  public async awardExperience() {
    if (hasOwnProperty(this.system, "hasExperience")) {
      if (hasOwnProperty(this.system, "canGetExperience") && this.system.canGetExperience) {
        if (!this.system.hasExperience) {
          await this.actor?.updateEmbeddedDocuments("Item", [
            { _id: this.id, system: { hasExperience: true } },
          ]);
          const msg = localize("RQG.Actor.AwardExperience.GainedExperienceInfo", {
            actorName: this.actor?.name,
            itemName: this.name,
          });
          ui.notifications?.info(msg);
        }
      }
    } else {
      const msg = localize("RQG.Actor.AwardExperience.ItemDoesntHaveExperienceError", {
        itemName: this.name,
        itemId: this.id,
      });
      // @ts-expect-error console
      ui.notifications?.error(msg, { console: false });
      console.error(msg);
    }
  }

  /**
   * Used for Rune & Spirit Magic items to construct a descriptions close to what as
   * is used in the books. The "1+" syntax for stackable rune magic is used
   */
  get spellSignature(): string {
    if (!hasOwnProperty(this.system, "points")) {
      console.error("RQG | Tried to get spellSignature on a non spell item");
      return "";
    }

    const descriptionParts = [];

    const stackableRuneMagic = this.system.isStackable ? "+" : "";
    const variableSpiritMagic = this.system.isVariable
      ? " " + localize("RQG.Item.SpiritMagic.Variable")
      : "";
    const pointsTranslated = localize("RQG.Item.RuneMagic.Points");
    descriptionParts.push(
      `${this.system.points}${stackableRuneMagic} ${pointsTranslated}${variableSpiritMagic}`,
    );

    if (this.system.isRitual) {
      descriptionParts.push(localize("RQG.Item.Spell.Ritual"));
    }

    if (this.system.isEnchantment) {
      descriptionParts.push(localize("RQG.Item.Spell.Enchantment"));
    }

    if (this.system.castingRange) {
      const rangeValueTranslation = localize(
        "RQG.Item.Spell.RangeEnum." + (this.system.castingRange || "undefined"),
      );
      const rangeTranslation = localize("RQG.Item.SpiritMagic.Range");
      const translation =
        this.system.castingRange === SpellRangeEnum.Special
          ? `${rangeTranslation} (${rangeValueTranslation.toLowerCase()})`
          : rangeValueTranslation;
      descriptionParts.push(translation);
    }

    if (this.system.duration) {
      const durationValueTranslation = localize(
        "RQG.Item.Spell.DurationEnum." + this.system.duration,
      );
      const durationTranslation = localize("RQG.Item.SpiritMagic.Duration");
      const translation =
        this.system.duration === SpellRangeEnum.Special
          ? `${durationTranslation} (${durationValueTranslation.toLowerCase()})`
          : durationValueTranslation;
      descriptionParts.push(translation);
    }

    if (this.system.concentration && this.type === ItemTypeEnum.SpiritMagic) {
      descriptionParts.push(
        localize("RQG.Item.Spell.ConcentrationEnum." + this.system.concentration),
      );
    }

    if (this.system.isOneUse && this.type === ItemTypeEnum.RuneMagic) {
      descriptionParts.push(localize("RQG.Item.RuneMagic.OneUse"));
    }

    return descriptionParts.join(", ");
  }

  async _preCreate(data: any, options: any, user: User): Promise<void> {
    if (this.parent && this.type === ItemTypeEnum.Skill) {
      // Update the baseChance for Dodge & Jump skills that depend on actor DEX
      const itemRqid = this.getFlag(systemId, "documentRqidFlags")?.id;
      const actorDex = this.parent.system.characteristics.dexterity.value ?? 0;
      const newBaseChance =
        itemRqid === CONFIG.RQG.skillRqid.dodge
          ? Skill.dodgeBaseChance(actorDex)
          : itemRqid === CONFIG.RQG.skillRqid.jump
            ? Skill.jumpBaseChance(actorDex)
            : undefined;
      if (newBaseChance) {
        // @ts-expect-error updateSource
        this.updateSource({ system: { baseChance: newBaseChance } });
      }
    }

    return super._preCreate(data, options, user);
  }

  protected _onCreate(
    itemData: RqgItem["system"]["_source"],
    options: DocumentModificationOptions,
    userId: string,
  ): void {
    const defaultItemIconSettings: any = getGame().settings.get(
      systemId,
      "defaultItemIconSettings",
    );
    const item = itemData._id ? getGame().items?.get(itemData._id) : undefined;
    // @ts-expect-errors Foundry v10
    const defaultIcon = foundry.documents.BaseItem.DEFAULT_ICON;

    if (item?.img === defaultIcon) {
      const updateData: any = {
        img: defaultItemIconSettings[itemData.type],
        "data.namePrefix": itemData.name,
      };

      // Set default rqid data for new items
      const rqidFlags = item?.getFlag(systemId, "documentRqidFlags");
      updateData.flags = updateData.flags ?? {};
      updateData.flags.rqg = {
        documentRqidFlags: {
          lang: rqidFlags?.lang ?? CONFIG.RQG.rqid.defaultLang,
          priority: rqidFlags?.priority ?? CONFIG.RQG.rqid.defaultPriority,
        },
      };

      if (itemData.type === ItemTypeEnum.Passion) {
        updateData.system = { subject: itemData.name };
      }

      item?.update(updateData);
    }
    return super._onCreate(itemData, options, userId);
  }

  static async updateDocuments(updates: any[], context: any): Promise<any> {
    // @ts-expect-error isEmpty
    if (foundry.utils.isEmpty(updates)) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { parent, pack, ...options } = context;
    if (parent?.documentName === "Actor") {
      updates.forEach((u) => {
        // @ts-expect-error isEmpty
        if (!foundry.utils.isEmpty(u)) {
          const document = parent.items.get(u._id);
          if (!document || document.documentName !== "Item") {
            const msg = "couldn't find item document from result";
            ui.notifications?.error(msg);
            throw new RqgError(msg, updates);
          }
          // Will update "updates" as a side effect
          ResponsibleItemClass.get(document.type)?.preUpdateItem(
            parent,
            document,
            updates,
            options,
          );
        }
      });
    }
    return super.updateDocuments(updates, context);
  }

  // Validate that embedded items are unique (name + type),
  // except for runeMagic & physical items where duplicates are allowed
  private static isDuplicateItem(document: any): boolean {
    return document.parent.items.some(
      (i: RqgItem) =>
        document.type !== ItemTypeEnum.RuneMagic &&
        document.system.physicalItemType === undefined &&
        i.name === document.name &&
        i.type === document.type,
    );
  }

  // Validate that embedded runeMagic can be connected to a cult
  private static isRuneMagicWithoutCult(document: any): boolean {
    const isRuneMagic = document.type === ItemTypeEnum.RuneMagic;
    const actorHasCult = document.parent.items.some((i: RqgItem) => i.type === ItemTypeEnum.Cult);
    const okToAdd = !isRuneMagic || !(isRuneMagic && !actorHasCult);
    return !okToAdd;
  }
}

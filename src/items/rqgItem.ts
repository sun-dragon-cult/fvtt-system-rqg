import { PassionSheet } from "./passion-item/passionSheet";
import { PassionSheetV2 } from "./passion-item/passionSheetV2";
import {
  type AbilityItem,
  abilityItemTypes,
  ItemTypeEnum,
  ResponsibleItemClass,
} from "@item-model/itemTypes.ts";
import { RuneSheet } from "./rune-item/runeSheet";
import { RuneSheetV2 } from "./rune-item/runeSheetV2";
import { SkillSheet } from "./skill-item/skillSheet";
import { SkillSheetV2 } from "./skill-item/skillSheetV2";
import { HitLocationSheet } from "./hit-location-item/hitLocationSheet";
import { HitLocationSheetV2 } from "./hit-location-item/hitLocationSheetV2";
import { GearSheet } from "./gear-item/gearSheet";
import { GearSheetV2 } from "./gear-item/gearSheetV2";
import { ArmorSheet } from "./armor-item/armorSheet";
import { ArmorSheetV2 } from "./armor-item/armorSheetV2";
import { WeaponSheet } from "./weapon-item/weaponSheet";
import { WeaponSheetV2 } from "./weapon-item/weaponSheetV2";
import { SpiritMagicSheet } from "./spirit-magic-item/spiritMagicSheet";
import { SpiritMagicSheetV2 } from "./spirit-magic-item/spiritMagicSheetV2";
import { CultSheet } from "./cult-item/cultSheet";
import { CultSheetV2 } from "./cult-item/cultSheetV2";
import { RuneMagicSheet } from "./rune-magic-item/runeMagicSheet";
import { RuneMagicSheetV2 } from "./rune-magic-item/runeMagicSheetV2";
import {
  assertDocumentSubType,
  getSpeakerFromItem,
  isDocumentSubType,
  localize,
  requireValue,
  RqgError,
} from "../system/util";
import { HomelandSheet } from "./homeland-item/homelandSheet";
import { HomelandSheetV2 } from "./homeland-item/homelandSheetV2";
import { OccupationSheet } from "./occupation-item/occupationSheet";
import { OccupationSheetV2 } from "./occupation-item/occupationSheetV2";
import { RQG_CONFIG, systemId } from "../system/config";
import { AbilitySuccessLevelEnum } from "../rolls/AbilityRoll/AbilityRoll.defs";
import { AbilityRoll } from "../rolls/AbilityRoll/AbilityRoll";
import type { AbilityRollOptions } from "../rolls/AbilityRoll/AbilityRoll.types";
import { AbilityRollDialogV2 } from "../applications/AbilityRollDialog/abilityRollDialogV2";
import type { SpiritMagicRollOptions } from "../rolls/SpiritMagicRoll/SpiritMagicRoll.types";
import { SpiritMagicRoll } from "../rolls/SpiritMagicRoll/SpiritMagicRoll";
import { SpiritMagicRollDialogV2 } from "../applications/SpiritMagicRollDialog/spiritMagicRollDialogV2";
import { RuneMagicRollDialogV2 } from "../applications/RuneMagicRollDialog/runeMagicRollDialogV2";
import { RuneMagicRoll } from "../rolls/RuneMagicRoll/RuneMagicRoll";
import type { RuneMagicRollOptions } from "../rolls/RuneMagicRoll/RuneMagicRoll.types";
import { RuneMagic } from "./rune-magic-item/runeMagic";
import { GearDataModel } from "@item-model/gearDataModel";
import { ArmorDataModel } from "@item-model/armorDataModel";
import { WeaponDataModel } from "@item-model/weaponDataModel";
import { SkillDataModel } from "@item-model/skillDataModel";
import { PassionDataModel } from "@item-model/passionDataModel";
import { RuneDataModel } from "@item-model/runeDataModel";
import { RuneMagicDataModel } from "@item-model/runeMagicDataModel";
import { SpiritMagicDataModel } from "@item-model/spiritMagicDataModel";
import { CultDataModel } from "@item-model/cultDataModel";
import { HitLocationDataModel } from "@item-model/hitLocationDataModel";
import { HomelandDataModel } from "@item-model/homelandDataModel";
import { OccupationDataModel } from "@item-model/occupationDataModel";
import {
  type SpellItem,
  SpellConcentrationEnum,
  spellItemTypes,
  SpellDurationEnum,
  SpellRangeEnum,
} from "@item-model/spell.ts";
import type { DamageType, UsageType, WeaponItem } from "@item-model/weaponData.ts";
import { DamageDegree } from "../system/combatCalculations.defs";
import {
  formatDamagePart,
  getNormalizedDamageFormulaAndDamageBonus,
} from "../system/combatCalculations";
import { AttackDialogV2 } from "../applications/AttackFlow/attackDialogV2";
import { Skill } from "./skill-item/skill";
import type { RuneMagicItem } from "@item-model/runeMagicData.ts";
import type { SpiritMagicItem } from "@item-model/spiritMagicData.ts";
import { ActorTypeEnum, type CharacterActor } from "../data-model/actor-data/rqgActorData.ts";
import type { SkillItem } from "@item-model/skillData.ts";
import type { CultItem } from "@item-model/cultData.ts";

import type { PassionItem } from "@item-model/passionData.ts";

export class RqgItem extends Item {
  public static init() {
    CONFIG.Item.documentClass = RqgItem;

    // Register DataModels for item subtypes
    CONFIG.Item.dataModels["gear"] = GearDataModel as any;
    CONFIG.Item.dataModels["armor"] = ArmorDataModel as any;
    CONFIG.Item.dataModels["weapon"] = WeaponDataModel as any;
    CONFIG.Item.dataModels["skill"] = SkillDataModel as any;
    CONFIG.Item.dataModels["passion"] = PassionDataModel as any;
    CONFIG.Item.dataModels["rune"] = RuneDataModel as any;
    CONFIG.Item.dataModels["runeMagic"] = RuneMagicDataModel as any;
    CONFIG.Item.dataModels["spiritMagic"] = SpiritMagicDataModel as any;
    CONFIG.Item.dataModels["cult"] = CultDataModel as any;
    CONFIG.Item.dataModels["hitLocation"] = HitLocationDataModel as any;
    CONFIG.Item.dataModels["homeland"] = HomelandDataModel as any;
    CONFIG.Item.dataModels["occupation"] = OccupationDataModel as any;

    const Items = foundry.documents.collections.Items;

    Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);

    Items.registerSheet(systemId, PassionSheet, {
      types: [ItemTypeEnum.Passion],
      label: "RQG.SheetName.Item.Passion",
      makeDefault: true,
    });
    Items.registerSheet(systemId, RuneSheet, {
      types: [ItemTypeEnum.Rune],
      label: "RQG.SheetName.Item.Rune",
      makeDefault: true,
    });
    Items.registerSheet(systemId, SkillSheet, {
      types: [ItemTypeEnum.Skill],
      label: "RQG.SheetName.Item.Skill",
      makeDefault: true,
    });
    Items.registerSheet(systemId, HitLocationSheet, {
      types: [ItemTypeEnum.HitLocation],
      label: "RQG.SheetName.Item.HitLocation",
      makeDefault: true,
    });
    Items.registerSheet(systemId, HomelandSheet, {
      types: [ItemTypeEnum.Homeland],
      label: "RQG.SheetName.Item.Homeland",
      makeDefault: true,
    });
    Items.registerSheet(systemId, OccupationSheet, {
      types: [ItemTypeEnum.Occupation],
      label: "RQG.SheetName.Item.Occupation",
      makeDefault: true,
    });
    Items.registerSheet(systemId, GearSheet, {
      types: [ItemTypeEnum.Gear],
      label: "RQG.SheetName.Item.Gear",
      makeDefault: true,
    });
    Items.registerSheet(systemId, ArmorSheet, {
      types: [ItemTypeEnum.Armor],
      label: "RQG.SheetName.Item.Armor",
      makeDefault: true,
    });
    Items.registerSheet(systemId, WeaponSheet, {
      types: [ItemTypeEnum.Weapon],
      label: "RQG.SheetName.Item.Weapon",
      makeDefault: true,
    });
    Items.registerSheet(systemId, SpiritMagicSheet, {
      types: [ItemTypeEnum.SpiritMagic],
      label: "RQG.SheetName.Item.SpiritMagicSpell",
      makeDefault: true,
    });
    Items.registerSheet(systemId, CultSheet, {
      types: [ItemTypeEnum.Cult],
      label: "RQG.SheetName.Item.Cult",
      makeDefault: true,
    });
    Items.registerSheet(systemId, RuneMagicSheet, {
      types: [ItemTypeEnum.RuneMagic],
      label: "RQG.SheetName.Item.RuneMagicSpell",
      makeDefault: true,
    });

    // AppV2 sheets — available as alternatives; users can switch via sheet config
    Items.registerSheet(systemId, PassionSheetV2, {
      types: [ItemTypeEnum.Passion],
      label: "RQG.SheetName.Item.PassionV2",
      makeDefault: false,
    });
    Items.registerSheet(systemId, RuneSheetV2, {
      types: [ItemTypeEnum.Rune],
      label: "RQG.SheetName.Item.RuneV2",
      makeDefault: false,
    });
    Items.registerSheet(systemId, SkillSheetV2, {
      types: [ItemTypeEnum.Skill],
      label: "RQG.SheetName.Item.SkillV2",
      makeDefault: false,
    });
    Items.registerSheet(systemId, HitLocationSheetV2, {
      types: [ItemTypeEnum.HitLocation],
      label: "RQG.SheetName.Item.HitLocationV2",
      makeDefault: false,
    });
    Items.registerSheet(systemId, HomelandSheetV2, {
      types: [ItemTypeEnum.Homeland],
      label: "RQG.SheetName.Item.HomelandV2",
      makeDefault: false,
    });
    Items.registerSheet(systemId, OccupationSheetV2, {
      types: [ItemTypeEnum.Occupation],
      label: "RQG.SheetName.Item.OccupationV2",
      makeDefault: false,
    });
    Items.registerSheet(systemId, GearSheetV2, {
      types: [ItemTypeEnum.Gear],
      label: "RQG.SheetName.Item.GearV2",
      makeDefault: false,
    });
    Items.registerSheet(systemId, ArmorSheetV2, {
      types: [ItemTypeEnum.Armor],
      label: "RQG.SheetName.Item.ArmorV2",
      makeDefault: false,
    });
    Items.registerSheet(systemId, WeaponSheetV2, {
      types: [ItemTypeEnum.Weapon],
      label: "RQG.SheetName.Item.WeaponV2",
      makeDefault: false,
    });
    Items.registerSheet(systemId, SpiritMagicSheetV2, {
      types: [ItemTypeEnum.SpiritMagic],
      label: "RQG.SheetName.Item.SpiritMagicSpellV2",
      makeDefault: false,
    });
    Items.registerSheet(systemId, CultSheetV2, {
      types: [ItemTypeEnum.Cult],
      label: "RQG.SheetName.Item.CultV2",
      makeDefault: false,
    });
    Items.registerSheet(systemId, RuneMagicSheetV2, {
      types: [ItemTypeEnum.RuneMagic],
      label: "RQG.SheetName.Item.RuneMagicSpellV2",
      makeDefault: false,
    });

    Hooks.on("preCreateItem", (document: any) => {
      const isOwnedItem =
        document instanceof RqgItem &&
        document.parent &&
        Object.values(ItemTypeEnum).includes(document.type as any);
      if (!isOwnedItem) {
        return true;
      }

      if (RqgItem.isDuplicateItem(document)) {
        ui.notifications?.warn(
          localize("RQG.Item.Notification.ItemNotUnique", {
            actorName: document.parent?.name ?? "",
            documentType: document.type,
            documentName: document.name,
          }),
        );
        return false;
      }

      if (RqgItem.isRuneMagicWithoutCult(document)) {
        ui.notifications?.warn(
          localize("RQG.Actor.RuneMagic.EmbeddingRuneMagicWithoutCultWarning", {
            characterName: document.parent?.name ?? "",
            spellName: document.name,
          }),
        );
        return false;
      }
      return true;
    });
  }

  /**
   * Open a dialog for an AbilityRoll
   */
  public async abilityRoll(): Promise<void> {
    assertDocumentSubType<AbilityItem>(this, abilityItemTypes);
    await new AbilityRollDialogV2(this).render(true);
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
    assertDocumentSubType<AbilityItem>(this, abilityItemTypes);

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
    assertDocumentSubType<SpiritMagicItem>(this, ItemTypeEnum.SpiritMagic);
    await new SpiritMagicRollDialogV2(this).render(true);
  }

  /**
   * Do a SpiritMagicRoll and possibly draw magic points afterward
   */
  public async spiritMagicRollImmediate(
    options: Omit<SpiritMagicRollOptions, "powX5"> = {
      levelUsed: (this as SpiritMagicItem).system.points,
    },
  ): Promise<void> {
    assertDocumentSubType<SpiritMagicItem>(this, ItemTypeEnum.SpiritMagic);
    const actor = this.actor;
    assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character, "Item is not embedded");

    const powX5: number = (Number(actor.system.characteristics.power.value) || 0) * 5; // Handle NaN

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
    assertDocumentSubType<RuneMagicItem>(this, ItemTypeEnum.RuneMagic);
    await new RuneMagicRollDialogV2(this).render(true);
  }

  /**
   * Do a runeMagicRoll and possibly draw rune and magic points afterward. Also add experience to used rune.
   */
  public async runeMagicRollImmediate(options: Partial<RuneMagicRollOptions> = {}): Promise<void> {
    assertDocumentSubType<RuneMagicItem>(this, ItemTypeEnum.RuneMagic);

    const actor = this.parent;
    assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character, "Item is not embedded");

    const cult = actor.items.find((i) => i.id === this.system.cultId) as RqgItem | undefined;
    if (!cult) {
      const msg = "Rune Magic item isn't connected to a cult";
      ui.notifications?.error(msg);
      throw new RqgError(msg, this);
    }
    assertDocumentSubType<CultItem>(cult, ItemTypeEnum.Cult);

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
    assertDocumentSubType<WeaponItem>(this, ItemTypeEnum.Weapon);
    await new AttackDialogV2(this).render(true);
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
    assertDocumentSubType<WeaponItem>(this, ItemTypeEnum.Weapon);
    const weaponDamage = this.system.usage[usage].damage;
    const actor = this.parent;
    assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character, "Item is not embedded");
    const damageBonus = actor.system.attributes.damageBonus ?? "0";

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
          const maximisedDamageBonus = this.getMaximisedDamageBonusValue(damageBonus);

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
      const maximisedDamageBonus = this.getMaximisedDamageBonusValue(damageBonus);
      const evaluatedDamageBonus = formatDamagePart(
        maximisedDamageBonus,
        "RQG.Roll.DamageRoll.DamageBonus",
        "+",
      );

      const damageFormulaRoll = new Roll(damageFormula);
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
      dbRoll.evaluateSync({ minimize: true });
    } else {
      dbRoll.evaluateSync({ maximize: true });
    }
    return dbRoll.total?.toString() ?? "";
  }

  /**
   * Give an experience check to this item if the result is a success or greater
   * and the item can get experience.
   * A successful Worship skill roll also awards the actor a POW experience check.
   * A successful Spirit Combat skill roll with a chance below 95% also awards POW experience.
   */
  public async checkExperience(result: AbilitySuccessLevelEnum | undefined): Promise<void> {
    assertDocumentSubType<AbilityItem>(
      this,
      abilityItemTypes,
      "RQG.Actor.AwardExperience.ItemDoesntHaveExperienceError",
    );
    const isSuccess = result != null && result <= AbilitySuccessLevelEnum.Success;
    if (isSuccess && !this.system.hasExperience) {
      await this.awardExperience();
    }
    const rqid = this.getFlag(systemId, "documentRqidFlags")?.id;
    if (
      isSuccess &&
      isDocumentSubType<SkillItem>(this, ItemTypeEnum.Skill) &&
      (rqid?.startsWith(RQG_CONFIG.skillRqid.worship) || rqid === RQG_CONFIG.skillRqid.spiritCombat)
    ) {
      const actor = this.actor;
      if (actor && isDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character)) {
        await actor.awardPowExperience();
      }
    }
  }

  public async awardExperience() {
    assertDocumentSubType<AbilityItem>(
      this,
      abilityItemTypes,
      "RQG.Actor.AwardExperience.ItemDoesntHaveExperienceError",
    );
    if (this.system.canGetExperience && !this.system.hasExperience) {
      await this.actor?.updateEmbeddedDocuments("Item", [
        { _id: this.id, system: { hasExperience: true } },
      ]);
      const msg = localize("RQG.Actor.AwardExperience.GainedExperienceInfo", {
        actorName: this.actor?.name ?? "",
        itemName: this.name,
      });
      ui.notifications?.info(msg);
    }
  }

  /**
   * Used for Rune & Spirit Magic items to construct a descriptions close to what as
   * is used in the books. The "1+" syntax for stackable rune magic is used
   */
  get spellSummary(): string {
    assertDocumentSubType<SpellItem>(
      this,
      spellItemTypes,
      "Tried to get spellSummary on a non spell item: " + this.type,
    );

    const descriptionParts = [];
    const isSpiritMagic = isDocumentSubType<SpiritMagicItem>(this, ItemTypeEnum.SpiritMagic);
    const isRuneMagic = isDocumentSubType<RuneMagicItem>(this, ItemTypeEnum.RuneMagic);

    const stackableRuneMagic = isRuneMagic && this.system.isStackable ? "+" : "";
    const variableSpiritMagic =
      isSpiritMagic && this.system.isVariable
        ? " " + localize("RQG.Item.SpiritMagic.Variable")
        : "";
    const pointsTranslated =
      this.system.points === 1
        ? localize("RQG.Item.Spell.Point")
        : localize("RQG.Item.Spell.Points");
    descriptionParts.push(
      `${this.system.points}${stackableRuneMagic} ${pointsTranslated}${variableSpiritMagic}`,
    );

    if (this.system.isRitual) {
      descriptionParts.push(localize("RQG.Item.Spell.Ritual"));
    }

    if (this.system.isEnchantment) {
      descriptionParts.push(localize("RQG.Item.Spell.Enchantment"));
    }

    const isDefaultRange = this.system.castingRange === SpellRangeEnum.Ranged;
    if (this.system.castingRange && !isDefaultRange) {
      const rangeValueTranslation = localize(
        "RQG.Item.Spell.RangeEnum." + (this.system.castingRange || "undefined"),
      );
      const rangeTranslation = localize("RQG.Item.SpiritMagic.Range");
      const translation =
        this.system.castingRange === SpellRangeEnum.Special
          ? `${rangeTranslation}(${rangeValueTranslation.toLowerCase()})`
          : rangeValueTranslation;
      descriptionParts.push(translation);
    }

    const isDefaultDuration = this.system.duration === SpellDurationEnum.Temporal;
    if (this.system.duration && !isDefaultDuration) {
      const durationValueTranslation = localize(
        "RQG.Item.Spell.DurationEnum." + this.system.duration,
      );
      const durationTranslation = localize("RQG.Item.SpiritMagic.Duration");
      const translation =
        this.system.duration === SpellDurationEnum.Special
          ? `${durationTranslation}(${durationValueTranslation.toLowerCase()})`
          : durationValueTranslation;
      descriptionParts.push(translation);
    }

    if (this.system.concentration === SpellConcentrationEnum.Active) {
      descriptionParts.push(
        localize("RQG.Item.Spell.ConcentrationEnum." + this.system.concentration),
      );
    }

    if (isRuneMagic && this.system.isOneUse) {
      descriptionParts.push(localize("RQG.Item.RuneMagic.OneUse"));
    }

    return descriptionParts.join(", ");
  }

  /**
   * Compact tooltip listing all values that feed spellSummary formatting.
   */
  get spellSummaryTooltip(): string {
    assertDocumentSubType<SpellItem>(
      this,
      spellItemTypes,
      "Tried to get spellSummaryTooltip on a non spell item: " + this.type,
    );

    const yes = localize("RQG.Dialog.Common.yes");

    const isRuneMagic = isDocumentSubType<RuneMagicItem>(this, ItemTypeEnum.RuneMagic);

    const range =
      isRuneMagic && this.system.castingRange === SpellRangeEnum.Ranged
        ? "160m"
        : this.system.castingRange === SpellRangeEnum.Ranged
          ? "50m"
          : localize("RQG.Item.Spell.RangeEnum." + (this.system.castingRange || "undefined"));
    const duration =
      isRuneMagic && this.system.duration === SpellDurationEnum.Temporal
        ? "15 minutes"
        : this.system.duration === SpellDurationEnum.Temporal
          ? "2 minutes"
          : localize("RQG.Item.Spell.DurationEnum." + (this.system.duration || "undefined"));
    const concentration = localize(
      "RQG.Item.Spell.ConcentrationEnum." + (this.system.concentration || "undefined"),
    );

    const descriptionParts = [`Range: ${range}`, `Duration: ${duration}`];

    if (this.system.duration !== SpellDurationEnum.Instant) {
      descriptionParts.push(concentration);
    }

    if (isRuneMagic && this.system.isStackable) {
      descriptionParts.push(localize("RQG.Item.RuneMagic.Stackable"));
    }
    if (isRuneMagic && this.system.isEnchantment) {
      descriptionParts.push(`Enchantment: ${yes}`);
    }

    return descriptionParts.join(" | ");
  }

  override async _preCreate(data: any, options: any, user: User): Promise<void> {
    if (this.parent && isDocumentSubType<SkillItem>(this, ItemTypeEnum.Skill)) {
      assertDocumentSubType<CharacterActor>(this.parent, ActorTypeEnum.Character);
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
        this.updateSource({ system: { baseChance: newBaseChance } });
      }
    }

    await super._preCreate(data, options, user);
  }

  protected override _onCreate(itemData: any, options: never, userId: string): void {
    const defaultItemIconSettings: any = game.settings?.get(systemId, "defaultItemIconSettings");
    const item = itemData._id ? game.items?.get(itemData._id) : undefined;
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

      if (isDocumentSubType<PassionItem>(itemData, ItemTypeEnum.Passion)) {
        updateData.system = { subject: itemData.name };
      }

      item?.update(updateData);
    }
    return super._onCreate(itemData, options, userId);
  }

  static override async updateDocuments(updates: any[], context: any): Promise<any> {
    if (foundry.utils.isEmpty(updates)) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { parent, pack, ...options } = context;
    if (parent?.documentName === "Actor") {
      updates.forEach((u) => {
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
    const isRuneMagic = isDocumentSubType<RuneMagicItem>(document, ItemTypeEnum.RuneMagic);
    const actorHasCult: boolean = document.parent.items.some((i: RqgItem) =>
      isDocumentSubType<CultItem>(i, ItemTypeEnum.Cult),
    );
    const okToAdd = !isRuneMagic || !(isRuneMagic && !actorHasCult);
    return !okToAdd;
  }
}

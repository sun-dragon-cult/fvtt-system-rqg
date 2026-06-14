import { PassionSheet } from "./passion-item/passion-sheet";
import { PassionSheetV2 } from "./passion-item/passion-sheet-v2";
import { type AbilityItem, abilityItemTypes, ItemTypeEnum } from "@item-model/item-types.ts";
import { RuneSheet } from "./rune-item/rune-sheet";
import { RuneSheetV2 } from "./rune-item/rune-sheet-v2";
import { SkillSheet } from "./skill-item/skill-sheet";
import { SkillSheetV2 } from "./skill-item/skill-sheet-v2";
import { HitLocationSheet } from "./hit-location-item/hit-location-sheet";
import { HitLocationSheetV2 } from "./hit-location-item/hit-location-sheet-v2";
import { GearSheet } from "./gear-item/gear-sheet";
import { GearSheetV2 } from "./gear-item/gear-sheet-v2";
import { ArmorSheet } from "./armor-item/armor-sheet";
import { ArmorSheetV2 } from "./armor-item/armor-sheet-v2";
import { WeaponSheet } from "./weapon-item/weapon-sheet";
import { WeaponSheetV2 } from "./weapon-item/weapon-sheet-v2";
import { SpiritMagicSheet } from "./spirit-magic-item/spirit-magic-sheet";
import { SpiritMagicSheetV2 } from "./spirit-magic-item/spirit-magic-sheet-v2";
import { CultSheet } from "./cult-item/cult-sheet";
import { CultSheetV2 } from "./cult-item/cult-sheet-v2";
import { RuneMagicSheet } from "./rune-magic-item/rune-magic-sheet";
import { RuneMagicSheetV2 } from "./rune-magic-item/rune-magic-sheet-v2";
import { assertDocumentSubType, isDocumentSubType, localize } from "../system/util";
import { HomelandSheet } from "./homeland-item/homeland-sheet";
import { HomelandSheetV2 } from "./homeland-item/homeland-sheet-v2";
import { OccupationSheet } from "./occupation-item/occupation-sheet";
import { OccupationSheetV2 } from "./occupation-item/occupation-sheet-v2";
import { systemId } from "../system/config";
import { AbilitySuccessLevelEnum } from "../rolls/ability-roll/ability-roll.defs";
import type { AbilityRollOptions } from "../rolls/ability-roll/ability-roll.types";
import type { SpiritMagicRollOptions } from "../rolls/spirit-magic-roll/spirit-magic-roll.types";
import type { RuneMagicRollOptions } from "../rolls/rune-magic-roll/rune-magic-roll.types";
import { GearDataModel } from "@item-model/gear-data-model";
import { ArmorDataModel } from "@item-model/armor-data-model";
import { WeaponDataModel } from "@item-model/weapon-data-model";
import { SkillDataModel } from "@item-model/skill-data-model";
import { PassionDataModel } from "@item-model/passion-data-model";
import { RuneDataModel } from "@item-model/rune-data-model";
import { RuneMagicDataModel } from "@item-model/rune-magic-data-model";
import { SpiritMagicDataModel } from "@item-model/spirit-magic-data-model";
import { CultDataModel } from "@item-model/cult-data-model";
import { HitLocationDataModel } from "@item-model/hit-location-data-model";
import { HomelandDataModel } from "@item-model/homeland-data-model";
import { OccupationDataModel } from "@item-model/occupation-data-model";
import { type SpellItem, spellItemTypes } from "@item-model/spell.ts";
import type { DamageType, UsageType, WeaponItem } from "@item-model/weapon-data-model.ts";
import { DamageDegree } from "../system/combat-calculations.defs";
import { dodgeBaseChance, jumpBaseChance } from "./skill-item/skill-formulas";
import type { RuneMagicItem } from "@item-model/rune-magic-data-model.ts";
import type { SpiritMagicItem } from "@item-model/spirit-magic-data-model.ts";
import { ActorTypeEnum, type CharacterActor } from "../data-model/actor-data/rqg-actor-data.ts";
import type { SkillItem } from "@item-model/skill-data-model.ts";
import type { CultItem } from "@item-model/cult-data-model.ts";
import { physicalItemTypes } from "@item-model/i-physical-item.ts";

import type { PassionItem } from "@item-model/passion-data-model.ts";
import { handleItemUpdateDocumentsPreUpdate } from "./item-lifecycle-strategy";
import {
  applyWoundToHitLocation,
  healWoundOnHitLocation,
  type ApplyWoundToHitLocationOptions,
} from "./hit-location-item";

export type { ApplyWoundToHitLocationOptions } from "./hit-location-item";

export class RqgItem extends Item {
  public static init() {
    CONFIG.Item.documentClass = RqgItem;

    // Register DataModels for item subtypes
    CONFIG.Item.dataModels["gear"] = GearDataModel;
    CONFIG.Item.dataModels["armor"] = ArmorDataModel;
    CONFIG.Item.dataModels["weapon"] = WeaponDataModel;
    CONFIG.Item.dataModels["skill"] = SkillDataModel;
    CONFIG.Item.dataModels["passion"] = PassionDataModel;
    CONFIG.Item.dataModels["rune"] = RuneDataModel;
    CONFIG.Item.dataModels["runeMagic"] = RuneMagicDataModel;
    CONFIG.Item.dataModels["spiritMagic"] = SpiritMagicDataModel;
    CONFIG.Item.dataModels["cult"] = CultDataModel;
    CONFIG.Item.dataModels["hitLocation"] = HitLocationDataModel;
    CONFIG.Item.dataModels["homeland"] = HomelandDataModel;
    CONFIG.Item.dataModels["occupation"] = OccupationDataModel;

    const Items = foundry.documents.collections.Items;

    Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);

    // AppV1 sheets — kept as non-default alternatives; will be removed in a future release
    Items.registerSheet(systemId, PassionSheet, {
      types: [ItemTypeEnum.Passion],
      label: "RQG.SheetName.Item.Passion",
      makeDefault: false,
    });
    Items.registerSheet(systemId, RuneSheet, {
      types: [ItemTypeEnum.Rune],
      label: "RQG.SheetName.Item.Rune",
      makeDefault: false,
    });
    Items.registerSheet(systemId, SkillSheet, {
      types: [ItemTypeEnum.Skill],
      label: "RQG.SheetName.Item.Skill",
      makeDefault: false,
    });
    Items.registerSheet(systemId, HitLocationSheet, {
      types: [ItemTypeEnum.HitLocation],
      label: "RQG.SheetName.Item.HitLocation",
      makeDefault: false,
    });
    Items.registerSheet(systemId, HomelandSheet, {
      types: [ItemTypeEnum.Homeland],
      label: "RQG.SheetName.Item.Homeland",
      makeDefault: false,
    });
    Items.registerSheet(systemId, OccupationSheet, {
      types: [ItemTypeEnum.Occupation],
      label: "RQG.SheetName.Item.Occupation",
      makeDefault: false,
    });
    Items.registerSheet(systemId, GearSheet, {
      types: [ItemTypeEnum.Gear],
      label: "RQG.SheetName.Item.Gear",
      makeDefault: false,
    });
    Items.registerSheet(systemId, ArmorSheet, {
      types: [ItemTypeEnum.Armor],
      label: "RQG.SheetName.Item.Armor",
      makeDefault: false,
    });
    Items.registerSheet(systemId, WeaponSheet, {
      types: [ItemTypeEnum.Weapon],
      label: "RQG.SheetName.Item.Weapon",
      makeDefault: false,
    });
    Items.registerSheet(systemId, SpiritMagicSheet, {
      types: [ItemTypeEnum.SpiritMagic],
      label: "RQG.SheetName.Item.SpiritMagicSpell",
      makeDefault: false,
    });
    Items.registerSheet(systemId, CultSheet, {
      types: [ItemTypeEnum.Cult],
      label: "RQG.SheetName.Item.Cult",
      makeDefault: false,
    });
    Items.registerSheet(systemId, RuneMagicSheet, {
      types: [ItemTypeEnum.RuneMagic],
      label: "RQG.SheetName.Item.RuneMagicSpell",
      makeDefault: false,
    });

    // AppV2 sheets — available as alternatives; users can switch via sheet config
    // AppV2 sheets — default for all item types
    Items.registerSheet(systemId, PassionSheetV2, {
      types: [ItemTypeEnum.Passion],
      label: "RQG.SheetName.Item.PassionV2",
      makeDefault: true,
    });
    Items.registerSheet(systemId, RuneSheetV2, {
      types: [ItemTypeEnum.Rune],
      label: "RQG.SheetName.Item.RuneV2",
      makeDefault: true,
    });
    Items.registerSheet(systemId, SkillSheetV2, {
      types: [ItemTypeEnum.Skill],
      label: "RQG.SheetName.Item.SkillV2",
      makeDefault: true,
    });
    Items.registerSheet(systemId, HitLocationSheetV2, {
      types: [ItemTypeEnum.HitLocation],
      label: "RQG.SheetName.Item.HitLocationV2",
      makeDefault: true,
    });
    Items.registerSheet(systemId, HomelandSheetV2, {
      types: [ItemTypeEnum.Homeland],
      label: "RQG.SheetName.Item.HomelandV2",
      makeDefault: true,
    });
    Items.registerSheet(systemId, OccupationSheetV2, {
      types: [ItemTypeEnum.Occupation],
      label: "RQG.SheetName.Item.OccupationV2",
      makeDefault: true,
    });
    Items.registerSheet(systemId, GearSheetV2, {
      types: [ItemTypeEnum.Gear],
      label: "RQG.SheetName.Item.GearV2",
      makeDefault: true,
    });
    Items.registerSheet(systemId, ArmorSheetV2, {
      types: [ItemTypeEnum.Armor],
      label: "RQG.SheetName.Item.ArmorV2",
      makeDefault: true,
    });
    Items.registerSheet(systemId, WeaponSheetV2, {
      types: [ItemTypeEnum.Weapon],
      label: "RQG.SheetName.Item.WeaponV2",
      makeDefault: true,
    });
    Items.registerSheet(systemId, SpiritMagicSheetV2, {
      types: [ItemTypeEnum.SpiritMagic],
      label: "RQG.SheetName.Item.SpiritMagicSpellV2",
      makeDefault: true,
    });
    Items.registerSheet(systemId, CultSheetV2, {
      types: [ItemTypeEnum.Cult],
      label: "RQG.SheetName.Item.CultV2",
      makeDefault: true,
    });
    Items.registerSheet(systemId, RuneMagicSheetV2, {
      types: [ItemTypeEnum.RuneMagic],
      label: "RQG.SheetName.Item.RuneMagicSpellV2",
      makeDefault: true,
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
  public async abilityRoll(token?: TokenDocument | null): Promise<void> {
    assertDocumentSubType<AbilityItem>(this, abilityItemTypes);
    await this.system.abilityRoll(token);
  }

  /**
   * Do an abilityRoll and handle checking experience afterward.
   */
  public async abilityRollImmediate(
    options: Omit<AbilityRollOptions, "naturalSkill" | "abilityItem"> = {},
    token?: TokenDocument | null,
  ): Promise<void> {
    assertDocumentSubType<AbilityItem>(this, abilityItemTypes);
    await this.system.abilityRollImmediate(options, token);
  }

  /**
   * Open a dialog for a SpiritMagicRoll
   */
  public async spiritMagicRoll(token?: TokenDocument | null): Promise<void> {
    assertDocumentSubType<SpiritMagicItem>(this, ItemTypeEnum.SpiritMagic);
    await this.system.spiritMagicRoll(token);
  }

  /**
   * Do a SpiritMagicRoll and possibly draw magic points afterward
   */
  public async spiritMagicRollImmediate(
    options: Omit<SpiritMagicRollOptions, "powX5"> = {
      levelUsed: (this as SpiritMagicItem).system.points,
    },
    token?: TokenDocument | null,
  ): Promise<void> {
    assertDocumentSubType<SpiritMagicItem>(this, ItemTypeEnum.SpiritMagic);
    await this.system.spiritMagicRollImmediate(options, token);
  }

  /**
   * Open a dialog for a RuneMagicRoll
   */
  public async runeMagicRoll(token?: TokenDocument | null): Promise<void> {
    assertDocumentSubType<RuneMagicItem>(this, ItemTypeEnum.RuneMagic);
    await this.system.runeMagicRoll(token);
  }

  /**
   * Do a runeMagicRoll and possibly draw rune and magic points afterward. Also add experience to used rune.
   */
  public async runeMagicRollImmediate(
    options: Partial<RuneMagicRollOptions> = {},
    token?: TokenDocument | null,
  ): Promise<void> {
    assertDocumentSubType<RuneMagicItem>(this, ItemTypeEnum.RuneMagic);
    await this.system.runeMagicRollImmediate(options, token);
  }

  /**
   * Open an attackDialog to initiate an attack sequence
   */
  public async attack(): Promise<void> {
    assertDocumentSubType<WeaponItem>(this, ItemTypeEnum.Weapon);
    await this.system.attack();
  }

  /** Apply damage as a wound on this hit-location item. */
  public async applyWound(
    damage: number,
    options: ApplyWoundToHitLocationOptions = {},
  ): Promise<void> {
    await applyWoundToHitLocation(this, damage, options);
  }

  /** Heal one wound entry on this hit-location item. */
  public async healWound(healWoundIndex: number, healPoints: number): Promise<boolean> {
    return healWoundOnHitLocation(this, healWoundIndex, healPoints);
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
    assertDocumentSubType<WeaponItem>(this, ItemTypeEnum.Weapon);
    return this.system.getDamageFormula(usage, damageDegree, damageType);
  }

  /**
   * Create a string with the maximised or minimised result of a damage bonus roll.
   */
  getMaximisedDamageBonusValue(dbFormula: string): string {
    assertDocumentSubType<WeaponItem>(this, ItemTypeEnum.Weapon);
    return this.system.getMaximisedDamageBonusValue(dbFormula);
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
    await this.system.checkExperience(result);
  }

  public async awardExperience(): Promise<void> {
    assertDocumentSubType<AbilityItem>(
      this,
      abilityItemTypes,
      "RQG.Actor.AwardExperience.ItemDoesntHaveExperienceError",
    );
    await this.system.awardExperience();
  }

  /**
   * Used for Rune & Spirit Magic items to construct a description close to what
   * is used in the books. The "1+" syntax for stackable rune magic is used
   */
  get spellSummary(): string {
    assertDocumentSubType<SpellItem>(
      this,
      spellItemTypes,
      "Tried to get spellSummary on a non spell item: " + this.type,
    );
    return this.system.spellSummary;
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
    return this.system.spellSummaryTooltip;
  }

  override async _preCreate(data: any, options: any, user: User): Promise<void> {
    if (this.parent && isDocumentSubType<SkillItem>(this, ItemTypeEnum.Skill)) {
      assertDocumentSubType<CharacterActor>(this.parent, ActorTypeEnum.Character);
      // Update the baseChance for Dodge & Jump skills that depend on actor DEX
      const itemRqid = this.getFlag(systemId, "documentRqidFlags")?.id;
      const actorDex = this.parent.system.characteristics.dexterity.value ?? 0;
      const newBaseChance =
        itemRqid === CONFIG.RQG.skillRqid.dodge
          ? dodgeBaseChance(actorDex)
          : itemRqid === CONFIG.RQG.skillRqid.jump
            ? jumpBaseChance(actorDex)
            : undefined;
      if (newBaseChance) {
        this.updateSource({ system: { baseChance: newBaseChance } });
      }
    }

    // @ts-expect-error TEMP(v14-types) runtime accepts User with nullable id
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

  protected override _onUpdate(
    changed: Record<string, unknown>,
    options: any,
    userId: string,
  ): void {
    super._onUpdate(changed as any, options as any, userId as any);

    // Only the originating client should issue follow-up writes.
    if (userId !== game.user?.id) {
      return;
    }

    if (!physicalItemTypes.includes(this.type as any)) {
      return;
    }

    const equippedStatusChanged =
      foundry.utils.hasProperty(changed, "system.equippedStatus") ||
      (foundry.utils.hasProperty(changed, "system") &&
        foundry.utils.hasProperty((changed as any).system, "equippedStatus"));
    if (!equippedStatusChanged) {
      return;
    }

    const shouldDisable = this.system.equippedStatus !== "equipped";
    const updates = this.effects.contents
      .filter(
        (effect) =>
          foundry.utils.getProperty(effect, "system.matchSuspensionToEquippedStatus") === true,
      )
      .filter((effect) => effect.disabled !== shouldDisable)
      .map((effect) => ({ _id: effect.id, disabled: shouldDisable }));

    if (updates.length > 0) {
      void this.updateEmbeddedDocuments("ActiveEffect", updates);
    }
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
            return; // Skip preUpdateItem for invalid documents not in the collection
          }
          handleItemUpdateDocumentsPreUpdate(parent, document, updates, options);
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

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
import { assertDocumentSubType, isDocumentSubType, localize } from "../system/util";
import { HomelandSheet } from "./homeland-item/homelandSheet";
import { HomelandSheetV2 } from "./homeland-item/homelandSheetV2";
import { OccupationSheet } from "./occupation-item/occupationSheet";
import { OccupationSheetV2 } from "./occupation-item/occupationSheetV2";
import { systemId } from "../system/config";
import { AbilitySuccessLevelEnum } from "../rolls/AbilityRoll/AbilityRoll.defs";
import type { AbilityRollOptions } from "../rolls/AbilityRoll/AbilityRoll.types";
import type { SpiritMagicRollOptions } from "../rolls/SpiritMagicRoll/SpiritMagicRoll.types";
import type { RuneMagicRollOptions } from "../rolls/RuneMagicRoll/RuneMagicRoll.types";
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
import { type SpellItem, spellItemTypes } from "@item-model/spell.ts";
import type { DamageType, UsageType, WeaponItem } from "@item-model/weaponDataModel.ts";
import { DamageDegree } from "../system/combatCalculations.defs";
import { Skill } from "./skill-item/skill";
import type { RuneMagicItem } from "@item-model/runeMagicDataModel.ts";
import type { SpiritMagicItem } from "@item-model/spiritMagicDataModel.ts";
import { ActorTypeEnum, type CharacterActor } from "../data-model/actor-data/rqgActorData.ts";
import type { SkillItem } from "@item-model/skillDataModel.ts";
import type { CultItem } from "@item-model/cultDataModel.ts";

import type { PassionItem } from "@item-model/passionDataModel.ts";

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
    await this.system.abilityRoll();
  }

  /**
   * Do an abilityRoll and handle checking experience afterward.
   */
  public async abilityRollImmediate(
    options: Omit<AbilityRollOptions, "naturalSkill" | "abilityItem"> = {},
  ): Promise<void> {
    assertDocumentSubType<AbilityItem>(this, abilityItemTypes);
    await this.system.abilityRollImmediate(options);
  }

  /**
   * Open a dialog for a SpiritMagicRoll
   */
  public async spiritMagicRoll(): Promise<void> {
    assertDocumentSubType<SpiritMagicItem>(this, ItemTypeEnum.SpiritMagic);
    await this.system.spiritMagicRoll();
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
    await this.system.spiritMagicRollImmediate(options);
  }

  /**
   * Open a dialog for a RuneMagicRoll
   */
  public async runeMagicRoll(): Promise<void> {
    assertDocumentSubType<RuneMagicItem>(this, ItemTypeEnum.RuneMagic);
    await this.system.runeMagicRoll();
  }

  /**
   * Do a runeMagicRoll and possibly draw rune and magic points afterward. Also add experience to used rune.
   */
  public async runeMagicRollImmediate(options: Partial<RuneMagicRollOptions> = {}): Promise<void> {
    assertDocumentSubType<RuneMagicItem>(this, ItemTypeEnum.RuneMagic);
    await this.system.runeMagicRollImmediate(options);
  }

  /**
   * Open an attackDialog to initiate an attack sequence
   */
  public async attack(): Promise<void> {
    assertDocumentSubType<WeaponItem>(this, ItemTypeEnum.Weapon);
    await this.system.attack();
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
            return; // Skip preUpdateItem for invalid documents not in the collection
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

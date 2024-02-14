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
import { getGame, hasOwnProperty, localize, RqgError } from "../system/util";
import { HomelandSheet } from "./homeland-item/homelandSheet";
import { OccupationSheet } from "./occupation-item/occupationSheet";
import { systemId } from "../system/config";
import type { DocumentModificationOptions } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs";
import type { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";
import { AbilitySuccessLevelEnum } from "../rolls/AbilityRoll/AbilityRoll.defs";
import { AbilityRoll } from "../rolls/AbilityRoll/AbilityRoll";
import { AbilityRollOptions, Modifier } from "../rolls/AbilityRoll/AbilityRoll.types";
import { AbilityRollDialog } from "../applications/AbilityRollDialog/abilityRollDialog";

export class RqgItem extends Item {
  public static init() {
    CONFIG.Item.documentClass = RqgItem;

    Items.unregisterSheet("core", ItemSheet);

    Items.registerSheet(systemId, PassionSheet as any, {
      label: "RQG.SheetName.Item.Passion",
      types: [ItemTypeEnum.Passion],
      makeDefault: true,
    });
    Items.registerSheet(systemId, RuneSheet as any, {
      label: "RQG.SheetName.Item.Rune",
      types: [ItemTypeEnum.Rune],
      makeDefault: true,
    });
    Items.registerSheet(systemId, SkillSheet as any, {
      label: "RQG.SheetName.Item.Skill",
      types: [ItemTypeEnum.Skill],
      makeDefault: true,
    });
    Items.registerSheet(systemId, HitLocationSheet as any, {
      label: "RQG.SheetName.Item.HitLocation",
      types: [ItemTypeEnum.HitLocation],
      makeDefault: true,
    });
    Items.registerSheet(systemId, HomelandSheet as any, {
      label: "RQG.SheetName.Item.Homeland",
      types: [ItemTypeEnum.Homeland],
      makeDefault: true,
    });
    Items.registerSheet(systemId, OccupationSheet as any, {
      label: "RQG.SheetName.Item.Occupation",
      types: [ItemTypeEnum.Occupation],
      makeDefault: true,
    });
    Items.registerSheet(systemId, GearSheet as any, {
      label: "RQG.SheetName.Item.Gear",
      types: [ItemTypeEnum.Gear],
      makeDefault: true,
    });
    Items.registerSheet(systemId, ArmorSheet as any, {
      label: "RQG.SheetName.Item.Armor",
      types: [ItemTypeEnum.Armor],
      makeDefault: true,
    });
    Items.registerSheet(systemId, WeaponSheet as any, {
      label: "RQG.SheetName.Item.Weapon",
      types: [ItemTypeEnum.Weapon],
      makeDefault: true,
    });
    Items.registerSheet(systemId, SpiritMagicSheet as any, {
      label: "RQG.SheetName.Item.SpiritMagicSpell",
      types: [ItemTypeEnum.SpiritMagic],
      makeDefault: true,
    });
    Items.registerSheet(systemId, CultSheet as any, {
      label: "RQG.SheetName.Item.Cult",
      types: [ItemTypeEnum.Cult],
      makeDefault: true,
    });
    Items.registerSheet(systemId, RuneMagicSheet as any, {
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

  public async abilityRoll(
    immediateRoll: boolean = false,
    options: Omit<AbilityRollOptions, "naturalSkill"> = {},
  ): Promise<void> {
    if (!this.isEmbedded) {
      const msg = "Item is not embedded";
      ui.notifications?.error(msg);
      throw new RqgError(msg, this);
    }
    if (!immediateRoll) {
      await new AbilityRollDialog(this).render(true);
      return;
    }

    const chance: number = Number(this.system.chance) || 0; // Handle NaN
    const speaker = ChatMessage.getSpeaker({ actor: this.actor ?? undefined });
    const useSpecialCriticals = getGame().settings.get(systemId, "specialCrit");

    const abilityRoll = await AbilityRoll.rollAndShow({
      naturalSkill: chance,
      modifiers: options?.modifiers,
      abilityName: this.name ?? undefined,
      abilityType: this.type,
      abilityImg: this.img ?? undefined,
      useSpecialCriticals: useSpecialCriticals,
      resultMessages: options?.resultMessages,
      speaker: speaker,
    });
    if (!abilityRoll.successLevel) {
      throw new RqgError("Evaluated AbilityRoll didn't give successLevel");
    }
    await this.checkExperience(abilityRoll.successLevel);
  }

  /**
   * Common code to do a roll to chat.
   */
  async _roll(
    chance: number,
    modifiers: Modifier[],
    speaker: ChatSpeakerDataProperties,
    resultMessages: Map<AbilitySuccessLevelEnum, string> = new Map(),
  ): Promise<AbilitySuccessLevelEnum> {
    chance = chance || 0; // Handle NaN
    const useSpecialCriticals = getGame().settings.get(systemId, "specialCrit");
    const abilityRoll = await AbilityRoll.rollAndShow({
      naturalSkill: chance,
      modifiers: modifiers,
      abilityName: this.name ?? undefined,
      abilityType: this.type,
      abilityImg: this.img ?? undefined,
      useSpecialCriticals: useSpecialCriticals,
      resultMessages: resultMessages,
      speaker: speaker,
    });
    if (!abilityRoll.successLevel) {
      throw new RqgError("Evaluated AbilityRoll didn't give successLevel");
    }

    return abilityRoll.successLevel;
  }

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

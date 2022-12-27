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
import { activateChatTab, getGame, hasOwnProperty, localize, RqgError } from "../system/util";
import { DocumentModificationOptions } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs";
import { HomelandSheet } from "./homeland-item/homelandSheet";
import { OccupationSheet } from "./occupation-item/occupationSheet";
import { systemId } from "../system/config";
import { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";
import { ResultEnum, ResultMessage } from "../data-model/shared/ability";

export class RqgItem extends Item {
  public static init() {
    CONFIG.Item.documentClass = RqgItem;

    Items.unregisterSheet("core", ItemSheet);

    Items.registerSheet(systemId, PassionSheet as any, {
      label: "GM Passion Item Sheet",
      types: [ItemTypeEnum.Passion],
      makeDefault: true,
    });
    Items.registerSheet(systemId, RuneSheet as any, {
      label: "GM Rune Item Sheet",
      types: [ItemTypeEnum.Rune],
      makeDefault: true,
    });
    Items.registerSheet(systemId, SkillSheet as any, {
      label: "GM Skill Item Sheet",
      types: [ItemTypeEnum.Skill],
      makeDefault: true,
    });
    Items.registerSheet(systemId, HitLocationSheet as any, {
      label: "GM Hit Location Item Sheet",
      types: [ItemTypeEnum.HitLocation],
      makeDefault: true,
    });
    Items.registerSheet(systemId, HomelandSheet as any, {
      label: "GM Homeland Item Sheet",
      types: [ItemTypeEnum.Homeland],
      makeDefault: true,
    });
    Items.registerSheet(systemId, OccupationSheet as any, {
      label: "GM Occupation Item Sheet",
      types: [ItemTypeEnum.Occupation],
      makeDefault: true,
    });
    Items.registerSheet(systemId, GearSheet as any, {
      label: "GM Gear Item Sheet",
      types: [ItemTypeEnum.Gear],
      makeDefault: true,
    });
    Items.registerSheet(systemId, ArmorSheet as any, {
      label: "GM Armor Item Sheet",
      types: [ItemTypeEnum.Armor],
      makeDefault: true,
    });
    Items.registerSheet(systemId, WeaponSheet as any, {
      label: "GM Weapon Item Sheet",
      types: [ItemTypeEnum.Weapon],
      makeDefault: true,
    });
    Items.registerSheet(systemId, SpiritMagicSheet as any, {
      label: "GM Spirit Magic Item Sheet",
      types: [ItemTypeEnum.SpiritMagic],
      makeDefault: true,
    });
    Items.registerSheet(systemId, CultSheet as any, {
      label: "GM Cult Item Sheet",
      types: [ItemTypeEnum.Cult],
      makeDefault: true,
    });
    Items.registerSheet(systemId, RuneMagicSheet as any, {
      label: "GM Rune Magic Item Sheet",
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
          })
        );
        return false;
      }

      if (RqgItem.isRuneMagicWithoutCult(document)) {
        ui.notifications?.warn(
          `${document.parent.name} has to join a cult before learning the ${document.name} rune magic spell`
        );
        return false;
      }
      return true;
    });
  }

  declare system: any; // v10 type workaround

  public async toChat(): Promise<void> {
    if (!this.isEmbedded) {
      const msg = "Item is not embedded";
      ui.notifications?.error(msg);
      throw new RqgError(msg, this);
    }
    activateChatTab();
    await ResponsibleItemClass.get(this.type)?.toChat(this);
  }

  public async abilityRoll(options: {} = {}): Promise<ResultEnum | undefined> {
    if (!this.isEmbedded) {
      const msg = "Item is not embedded";
      ui.notifications?.error(msg);
      throw new RqgError(msg, this);
    }
    activateChatTab();
    return ResponsibleItemClass.get(this.type)?.abilityRoll(this, options);
  }

  /**
   * Common code to do a roll to chat.
   */
  async _roll(
    flavor: string,
    chance: number,
    chanceMod: number, // TODO supply full EffectModifier so it's possible to show "Broadsword (Bladesharp +10%, Darkness -70%) Fumble"
    speaker: ChatSpeakerDataProperties,
    resultMessages?: ResultMessage[]
  ): Promise<ResultEnum> {
    chance = chance || 0; // Handle NaN
    chanceMod = chanceMod || 0;
    const r = new Roll("1d100");
    await r.evaluate({ async: true });
    const modifiedChance: number = chance + chanceMod;
    const useSpecialCriticals = getGame().settings.get(systemId, "specialCrit");
    const result = this.evaluateResult(modifiedChance, r.total!, useSpecialCriticals);
    let resultMsgHtml: string | undefined = "";
    if (resultMessages) {
      resultMsgHtml = resultMessages.find((i) => i.result === result)?.html;
    }
    const sign = chanceMod > 0 ? "+" : "";
    const chanceModText = chanceMod ? `${sign}${chanceMod}` : "";
    const resultText = localize(`RQG.Game.ResultEnum.${result}`);
    await r.toMessage({
      flavor: `${flavor} (${chance}${chanceModText}%) <h1>${resultText}</h1><div>${resultMsgHtml}</div>`,
      speaker: speaker,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    });
    return result;
  }

  private evaluateResult(chance: number, roll: number, useSpecialCriticals: boolean): ResultEnum {
    chance = Math.max(0, chance); // -50% = 0%

    const hyperCritical = useSpecialCriticals && chance >= 100 ? Math.ceil(chance / 500) : 0;
    const specialCritical = useSpecialCriticals && chance >= 100 ? Math.ceil(chance / 100) : 0;

    const critical = Math.max(1, Math.ceil((chance - 29) / 20) + 1);
    const special =
      chance === 6 || chance === 7 ? 2 : Math.min(95, Math.max(1, Math.ceil((chance - 7) / 5) + 1));
    const fumble = Math.min(100, 100 - Math.ceil((100 - chance - 9) / 20) + 1);
    const success = Math.min(95, Math.max(chance, 5));
    const fail = fumble === 96 ? 95 : Math.max(96, fumble - 1);
    let lookup = [
      { limit: hyperCritical, result: ResultEnum.HyperCritical },
      { limit: specialCritical, result: ResultEnum.SpecialCritical },
      { limit: critical, result: ResultEnum.Critical },
      { limit: special, result: ResultEnum.Special },
      { limit: success, result: ResultEnum.Success },
      { limit: fail, result: ResultEnum.Failure },
      { limit: Infinity, result: ResultEnum.Fumble },
    ];
    return lookup.filter((v) => roll <= v.limit)[0].result;
  }

  public async checkExperience(result: ResultEnum | undefined): Promise<void> {
    if (result && result <= ResultEnum.Success && !(this.system as any).hasExperience) {
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
      console.log(msg);
      ui.notifications?.error(msg);
    }
  }

  protected _onCreate(
    itemData: RqgItem["system"]["_source"],
    options: DocumentModificationOptions,
    userId: string
  ): void {
    const defaultItemIconSettings: any = getGame().settings.get(
      systemId,
      "defaultItemIconSettings"
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
    const { parent, pack, ...options } = context;
    if (parent?.documentName === "Actor") {
      updates.forEach((u) => {
        if (u) {
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
            options
          );
        }
      });
    }
    return super.updateDocuments(updates, context);
  }

  // Validate that embedded items are unique (name + type),
  // except for runeMagic where duplicates are allowed, at least
  // when the cultId is different. That is not implemented though
  private static isDuplicateItem(document: any): boolean {
    return document.parent.items.some(
      (i: RqgItem) =>
        document.type !== ItemTypeEnum.RuneMagic &&
        i.name === document.name &&
        i.type === document.type
    );
  }

  // Validate that embedded runeMagic can be connected to a cult
  private static isRuneMagicWithoutCult(document: any): boolean {
    const isRuneMagic = document.type === ItemTypeEnum.RuneMagic;
    const actorHasCult = document.parent.items.some((i: RqgItem) => i.type === ItemTypeEnum.Cult);
    const okToAdd = !isRuneMagic || !(isRuneMagic && !actorHasCult);
    return !okToAdd;
  }

  //** Localizes Item Type Name using ITEM localization used by Foundry.
  public static localizeItemTypeName(itemType: ItemTypeEnum): string {
    return localize("ITEM.Type" + itemType.titleCase());
  }
}

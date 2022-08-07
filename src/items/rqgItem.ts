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
  activateChatTab,
  assertItemType,
  getGame,
  localize,
  requireValue,
  RqgError,
} from "../system/util";
import { DocumentModificationOptions } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs";
import { HomelandSheet } from "./homeland-item/homelandSheet";
import { OccupationSheet } from "./occupation-item/occupationSheet";
import { systemId } from "../system/config";
import {
  ItemChatFlags,
  RuneMagicChatFlags,
  SpiritMagicChatFlags,
  WeaponChatFlags,
} from "../data-model/shared/rqgDocumentFlags";
import { ItemChatHandler } from "../chat/itemChatHandler";
import { RuneMagicChatHandler } from "../chat/runeMagicChatHandler";
import { SpiritMagicChatHandler } from "../chat/spiritMagicChatHandler";
import { WeaponChatHandler } from "../chat/weaponChatHandler";
import { UsageType } from "../data-model/item-data/weaponData";

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
        Object.values(ItemTypeEnum).includes(document.data.type);
      if (!isOwnedItem) {
        return true;
      }

      if (RqgItem.isDuplicateItem(document)) {
        ui.notifications?.warn(
          `${document.parent.name} already has a ${document.data.type} '${document.name}' and duplicates are not allowed`
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

  public async toChat(): Promise<void> {
    if (!this.isEmbedded) {
      const msg = "Item is not embedded";
      ui.notifications?.error(msg);
      throw new RqgError(msg, this);
    }
    console.log("%€#%€#%#€%#€%€#%#€ toChat !!!!!!!!", this);

    ResponsibleItemClass.get(this.data.type)?.toChat(this);
    activateChatTab();
  }

  // public async rollFromChat(chatMessage: RqgChatMessage): Promise<void> {
  //   const flags = chatMessage.data.flags.rqg;
  //   assertChatMessageFlagType(flags?.type, "itemChat");
  //   // const actor = await getRequiredRqgActorFromUuid<RqgActor>(flags.chat.actorUuid);
  //   // const token = await getDocumentFromUuid<TokenDocument>(flags.chat.tokenUuid);
  //   // const speaker = ChatMessage.getSpeaker({ actor: this.actor ?? undefined, token: this.actor?.token ?? undefined });
  //   // const item = (await getRequiredDocumentFromUuid(flags.chat.itemUuid)) as RqgItem | undefined;
  //   // requireValue(item, "Couldn't find item on item chat message");
  //   const { modifier } = await ItemChatHandler.getFormDataFromFlags(flags);
  //
  //   await this.roll(modifier);
  // }
  //
  // public async roll(modifier: number): Promise<void> {
  //   const speaker = ChatMessage.getSpeaker({
  //     actor: this.actor ?? undefined,
  //     token: this.actor?.token ?? undefined,
  //   });
  //
  //   const chance = Number((this?.data.data as any).chance) || 0;
  //   let flavor = localize("RQG.Dialog.itemChat.RollFlavor", { name: this.name });
  //   if (modifier !== 0) {
  //     flavor += localize("RQG.Dialog.itemChat.RollFlavorModifier", {
  //       modifier: formatModifier(modifier),
  //     });
  //   }
  //   const result = await Ability.roll(flavor, chance, modifier, speaker);
  //   this.actor && (await ItemChatHandler.checkExperience(this.actor, this, result)); // TODO should alos be part of RqgItem
  // }
  //
  // getRollData(): this["data"]["data"] {
  //   return super.getRollData();
  // }
  //
  // /** Do a roll against this ability and factor in all modifiers.
  //  * stat - an object that implements IAbility
  //  * chanceMod - a +/- value that changes the chance
  //  **/
  // public static async roll(
  //   flavor: string,
  //   chance: number,
  //   chanceMod: number, // TODO supply full EffectModifier so it's possible to show "Broadsword (Bladesharp +10%, Darkness -70%) Fumble"
  //   speaker: ChatSpeakerDataProperties,
  //   resultMessages?: ResultMessage[]
  // ): Promise<ResultEnum> {
  //   const r = new Roll("1d100");
  //   await r.evaluate({ async: true });
  //   const modifiedChance: number = chance + chanceMod;
  //   const useSpecialCriticals = getGame().settings.get(systemId, "specialCrit");
  //   const result = Ability.evaluateResult(modifiedChance, r.total!, useSpecialCriticals);
  //   let resultMsgHtml: string | undefined = "";
  //   if (resultMessages) {
  //     resultMsgHtml = resultMessages.find((i) => i.result === result)?.html;
  //   }
  //   const sign = chanceMod > 0 ? "+" : "";
  //   const chanceModText = chanceMod ? `${sign}${chanceMod}` : "";
  //   const resultText = localize(`RQG.Game.ResultEnum.${result}`);
  //   await r.toMessage({
  //     flavor: `${flavor} (${chance}${chanceModText}%) <h1>${resultText}</h1><div>${resultMsgHtml}</div>`,
  //     speaker: speaker,
  //     type: CONST.CHAT_MESSAGE_TYPES.ROLL,
  //   });
  //   activateChatTab();
  //   return result;
  // }

  protected _onCreate(
    data: RqgItem["data"]["_source"],
    options: DocumentModificationOptions,
    userId: string
  ): void {
    const defaultItemIconSettings: any = getGame().settings.get(
      systemId,
      "defaultItemIconSettings"
    );
    const item = data._id ? getGame().items?.get(data._id) : undefined;

    if (item?.data.img === foundry.data.ItemData.DEFAULT_ICON) {
      const updateData: any = {
        img: defaultItemIconSettings[data.type],
        "data.namePrefix": data.name,
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

      if (data.type === ItemTypeEnum.Passion) {
        updateData.data = { subject: data.name };
      }

      item?.update(updateData);
    }
    return super._onCreate(data, options, userId);
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
          ResponsibleItemClass.get(document.data.type)?.preUpdateItem(
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
        document.data.type !== ItemTypeEnum.RuneMagic &&
        i.name === document.name &&
        i.type === document.type
    );
  }

  // Validate that embedded runeMagic can be connected to a cult
  private static isRuneMagicWithoutCult(document: any): boolean {
    const isRuneMagic = document.data.type === ItemTypeEnum.RuneMagic;
    const actorHasCult = document.parent.items.some(
      (i: RqgItem) => i.data.type === ItemTypeEnum.Cult
    );
    const okToAdd = !isRuneMagic || !(isRuneMagic && !actorHasCult);
    return !okToAdd;
  }

  //** Localizes Item Type Name using ITEM localization used by Foundry.
  public static localizeItemTypeName(itemType: ItemTypeEnum): string {
    return localize("ITEM.Type" + itemType.titleCase());
  }
}

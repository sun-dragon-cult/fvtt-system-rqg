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
import { getGame, RqgError } from "../system/util";
import { DocumentModificationOptions } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs";
import {
  ItemDataSource,
} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";

export class RqgItem extends Item {
  public static init() {
    CONFIG.Item.documentClass = RqgItem;

    Items.unregisterSheet("core", ItemSheet);

    Items.registerSheet("rqg", PassionSheet as any, {
      label: "GM Passion Item Sheet",
      types: [ItemTypeEnum.Passion],
      makeDefault: true,
    });
    Items.registerSheet("rqg", RuneSheet as any, {
      label: "GM Rune Item Sheet",
      types: [ItemTypeEnum.Rune],
      makeDefault: true,
    });
    Items.registerSheet("rqg", SkillSheet as any, {
      label: "GM Skill Item Sheet",
      types: [ItemTypeEnum.Skill],
      makeDefault: true,
    });
    Items.registerSheet("rqg", HitLocationSheet as any, {
      label: "GM Hit Location Item Sheet",
      types: [ItemTypeEnum.HitLocation],
      makeDefault: true,
    });
    Items.registerSheet("rqg", GearSheet as any, {
      label: "GM Gear Item Sheet",
      types: [ItemTypeEnum.Gear],
      makeDefault: true,
    });
    Items.registerSheet("rqg", ArmorSheet as any, {
      label: "GM Armor Item Sheet",
      types: [ItemTypeEnum.Armor],
      makeDefault: true,
    });
    Items.registerSheet("rqg", WeaponSheet as any, {
      label: "GM Weapon Item Sheet",
      types: [ItemTypeEnum.Weapon],
      makeDefault: true,
    });
    Items.registerSheet("rqg", SpiritMagicSheet as any, {
      label: "GM Spirit Magic Item Sheet",
      types: [ItemTypeEnum.SpiritMagic],
      makeDefault: true,
    });
    Items.registerSheet("rqg", CultSheet as any, {
      label: "GM Cult Item Sheet",
      types: [ItemTypeEnum.Cult],
      makeDefault: true,
    });
    Items.registerSheet("rqg", RuneMagicSheet as any, {
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

  protected _onCreate(
    data: ItemDataSource,
    options: DocumentModificationOptions,
    userId: string
  ): void;
  protected _onCreate(
    data: RqgItem["data"]["_source"],
    options: DocumentModificationOptions,
    userId: string
  ): void {

    if (data.type === ItemTypeEnum.Armor) {
      //@ts-ignore
      const item = getGame().items?.get(data._id);
      item?.update({
        img: String(getGame().settings.get("rqg", "defaultIconArmor")),
        "data.namePrefix": data.name,
      });
    }

    if (data.type === ItemTypeEnum.Cult) {
      //@ts-ignore
      const item = getGame().items?.get(data._id);
      item?.update({
        img: String(getGame().settings.get("rqg", "defaultIconCult")),
      });
    }

    if (data.type === ItemTypeEnum.Gear) {
      //@ts-ignore
      const item = getGame().items?.get(data._id);
      item?.update({
        img: String(getGame().settings.get("rqg", "defaultIconGear")),
      });
    }

    if (data.type === ItemTypeEnum.HitLocation) {
      //@ts-ignore
      const item = getGame().items?.get(data._id);
      item?.update({
        img: String(getGame().settings.get("rqg", "defaultIconHitLocation")),
      });
    }
    if (data.type === ItemTypeEnum.Passion) {
      //@ts-ignore
      const item = getGame().items?.get(data._id);
      //TODO: Enhancement: regex to see if the user typed something like "Loyalty (clan)" and put the parts fo that in the right places.
      item?.update({
        img: String(getGame().settings.get("rqg", "defaultIconPassion")),
        "data.subject": data.name,
      });
    }

    if (data.type === ItemTypeEnum.Rune) {
      //@ts-ignore
      const item = getGame().items?.get(data._id);
      item?.update({
        img: String(getGame().settings.get("rqg", "defaultIconRune")),
      });
    }

    if (data.type === ItemTypeEnum.RuneMagic) {
      //@ts-ignore
      const item = getGame().items?.get(data._id);
      item?.update({
        img: String(getGame().settings.get("rqg", "defaultIconRuneMagicSpell")),
      });
    }
    
    if (data.type === ItemTypeEnum.Skill) {
      //@ts-ignore
      const item = getGame().items?.get(data._id);
      item?.update({
        img: String(getGame().settings.get("rqg", "defaultIconSkill")),
      });
    }

    if (data.type === ItemTypeEnum.SpiritMagic) {
      //@ts-ignore
      const item = getGame().items?.get(data._id);
      item?.update({
        img: String(getGame().settings.get("rqg", "defaultIconSpiritMagicSpell")),
      });
    }

    if (data.type === ItemTypeEnum.Weapon) {
      //@ts-ignore
      const item = getGame().items?.get(data._id);
      item?.update({
        img: String(getGame().settings.get("rqg", "defaultIconWeapon")),
      });
    }
    return super._onCreate(data, options, userId);
  }

  static async updateDocuments(updates: any[], context: any): Promise<any> {
    const { parent, pack, ...options } = context;
    if (parent?.documentName === "Actor") {
      updates.forEach((u) => {
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
}

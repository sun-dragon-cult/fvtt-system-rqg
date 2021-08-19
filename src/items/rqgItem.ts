import { PassionSheet } from "./passion-item/passionSheet";
import { ItemTypeEnum, ResponsibleItemClass, RqgItemData } from "../data-model/item-data/itemTypes";
import { RuneSheet } from "./rune-item/runeSheet";
import { SkillSheet } from "./skill-item/skillSheet";
import { HitLocationSheet } from "./hit-location-item/hitLocationSheet";
import { GearSheet } from "./gear-item/gearSheet";
import { ArmorSheet } from "./armor-item/armorSheet";
import { MeleeWeaponSheet } from "./melee-weapon-item/meleeWeaponSheet";
import { MissileWeaponSheet } from "./missile-weapon-item/missileWeaponSheet";
import { SpiritMagicSheet } from "./spirit-magic-item/spiritMagicSheet";
import { CultSheet } from "./cult-item/cultSheet";
import { RuneMagicSheet } from "./rune-magic-item/runeMagicSheet";
import { RqgError } from "../system/util";

export class RqgItem extends Item<RqgItemData> {
  public static init() {
    // @ts-ignore 0.8
    CONFIG.Item.documentClass = RqgItem;

    Items.unregisterSheet("core", ItemSheet);

    Items.registerSheet("rqg", PassionSheet, {
      label: "GM Passion Item Sheet",
      types: [ItemTypeEnum.Passion],
      makeDefault: true,
    });
    Items.registerSheet("rqg", RuneSheet, {
      label: "GM Rune Item Sheet",
      types: [ItemTypeEnum.Rune],
      makeDefault: true,
    });
    Items.registerSheet("rqg", SkillSheet, {
      label: "GM Skill Item Sheet",
      types: [ItemTypeEnum.Skill],
      makeDefault: true,
    });
    Items.registerSheet("rqg", HitLocationSheet, {
      label: "GM Hit Location Item Sheet",
      types: [ItemTypeEnum.HitLocation],
      makeDefault: true,
    });
    Items.registerSheet("rqg", GearSheet, {
      label: "GM Gear Item Sheet",
      types: [ItemTypeEnum.Gear],
      makeDefault: true,
    });
    Items.registerSheet("rqg", ArmorSheet, {
      label: "GM Armor Item Sheet",
      types: [ItemTypeEnum.Armor],
      makeDefault: true,
    });
    Items.registerSheet("rqg", MeleeWeaponSheet, {
      label: "GM Melee Weapon Item Sheet",
      types: [ItemTypeEnum.MeleeWeapon],
      makeDefault: true,
    });
    Items.registerSheet("rqg", MissileWeaponSheet, {
      label: "GM Missile Weapon Item Sheet",
      types: [ItemTypeEnum.MissileWeapon],
      makeDefault: true,
    });
    Items.registerSheet("rqg", SpiritMagicSheet, {
      label: "GM Spirit Magic Item Sheet",
      types: [ItemTypeEnum.SpiritMagic],
      makeDefault: true,
    });
    Items.registerSheet("rqg", CultSheet, {
      label: "GM Cult Item Sheet",
      types: [ItemTypeEnum.Cult],
      makeDefault: true,
    });
    Items.registerSheet("rqg", RuneMagicSheet, {
      label: "GM Rune Magic Item Sheet",
      types: [ItemTypeEnum.RuneMagic],
      makeDefault: true,
    });
    // TODO this doesn't compile!? Sheet registration would be better in Item init
    // ResponsibleItemClass.forEach((itemClass) => itemClass.init());

    Hooks.on("preCreateItem", (document: any) => {
      const isOwnedItem =
        document instanceof RqgItem &&
        // @ts-ignore 0.8
        document.parent &&
        Object.values(ItemTypeEnum).includes(document.data.type);
      if (!isOwnedItem) {
        return true;
      }

      if (RqgItem.isDuplicateItem(document)) {
        ui.notifications?.warn(
          // @ts-ignore 0.8
          `${document.parent.name} already has a ${document.data.type} '${document.name}' and duplicates are not allowed`
        );
        return false;
      }

      if (RqgItem.isRuneMagicWithoutCult(document)) {
        ui.notifications?.warn(
          // @ts-ignore 0.8
          `${document.parent.name} has to join a cult before learning the ${document.name} rune magic spell`
        );
        return false;
      }
      return true;
    });
  }

  static async updateDocuments(updates: any[], context: any): Promise<any> {
    const { parent, pack, ...options } = context;
    if (parent?.documentName === "Actor") {
      updates.forEach((u) => {
        // @ts-ignore 0.8
        const document = parent.items.get(u._id);
        // @ts-ignore 0.8
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
    // @ts-ignore 0.8
    return super.updateDocuments(updates, context);
  }

  // Validate that embedded items are unique (name + type)
  private static isDuplicateItem(document: any): boolean {
    return document.parent.items.some(
      (i: RqgItem) => i.name === document.name && i.type === document.type
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

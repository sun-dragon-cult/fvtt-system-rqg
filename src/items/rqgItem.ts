import { PassionSheet } from "./passion-item/passionSheet";
import { ItemTypeEnum, ResponsibleItemClass, RqgItemData } from "../data-model/item-data/itemTypes";
import { RuneSheet } from "./rune-item/runeSheet";
import { SkillSheet } from "./skill-item/skillSheet";
import { HitLocationSheet } from "./hit-location-item/hitLocationSheet";
import { GearSheet } from "./gear-item/gearSheet";
import { ArmorSheet } from "./armor-item/armorSheet";
import { RqgActor } from "../actors/rqgActor";
import { MeleeWeaponSheet } from "./melee-weapon-item/meleeWeaponSheet";
import { MissileWeaponSheet } from "./missile-weapon-item/missileWeaponSheet";
import { SpiritMagicSheet } from "./spirit-magic-item/spiritMagicSheet";
import { CultSheet } from "./cult-item/cultSheet";
import { RuneMagicSheet } from "./rune-magic-item/runeMagicSheet";

export class RqgItem extends Item<RqgItemData> {
  public static init() {
    // @ts-ignore 0.8
    CONFIG.Item.documentClass = RqgItem;
    // CONFIG.Item.sheetClass = RqgItemSheet; // TODO how and why

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

    // Row 26505
    Hooks.on("preCreateOwnedItem", (parent: Entity, r: any) => {
      // Validate that embedded items are unique (name + type)
      if (parent instanceof RqgActor && Object.values(ItemTypeEnum).includes(r.type)) {
        const rqgItem = r as RqgItem;
        // Prevent duplicates
        if (parent.items.find((i) => i.name === rqgItem.name && i.type === rqgItem.type)) {
          ui.notifications?.warn(
            `${parent.name} already has a ${rqgItem.type} '${rqgItem.name}' and duplicates are not allowed`
          );
          return false;
        }

        // Generate item AE when embedding
        rqgItem.effects = rqgItem.effects || [];
        const activeEffect = ResponsibleItemClass.get(rqgItem.type)?.generateActiveEffect(
          rqgItem.data
        );
        if (activeEffect) {
          activeEffect.origin = `Actor.${parent.id}.OwnedItem.${rqgItem._id}`;
          // @ts-ignore TODO effects is Array runtime but Collection<ActiveEffects<RqgItem>> "compiletime"
          rqgItem.effects.push(activeEffect);
        }
      }
      return true;
    });
  }
}

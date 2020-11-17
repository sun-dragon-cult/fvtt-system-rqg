import { PassionSheet } from "./passion-item/passionSheet";
import {
  ResponsibleItemClass,
  ItemTypeEnum,
} from "../data-model/item-data/itemTypes";
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

export class RqgItem<DataType = any> extends Item<DataType> {
  public static init() {
    CONFIG.Item.entityClass = RqgItem;

    Items.unregisterSheet("core", ItemSheet);

    Items.registerSheet("rqg", PassionSheet, {
      types: [ItemTypeEnum.Passion],
      makeDefault: true,
    });
    Items.registerSheet("rqg", RuneSheet, {
      types: [ItemTypeEnum.Rune],
      makeDefault: true,
    });
    Items.registerSheet("rqg", SkillSheet, {
      types: [ItemTypeEnum.Skill],
      makeDefault: true,
    });
    Items.registerSheet("rqg", HitLocationSheet, {
      types: [ItemTypeEnum.HitLocation],
      makeDefault: true,
    });
    Items.registerSheet("rqg", GearSheet, {
      types: [ItemTypeEnum.Gear],
      makeDefault: true,
    });
    Items.registerSheet("rqg", ArmorSheet, {
      types: [ItemTypeEnum.Armor],
      makeDefault: true,
    });
    Items.registerSheet("rqg", MeleeWeaponSheet, {
      types: [ItemTypeEnum.MeleeWeapon],
      makeDefault: true,
    });
    Items.registerSheet("rqg", MissileWeaponSheet, {
      types: [ItemTypeEnum.MissileWeapon],
      makeDefault: true,
    });
    Items.registerSheet("rqg", SpiritMagicSheet, {
      types: [ItemTypeEnum.SpiritMagic],
      makeDefault: true,
    });
    Items.registerSheet("rqg", CultSheet, {
      types: [ItemTypeEnum.Cult],
      makeDefault: true,
    });
    Items.registerSheet("rqg", RuneMagicSheet, {
      types: [ItemTypeEnum.RuneMagic],
      makeDefault: true,
    });
    // TODO this doesn't compile!? Sheet registration would be better in Item init
    // ResponsibleItemClass.forEach((itemClass) => itemClass.init());

    // Row 26505
    Hooks.on("preCreateOwnedItem", (parent, r) => {
      if (
        parent instanceof RqgActor &&
        Object.values(ItemTypeEnum).includes(r.type)
      ) {
        const rqgItem = r as RqgItem;
        // @ts-ignore 0.7
        rqgItem.effects = rqgItem.effects || [];
        const activeEffect = ResponsibleItemClass.get(
          rqgItem.type
        ).generateActiveEffect(rqgItem.data);
        if (activeEffect) {
          activeEffect.origin = `Actor.${parent.id}.OwnedItem.${rqgItem._id}`;
          // @ts-ignore 0.7
          rqgItem.effects.push(activeEffect);
        }
      }
      return true;
    });
  }
}

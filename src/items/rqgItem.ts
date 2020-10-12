import { PassionSheet } from "./passion-item/passionSheet";
import {
  ResponsibleItemClass,
  ItemTypeEnum,
} from "../data-model/item-data/itemTypes";
import { ElementalRuneSheet } from "./elemental-rune-item/elementalRuneSheet";
import { PowerRuneSheet } from "./power-rune-item/powerRuneSheet";
import { SkillSheet } from "./skill-item/skillSheet";
import { HitLocationSheet } from "./hit-location-item/hitLocationSheet";
import { GearSheet } from "./gear-item/gearSheet";
import { ArmorSheet } from "./armor-item/armorSheet";
import { RqgActor } from "../actors/rqgActor";
import { MeleeWeaponSheet } from "./melee-weapon-item/meleeWeaponSheet";

export class RqgItem<DataType = any> extends Item<DataType> {
  public static init() {
    CONFIG.Item.entityClass = RqgItem;

    Items.unregisterSheet("core", ItemSheet);

    Items.registerSheet("rqg", PassionSheet, {
      types: [ItemTypeEnum.Passion],
      makeDefault: true,
    });
    Items.registerSheet("rqg", ElementalRuneSheet, {
      types: [ItemTypeEnum.ElementalRune],
      makeDefault: true,
    });
    Items.registerSheet("rqg", PowerRuneSheet, {
      types: [ItemTypeEnum.PowerRune],
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
    // TODO this doesn't compile!? Sheet registration would be better in Item init
    // ResponsibleItemClass.forEach((itemClass) => itemClass.init());

    // Row 26505
    Hooks.on("preCreateOwnedItem", (parent, r) => {
      if (
        parent instanceof RqgActor &&
        Object.values(ItemTypeEnum).includes(r.type)
      ) {
        const itemData = r as RqgItem;
        // @ts-ignore 0.7
        itemData.effects = itemData.effects || [];
        const activeEffect = ResponsibleItemClass.get(
          itemData.type
        ).generateActiveEffect(itemData);
        if (activeEffect) {
          activeEffect.origin = `Actor.${parent.id}.OwnedItem.${itemData._id}`;
          // @ts-ignore 0.7
          itemData.effects.push(activeEffect);
          // await item.createEmbeddedEntity("ActiveEffect", activeEffect);
        }
      }
      return true;
    });
  }
}

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
import { Armor } from "./armor-item/armor";

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
    // TODO this doesn't compile!? Sheet registration would be better in Item init
    // ResponsibleItemClass.forEach((itemClass) => itemClass.init());

    // TODO Not the correct place - will not be called on this.actor.createOwnedItem !!!
    Hooks.on("createItem", async (item: RqgItem) => {
      if (item.data.type === ItemTypeEnum.Armor) {
        await item.createEmbeddedEntity(
          "ActiveEffect",
          Armor.generateActiveEffect(item)
        );
      }
    });
  }

  prepareEmbeddedEntities() {
    // @ts-ignore 0.7
    const effects = this.data.effects || [];
    console.debug(
      "RqgItem.prepareEmbeddedEntities _prepareActiveEffects",
      effects
    );
    // if (effects.length === 0) {
    //   // TODO Add effect?
    //   console.warn(`No effect on a ${this.data.type} item`, this.data.name);
    // } else if (effects.length === 1) {
    //   console.log(`One effect on a ${this.data.type} item`, this.data.name);
    // } else {
    //   console.log(
    //     `More than one effect on a ${this.data.type} item`,
    //     this.data.name
    //   );
    // }

    effects.forEach(
      (e) =>
        (e.changes = ResponsibleItemClass.get(
          this.data.type
        ).generateActiveEffect(this).changes)
    );

    super.prepareEmbeddedEntities();
  }

  protected _onUpdate(
    data: object,
    options: object,
    userId: string,
    context: object
  ) {
    super._onUpdate(data, options, userId, context);
  }

  // prepareData() {
  //   super.prepareData();
  //   console.log("*** RqgItem prepareData");
  //   const itemData: ItemData<DataType> = this.data;
  // }
}

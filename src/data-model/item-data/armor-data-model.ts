import type { RqgItem } from "@items/rqg-item.ts";
import { RqgItemDataModel } from "./rqg-item-data-model";
import { physicalItemSchemaFields } from "../shared/physical-item-schema-fields";
import { rqidLinkArraySchemaField } from "../shared/rqid-link-field";

export type ArmorItem = RqgItem & { system: Item.SystemOfType<"armor"> };

export const armorTypeTranslationKeys = [
  "RQG.Item.Armor.ArmorType.Hood",
  "RQG.Item.Armor.ArmorType.BroadBrimmedHat",
  "RQG.Item.Armor.ArmorType.Cap",
  "RQG.Item.Armor.ArmorType.CompositeHelm",
  "RQG.Item.Armor.ArmorType.OpenHelm",
  "RQG.Item.Armor.ArmorType.ClosedHelm",
  "RQG.Item.Armor.ArmorType.FullHelm",
  "RQG.Item.Armor.ArmorType.Sleeves",
  "RQG.Item.Armor.ArmorType.Vambraces",
  "RQG.Item.Armor.ArmorType.Cuirass",
  "RQG.Item.Armor.ArmorType.Linothorax",
  "RQG.Item.Armor.ArmorType.Hauberk",
  "RQG.Item.Armor.ArmorType.Skirt",
  "RQG.Item.Armor.ArmorType.PantsTrews",
  "RQG.Item.Armor.ArmorType.Greaves",
] as const;

export const materialTranslationKeys = [
  "RQG.Item.Armor.ArmorMaterial.SoftLeather",
  "RQG.Item.Armor.ArmorMaterial.Leather",
  "RQG.Item.Armor.ArmorMaterial.HeavyLeather",
  "RQG.Item.Armor.ArmorMaterial.StuddedLeather",
  "RQG.Item.Armor.ArmorMaterial.Cuirboilli",
  "RQG.Item.Armor.ArmorMaterial.Linen",
  "RQG.Item.Armor.ArmorMaterial.Quilted",
  "RQG.Item.Armor.ArmorMaterial.BronzeRingMail",
  "RQG.Item.Armor.ArmorMaterial.TurtleShell",
  "RQG.Item.Armor.ArmorMaterial.LightBronzeScale",
  "RQG.Item.Armor.ArmorMaterial.HeavyBronzeScale",
  "RQG.Item.Armor.ArmorMaterial.SegmentedBronzePlate",
  "RQG.Item.Armor.ArmorMaterial.BronzeDiskPlate",
  "RQG.Item.Armor.ArmorMaterial.BronzePlate",
  "RQG.Item.Armor.ArmorMaterial.IronPlate",
] as const;

const { NumberField, StringField } = foundry.data.fields;

function defineArmorSchema() {
  return {
    ...physicalItemSchemaFields(),
    size: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
    hitLocationRqidLinks: rqidLinkArraySchemaField(),
    namePrefix: new StringField({ blank: true, nullable: false, initial: "" }),
    armorType: new StringField({ blank: true, nullable: false, initial: "" }),
    material: new StringField({ blank: true, nullable: false, initial: "" }),
    absorbs: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
    moveQuietlyPenalty: new NumberField({ integer: true, nullable: false, initial: 0 }),
  } as const;
}

type ArmorSchema = ReturnType<typeof defineArmorSchema>;

export class ArmorDataModel extends RqgItemDataModel<ArmorSchema> {
  static override defineSchema() {
    return defineArmorSchema();
  }
}

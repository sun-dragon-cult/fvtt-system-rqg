import type { RqgItem } from "@items/rqg-item.ts";
import { RqgItemDataModel } from "./rqg-item-data-model";
import { physicalItemSchemaFields } from "../shared/physical-item-schema-fields";
import { rqidLinkArraySchemaField } from "../shared/rqid-link-field";
import { armorTypeKeys, armorTypePrefix, materialKeys, materialPrefix } from "./armor-enums";
import { toKey, toLabel } from "../../system/localized-key";

export type ArmorItem = RqgItem & { system: Item.SystemOfType<"armor"> };

/** The stored value of `system.armorType` as shown in the current language. */
export const armorTypeLabel = (value: string): string =>
  toLabel(value, armorTypePrefix, armorTypeKeys);

/** The value to store in `system.armorType` for typed or picked text. */
export const armorTypeKey = (text: string): string => toKey(text, armorTypePrefix, armorTypeKeys);

/** The stored value of `system.material` as shown in the current language. */
export const materialLabel = (value: string): string =>
  toLabel(value, materialPrefix, materialKeys);

/** The value to store in `system.material` for typed or picked text. */
export const materialKey = (text: string): string => toKey(text, materialPrefix, materialKeys);

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
  static override LOCALIZATION_PREFIXES = ["RQG.Item.Armor", "RQG.Item.Physical"];

  static override defineSchema() {
    return defineArmorSchema();
  }

  static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
    // Older data stores labels in the language the item was edited in
    if (typeof source["armorType"] === "string") {
      source["armorType"] = armorTypeKey(source["armorType"]);
    }
    if (typeof source["material"] === "string") {
      source["material"] = materialKey(source["material"]);
    }
    return super.migrateData(source);
  }
}

import type { RqgItem } from "@items/rqg-item.ts";
import { RqgItemDataModel } from "./rqg-item-data-model";
import { physicalItemSchemaFields } from "../shared/physical-item-schema-fields";
import { rqidLinkArraySchemaField } from "../shared/rqid-link-field";

export type ArmorItem = RqgItem & { system: Item.SystemOfType<"armor"> };

export { armorTypeTranslationKeys, materialTranslationKeys } from "./armor-enums";

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

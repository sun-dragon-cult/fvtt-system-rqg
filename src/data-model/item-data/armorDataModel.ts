import { RqgItemDataModel } from "./RqgItemDataModel";
import { physicalItemSchemaFields } from "../shared/physicalItemSchemaFields";
import { rqidLinkArraySchemaField } from "../shared/rqidLinkField";

const { NumberField, StringField } = foundry.data.fields;

type ArmorSchema = ReturnType<typeof ArmorDataModel.defineSchema>;

export class ArmorDataModel extends RqgItemDataModel<ArmorSchema> {
  static override defineSchema() {
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
}

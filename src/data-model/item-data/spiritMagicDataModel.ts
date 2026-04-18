import { RqgItemDataModel } from "./RqgItemDataModel";
import { spellSchemaFields } from "../shared/spellSchemaFields";

const { ArrayField, BooleanField, StringField } = foundry.data.fields;

type SpiritMagicSchema = ReturnType<typeof SpiritMagicDataModel.defineSchema>;

export class SpiritMagicDataModel extends RqgItemDataModel<SpiritMagicSchema> {
  static override defineSchema() {
    return {
      ...spellSchemaFields(),
      isVariable: new BooleanField({ nullable: false, initial: false }),
      incompatibleWith: new ArrayField(
        new StringField({ blank: true, nullable: false, initial: "" }),
      ),
      spellFocus: new StringField({ blank: true, nullable: false, initial: "" }),
      isMatrix: new BooleanField({ nullable: false, initial: false }),
    } as const;
  }
}

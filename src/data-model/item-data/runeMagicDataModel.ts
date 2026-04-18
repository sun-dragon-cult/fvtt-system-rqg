import { RqgItemDataModel } from "./RqgItemDataModel";
import { spellSchemaFields } from "../shared/spellSchemaFields";
import { rqidLinkArraySchemaField } from "../shared/rqidLinkField";

const { BooleanField, StringField } = foundry.data.fields;

type RuneMagicSchema = ReturnType<typeof RuneMagicDataModel.defineSchema>;

export class RuneMagicDataModel extends RqgItemDataModel<RuneMagicSchema, { chance: number }> {
  static override defineSchema() {
    return {
      ...spellSchemaFields(),
      cultId: new StringField({ blank: true, nullable: false, initial: "" }),
      runeRqidLinks: rqidLinkArraySchemaField(),
      isStackable: new BooleanField({ nullable: false, initial: false }),
      isOneUse: new BooleanField({ nullable: false, initial: false }),
    } as const;
  }
}

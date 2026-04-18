import { RqgItemDataModel } from "./RqgItemDataModel";
import { abilitySchemaFields } from "../shared/abilitySchemaFields";

const { StringField } = foundry.data.fields;

type PassionSchema = ReturnType<typeof PassionDataModel.defineSchema>;

export class PassionDataModel extends RqgItemDataModel<PassionSchema> {
  static override defineSchema() {
    return {
      ...abilitySchemaFields(),
      passion: new StringField({ blank: true, nullable: false, initial: "" }),
      subject: new StringField({ blank: true, nullable: false, initial: "" }),
      description: new StringField({ blank: true, nullable: false, initial: "" }),
      gmNotes: new StringField({ blank: true, nullable: false, initial: "" }),
    } as const;
  }
}

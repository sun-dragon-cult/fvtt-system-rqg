import type { RqgItem } from "@items/rqg-item.ts";
import { AbilityDataModel } from "./ability-data-model";
import { abilitySchemaFields } from "../shared/ability-schema-fields";

export type PassionItem = RqgItem & { system: Item.SystemOfType<"passion"> };

const { StringField } = foundry.data.fields;

function definePassionSchema() {
  return {
    ...abilitySchemaFields(),
    passion: new StringField({ blank: true, nullable: false, initial: "" }),
    subject: new StringField({ blank: true, nullable: false, initial: "" }),
    description: new StringField({ blank: true, nullable: false, initial: "" }),
    gmNotes: new StringField({ blank: true, nullable: false, initial: "" }),
  } as const;
}

type PassionSchema = ReturnType<typeof definePassionSchema>;

export class PassionDataModel extends AbilityDataModel<PassionSchema> {
  static override defineSchema() {
    return definePassionSchema();
  }
}

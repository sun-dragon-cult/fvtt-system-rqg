import type { RqgItem } from "@items/rqg-item.ts";
import { AbilityDataModel } from "./ability-data-model";
import { abilitySchemaFields } from "../shared/ability-schema-fields";

export type PassionItem = RqgItem & { system: Item.SystemOfType<"passion"> };

export const PassionsEnum = {
  Ambition: "Ambition",
  Cowardly: "Cowardly",
  Devotion: "Devotion",
  Fear: "Fear",
  Hate: "Hate",
  Honor: "Honor",
  Loyalty: "Loyalty",
  Love: "Love",
  Gluttony: "Gluttony",
  Vanity: "Vanity",
  Custom: "",
} as const;
export type PassionsEnum = (typeof PassionsEnum)[keyof typeof PassionsEnum];

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

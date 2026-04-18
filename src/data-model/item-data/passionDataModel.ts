import type { RqgItem } from "@items/rqgItem.ts";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { abilitySchemaFields } from "../shared/abilitySchemaFields";

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

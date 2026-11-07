import type { RqgItem } from "@items/rqg-item.ts";
import { AbilityDataModel } from "./ability-data-model";
import { abilitySchemaFields, persistedChanceSchemaField } from "../shared/ability-schema-fields";
import { passionKeys, passionLabelPrefix } from "./passion-enums";
import { toKey, toLabel } from "../../system/localized-key";

/** The stored value of `system.passion` as shown in the current language. */
export const passionLabel = (value: string): string =>
  toLabel(value, passionLabelPrefix, passionKeys);

/** The value to store in `system.passion` for typed or picked text. */
export const passionKey = (text: string): string => toKey(text, passionLabelPrefix, passionKeys);

export type PassionItem = RqgItem & { system: Item.SystemOfType<"passion"> };

const { StringField } = foundry.data.fields;

function definePassionSchema() {
  return {
    ...abilitySchemaFields(),
    ...persistedChanceSchemaField(),
    passion: new StringField({ blank: true, nullable: false, initial: "" }),
    subject: new StringField({ blank: true, nullable: false, initial: "" }),
    description: new StringField({ blank: true, nullable: false, initial: "" }),
    gmNotes: new StringField({ blank: true, nullable: false, initial: "" }),
  } as const;
}

type PassionSchema = ReturnType<typeof definePassionSchema>;

export class PassionDataModel extends AbilityDataModel<PassionSchema> {
  static override LOCALIZATION_PREFIXES = ["RQG.Item.Passion", "RQG.Item.Ability"];

  static override defineSchema() {
    return definePassionSchema();
  }

  static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
    // Older data stores the passion's label in the language it was edited in
    if (typeof source["passion"] === "string") {
      source["passion"] = passionKey(source["passion"]);
    }
    return super.migrateData(source);
  }
}

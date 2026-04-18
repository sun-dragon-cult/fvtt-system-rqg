import type { RqgItem } from "@items/rqgItem.ts";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { abilitySchemaFields } from "../shared/abilitySchemaFields";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqidLinkField";
import { enumChoices } from "../shared/enumChoices";

export type RuneItem = RqgItem & { system: Item.SystemOfType<"rune"> };

export const RuneTypeEnum = {
  Element: "element",
  Power: "power",
  Form: "form",
  Condition: "condition",
  Technique: "technique",
} as const;
export type RuneTypeEnum = (typeof RuneTypeEnum)[keyof typeof RuneTypeEnum];

export type RuneType = {
  type: RuneTypeEnum;
  /** Translated name of the runeType */
  name: string;
};

export const defaultRuneType = {
  type: RuneTypeEnum.Form,
  name: RuneTypeEnum.Form,
};

const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

type RuneSchema = ReturnType<typeof RuneDataModel.defineSchema>;

const runeTypeValues = new Set<string>(Object.values(RuneTypeEnum));

export class RuneDataModel extends RqgItemDataModel<RuneSchema> {
  static override defineSchema() {
    return {
      ...abilitySchemaFields(),
      descriptionRqidLink: rqidLinkSchemaField({ nullable: true }),
      rune: new StringField({ blank: true, nullable: false, initial: "" }),
      runeType: new SchemaField({
        type: new StringField({
          blank: false,
          nullable: false,
          initial: defaultRuneType.type,
          choices: enumChoices(RuneTypeEnum, "RQG.Item.Rune.RuneType."),
        }),
        name: new StringField({ blank: true, nullable: false, initial: defaultRuneType.name }),
      }),
      chance: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
      opposingRuneRqidLink: rqidLinkSchemaField({ nullable: true }),
      minorRuneRqidLinks: rqidLinkArraySchemaField(),
      isMastered: new BooleanField({ nullable: false, initial: false }),
    } as const;
  }

  static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
    // Legacy data stored runeType as a plain string (e.g. "power") instead of {type, name}
    if (typeof source["runeType"] === "string") {
      const legacy = source["runeType"].toLowerCase();
      source["runeType"] = {
        type: runeTypeValues.has(legacy) ? legacy : defaultRuneType.type,
        name: source["runeType"],
      };
    }
    return super.migrateData(source);
  }
}

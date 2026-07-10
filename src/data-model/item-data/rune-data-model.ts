import type { RqgItem } from "@items/rqg-item.ts";
import { AbilityDataModel } from "./ability-data-model";
import { abilitySchemaFields } from "../shared/ability-schema-fields";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqid-link-field";
import type { RqidLink } from "../shared/rqid-link";
import type { RqidString } from "../../system/api/rqid-api";
import { enumChoices } from "../shared/enum-choices";

export type RuneItem = RqgItem & { system: Item.SystemOfType<"rune"> };

import { RuneTypeEnum } from "./rune-enums";
export { RuneTypeEnum };

export type RuneType = {
  type: RuneTypeEnum;
  /** Translated name of the runeType */
  name: string;
};

export const defaultRuneType = {
  type: RuneTypeEnum.Form,
  name: RuneTypeEnum.Form,
};

const { BooleanField, SchemaField, StringField } = foundry.data.fields;

function defineRuneSchema() {
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
    opposingRuneRqidLink: rqidLinkSchemaField({ nullable: true }),
    minorRuneRqidLinks: rqidLinkArraySchemaField(),
    isMastered: new BooleanField({ nullable: false, initial: false }),
  } as const;
}

type RuneSchema = ReturnType<typeof defineRuneSchema>;

const runeTypeValues = new Set<string>(Object.values(RuneTypeEnum));

export class RuneDataModel extends AbilityDataModel<RuneSchema> {
  declare descriptionRqidLink: RqidLink<RqidString>;

  static override defineSchema() {
    return defineRuneSchema();
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

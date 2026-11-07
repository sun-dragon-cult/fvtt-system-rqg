import type { RqgItem } from "@items/rqg-item.ts";
import { AbilityDataModel } from "./ability-data-model";
import { abilitySchemaFields, persistedChanceSchemaField } from "../shared/ability-schema-fields";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqid-link-field";
import type { RqidLink } from "../shared/rqid-link";
import type { RqidString } from "../../system/api/rqid-api";
import { enumChoices } from "../shared/enum-choices";
import { RuneTypeEnum } from "./rune-enums";

export type RuneItem = RqgItem & { system: Item.SystemOfType<"rune"> };

const { BooleanField, StringField } = foundry.data.fields;

function defineRuneSchema() {
  return {
    ...abilitySchemaFields(),
    ...persistedChanceSchemaField(),
    descriptionRqidLink: rqidLinkSchemaField({ nullable: true }),
    rune: new StringField({ blank: true, nullable: false, initial: "" }),
    runeType: new StringField({
      blank: false,
      nullable: false,
      initial: RuneTypeEnum.Form,
      choices: enumChoices(RuneTypeEnum, "RQG.Item.Rune.RuneType."),
    }),
    opposingRuneRqidLink: rqidLinkSchemaField({ nullable: true }),
    minorRuneRqidLinks: rqidLinkArraySchemaField(),
    isMastered: new BooleanField({ nullable: false, initial: false }),
  } as const;
}

type RuneSchema = ReturnType<typeof defineRuneSchema>;

const runeTypeValues = new Set<string>(Object.values(RuneTypeEnum));

export class RuneDataModel extends AbilityDataModel<RuneSchema> {
  static override LOCALIZATION_PREFIXES = ["RQG.Item.Rune", "RQG.Item.Ability"];

  declare descriptionRqidLink: RqidLink<RqidString>;

  static override defineSchema() {
    return defineRuneSchema();
  }

  static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
    let stored = source["runeType"];
    if (stored && typeof stored === "object") {
      // Before 6.2.0 runeType was {type, name}
      stored = (stored as { type?: unknown }).type ?? RuneTypeEnum.Form;
      source["runeType"] = stored;
    }
    if (typeof stored === "string" && !runeTypeValues.has(stored)) {
      // Older data stored a capitalised name, e.g. "Power"
      const lower = stored.toLowerCase();
      source["runeType"] = runeTypeValues.has(lower) ? lower : RuneTypeEnum.Form;
    }
    return super.migrateData(source);
  }
}

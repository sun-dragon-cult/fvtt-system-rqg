import { RqgItemDataModel } from "./RqgItemDataModel";
import { abilitySchemaFields } from "../shared/abilitySchemaFields";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqidLinkField";
import { RuneTypeEnum, defaultRuneType } from "./runeData";

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
          choices: Object.fromEntries(
            Object.values(RuneTypeEnum).map((v) => [v, `RQG.Item.Rune.RuneType.${v}`]),
          ),
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
    if (typeof source.runeType === "string") {
      const legacy = source.runeType.toLowerCase();
      source.runeType = {
        type: runeTypeValues.has(legacy) ? legacy : defaultRuneType.type,
        name: source.runeType,
      };
    }
    return super.migrateData(source);
  }
}

import { rqidLinkArraySchemaField } from "../../data-model/shared/rqid-link-field";
import { spellTargetConditionOps, spellTargetOnNoMatch } from "./spell-effect.defs";

const { ArrayField, BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

/** What was cast, by whom and how strongly - on spell effects and on spell areas. */
export function spellProvenanceFields() {
  return {
    spellRqid: new StringField({ blank: true, nullable: false, initial: "" }),
    spellName: new StringField({ blank: true, nullable: false, initial: "" }),
    spellUuid: new StringField({ blank: true, nullable: false, initial: "" }),
    casterActorUuid: new StringField({ blank: true, nullable: false, initial: "" }),
    casterTokenUuid: new StringField({ blank: true, nullable: false, initial: "" }),
    castMessageId: new StringField({ blank: true, nullable: false, initial: "" }),
    level: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
    magicPointsSpent: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
    runePointsSpent: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
    casterSuccessLevel: new NumberField({ integer: true, nullable: true, initial: null }),
  };
}

type ActiveEffectTypeDataModelConstructor = {
  new (
    ...args: unknown[]
  ): foundry.abstract.TypeDataModel<
    foundry.data.fields.DataSchema,
    ActiveEffect.Implementation,
    Record<string, never>,
    Record<string, never>
  >;
  defineSchema: () => foundry.data.fields.DataSchema;
};

const ActiveEffectTypeDataModelBase =
  ((foundry.data as Record<string, unknown>)["ActiveEffectTypeDataModel"] as
    ActiveEffectTypeDataModelConstructor | undefined) ??
  (foundry.abstract.TypeDataModel as unknown as ActiveEffectTypeDataModelConstructor);

function rqgActiveEffectSchemaFields() {
  return {
    matchSuspensionToEquippedStatus: new BooleanField({ initial: false }),
    // Set on a spell effect template in a pack: which of the target's documents a cast attaches a
    // copy to. documentType "" means the target actor itself.
    spellTarget: new SchemaField(
      {
        documentType: new StringField({ blank: true, nullable: false, initial: "" }),
        where: new ArrayField(
          new SchemaField({
            path: new StringField({ blank: false, nullable: false, initial: "" }),
            op: new StringField({
              blank: false,
              nullable: false,
              initial: "eq",
              choices: [...spellTargetConditionOps],
            }),
            value: new StringField({ blank: true, nullable: false, initial: "" }),
          }),
        ),
        onNoMatch: new StringField({
          blank: false,
          nullable: false,
          initial: spellTargetOnNoMatch[0],
          choices: [...spellTargetOnNoMatch],
        }),
      },
      { nullable: true, initial: null },
    ),
    // Spells this effect can't share a document with, e.g. Bladesharp with Fireblade. Copied with
    // the template, so either side listing the other is enough.
    incompatibleSpellRqidLinks: rqidLinkArraySchemaField(),
    // Spells this effect cancels, e.g. Fanaticism and Demoralize: a cast removes the other and
    // doesn't take effect itself (RBM p.112, 114). Either side listing the other is enough.
    cancelsSpellRqidLinks: rqidLinkArraySchemaField(),
    // Spells this effect takes precedence over, e.g. Berserker over Fanaticism (RBM p.47): a cast
    // removes them, and they have no effect while this one is active. Only this side lists them.
    supersedesSpellRqidLinks: rqidLinkArraySchemaField(),
    // Spells this effect counteracts when they are weaker, e.g. Harmony against Fanaticism (RBM
    // p.62): a cast removes them, and they have no effect while this one is active. Only this side
    // lists them.
    counteractsSpellRqidLinks: rqidLinkArraySchemaField(),
    // Set on a copy applied by a cast: what was cast, by whom and how strongly.
    spell: new SchemaField(spellProvenanceFields(), { nullable: true, initial: null }),
  } as const;
}

type RqgActiveEffectSchemaFields = ReturnType<typeof rqgActiveEffectSchemaFields>;

export class RqgActiveEffectDataModel extends ActiveEffectTypeDataModelBase {
  static override defineSchema(): foundry.data.fields.DataSchema {
    return {
      ...super.defineSchema(),
      ...rqgActiveEffectSchemaFields(),
    };
  }

  // Declared for type-safe access on effect.system.
  declare matchSuspensionToEquippedStatus: foundry.data.fields.SchemaField.InnerAssignmentType<RqgActiveEffectSchemaFields>["matchSuspensionToEquippedStatus"];
  declare spellTarget: foundry.data.fields.SchemaField.InitializedData<RqgActiveEffectSchemaFields>["spellTarget"];
  declare incompatibleSpellRqidLinks: foundry.data.fields.SchemaField.InitializedData<RqgActiveEffectSchemaFields>["incompatibleSpellRqidLinks"];
  declare cancelsSpellRqidLinks: foundry.data.fields.SchemaField.InitializedData<RqgActiveEffectSchemaFields>["cancelsSpellRqidLinks"];
  declare supersedesSpellRqidLinks: foundry.data.fields.SchemaField.InitializedData<RqgActiveEffectSchemaFields>["supersedesSpellRqidLinks"];
  declare counteractsSpellRqidLinks: foundry.data.fields.SchemaField.InitializedData<RqgActiveEffectSchemaFields>["counteractsSpellRqidLinks"];
  declare spell: foundry.data.fields.SchemaField.InitializedData<RqgActiveEffectSchemaFields>["spell"];
}

import {
  spellTargetOutcomeResolvedBy,
  spellTargetOutcomeState,
} from "../../data-model/shared/spell-cast-outcome";

const { ArrayField, NumberField, SchemaField, StringField } = foundry.data.fields;

const spellCastChatMessageSchema = {
  spellUuid: new StringField({ blank: true, nullable: false, required: true, initial: "" }),
  casterTokenOrActorUuid: new StringField({
    blank: true,
    nullable: false,
    required: true,
    initial: "",
  }),
  castSuccessLevel: new NumberField({ integer: true, nullable: true, initial: null }),
  targets: new ArrayField(
    new SchemaField({
      targetTokenOrActorUuid: new StringField({ blank: false, nullable: false, required: true }),
      state: new StringField({
        blank: false,
        nullable: false,
        initial: spellTargetOutcomeState[0],
        choices: [...spellTargetOutcomeState],
      }),
      resolvedBy: new StringField({
        blank: false,
        nullable: true,
        initial: null,
        choices: [...spellTargetOutcomeResolvedBy],
      }),
      casterSuccessLevel: new NumberField({ integer: true, nullable: true, initial: null }),
    }),
  ),
} as const;

type spellCastDataType = typeof spellCastChatMessageSchema;

/** A spell cast and its per-target outcome (#1078) - read it through `getSpellCastOutcome`. */
export class SpellCastChatMessageData extends foundry.abstract.TypeDataModel<
  spellCastDataType,
  any
> {
  static override defineSchema() {
    return spellCastChatMessageSchema;
  }
}

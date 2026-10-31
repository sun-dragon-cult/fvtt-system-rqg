import { spellCastRecordFields } from "../../data-model/shared/spell-cast-record";

const { StringField } = foundry.data.fields;

const spellCastChatMessageSchema = {
  spellUuid: new StringField({ blank: true, nullable: false, required: true, initial: "" }),
  ...spellCastRecordFields(),
} as const;

type spellCastDataType = typeof spellCastChatMessageSchema;

/** A spell cast and how far each of its targets has got (#1224); see `SpellCastRecord`. */
export class SpellCastChatMessageData extends foundry.abstract.TypeDataModel<
  spellCastDataType,
  any
> {
  static override defineSchema() {
    return spellCastChatMessageSchema;
  }
}

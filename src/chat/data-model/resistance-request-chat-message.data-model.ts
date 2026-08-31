import { resistanceRequestState } from "./resistance-request-chat-message.defs.ts";
import { enumChoices } from "../../data-model/shared/enum-choices";

const { NumberField, StringField, DocumentUUIDField, JSONField } = foundry.data.fields;

const resistanceRequestChatMessageSchema = {
  state: new StringField({
    blank: false,
    nullable: false,
    initial: resistanceRequestState[0],
    choices: enumChoices(resistanceRequestState, "RQG.Chat.ResistanceRequest.State."),
  }),
  targetTokenOrActorUuid: new DocumentUUIDField({
    blank: false,
    nullable: false,
    required: true,
  }),
  activeCharacteristics: new StringField({ blank: false, nullable: false, required: true }),
  // "" when the passive side is a manual value rather than an actor characteristic.
  passiveCharacteristics: new StringField({ blank: true, nullable: false, required: false }),
  passiveValue: new NumberField({ nullable: false, required: true, initial: 0 }),
  passiveLabel: new StringField({ blank: false, nullable: false, required: true }),
  // Passive side's name (actor or GM-typed); feeds the "opposes X" flavor line.
  passiveActorName: new StringField({
    blank: true,
    nullable: true,
    initial: undefined,
    required: false,
  }),
  // GM's situational modifier; seeds the roller's Other modifier.
  otherModifier: new NumberField({ nullable: false, required: false, initial: 0 }),
  otherModifierDescription: new StringField({
    blank: true,
    nullable: true,
    initial: undefined,
    required: false,
  }),
  resistanceRoll: new JSONField({
    blank: false,
    nullable: true,
    required: false,
    initial: undefined,
  }),
} as const;

type resistanceRequestDataType = typeof resistanceRequestChatMessageSchema;

export class ResistanceRequestChatMessageData extends foundry.abstract.TypeDataModel<
  resistanceRequestDataType,
  any
> {
  static override defineSchema() {
    return resistanceRequestChatMessageSchema;
  }
}

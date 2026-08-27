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
  passiveValue: new NumberField({ nullable: false, required: true, initial: 0 }),
  passiveLabel: new StringField({ blank: false, nullable: false, required: true }),
  // The obstacle/disease/passive character's name, if any - either an actor's own name, or a
  // GM-typed one for a Manual passive value. Feeds the roll's "opposes X" flavor line.
  passiveActorName: new StringField({
    blank: true,
    nullable: true,
    initial: undefined,
    required: false,
  }),
  // The GM's situational modifier for the contest - seeds the roller's Other modifier, which they
  // can still change before rolling.
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

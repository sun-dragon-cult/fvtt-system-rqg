import type { resistanceRequestState } from "./resistance-request-chat-message.defs";

export type ResistanceRequestState = (typeof resistanceRequestState)[number];

// Narrowed actor type for subtype "resistanceRequest"
export type ResistanceRequestChatMessage = ChatMessage & {
  system: ResistanceRequestDataPropertiesData;
};

export interface ResistanceRequestDataSourceData {
  state: ResistanceRequestState;
  targetTokenOrActorUuid: string;
  /** One characteristic name, or two joined by "+" (e.g. "strength+size") - what the target rolls. */
  activeCharacteristics: string;
  /** Snapshotted passive value/label set by the GM when the request was sent (e.g. a disease's POT). */
  passiveValue: number;
  passiveLabel: string;
  /** The obstacle/disease/passive character's name, if any - feeds the "opposes X" flavor line. */
  passiveActorName: string | undefined;
  /** GM-prefilled defaults for the recipient's modifiers - still editable before rolling. */
  augmentModifier: number;
  meditateModifier: number;
  otherModifier: number;
  otherModifierDescription: string | undefined;
  resistanceRoll: string | object | undefined; // JSONField can be string or parsed object
}

export interface ResistanceRequestDataPropertiesData extends ResistanceRequestDataSourceData {}

export interface ResistanceRequestDataSource {
  type: "resistanceRequest";
  system: ResistanceRequestDataSourceData;
}

export interface ResistanceRequestDataProperties {
  type: "resistanceRequest";
  system: ResistanceRequestDataPropertiesData;
}

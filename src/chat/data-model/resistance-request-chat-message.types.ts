import type { resistanceRequestState } from "./resistance-request-chat-message.defs";

export type ResistanceRequestState = (typeof resistanceRequestState)[number];

// Narrowed actor type for subtype "resistanceRequest"
export type ResistanceRequestChatMessage = ChatMessage & {
  system: ResistanceRequestDataPropertiesData;
};

export interface ResistanceRequestDataSourceData {
  state: ResistanceRequestState;
  targetTokenOrActorUuid: string;
  /** One characteristic name, or two joined by "+" (e.g. "strength+size"). */
  activeCharacteristics: string;
  /** Encoded passive characteristic(s), or "" when the passive side is a manual value. */
  passiveCharacteristics: string;
  /** Passive value/label snapshotted when the GM sent the request. */
  passiveValue: number;
  passiveLabel: string;
  /** Passive side's name, if any - feeds the "opposes X" flavor line. */
  passiveActorName: string | undefined;
  /** GM's situational modifier; seeds the roller's Other modifier. */
  otherModifier: number;
  otherModifierDescription: string | undefined;
  /** GM's chosen roll mode; seeds (but doesn't lock) the roller's selection. */
  rollMode: string;
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

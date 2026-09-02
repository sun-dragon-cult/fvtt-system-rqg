import type {
  resistanceRequestCastRollType,
  resistanceRequestRollerSide,
  resistanceRequestState,
} from "./resistance-request-chat-message.defs";

export type ResistanceRequestState = (typeof resistanceRequestState)[number];
export type ResistanceRequestRollerSide = (typeof resistanceRequestRollerSide)[number];
export type ResistanceRequestCastRollType = (typeof resistanceRequestCastRollType)[number];

// Narrowed actor type for subtype "resistanceRequest"
export type ResistanceRequestChatMessage = ChatMessage & {
  system: ResistanceRequestDataPropertiesData;
};

/**
 * One resistance-table check delegated to the recipient. `rollerSide` says which side the recipient
 * supplies live from their sheet; the other side's value/label were frozen when the request was sent.
 */
export interface ResistanceRequestDataSourceData {
  state: ResistanceRequestState;
  targetTokenOrActorUuid: string;
  rollerSide: ResistanceRequestRollerSide;
  /** One characteristic name, or two joined by "+" (e.g. "strength+size"). "" when frozen or manual. */
  activeCharacteristics: string;
  passiveCharacteristics: string;
  activeValue: number;
  activeLabel: string;
  passiveValue: number;
  passiveLabel: string;
  /** Side's name, if any - the frozen side's feeds the "opposes X" flavor line. */
  activeActorName: string | undefined;
  passiveActorName: string | undefined;
  /** Offers an "Accept" button instead of forcing a roll. */
  allowVoluntaryAccept: boolean;
  /** What the check is about, e.g. the spell being resisted. */
  description: string | undefined;
  /** The spell cast that triggered this, rendered as a row above the resistance roll. */
  castRoll: string | object | undefined;
  castRollType: ResistanceRequestCastRollType | "";
  /** "opposes X / POW vs POW" markup, shown in the body when the flavor slot holds the spell. */
  resistanceFlavor: string;
  /** The spell's flavor without the concealment wrapper, so a reveal can rebuild it. */
  castFlavor: string;
  /** Target's uuid while the spell is concealed from them; cleared when it takes effect. */
  spellHiddenFromUuid: string;
  /** The caster, exempt from that concealment even if they also own the target. */
  spellCasterUuid: string;
  /** Whether the outcome should be phrased as the spell taking effect. */
  isSpellCast: boolean;
  /** Plain-language result, filled in once the roll lands. */
  outcomeDescription: string;
  /** Request author's situational modifier; always applies to the active side. */
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

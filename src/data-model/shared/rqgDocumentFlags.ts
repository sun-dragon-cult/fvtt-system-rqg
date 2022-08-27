import { ResultEnum } from "./ability";
import { CharacteristicData } from "../../chat/characteristicChatHandler";
import { ChatMessageType } from "../../chat/RqgChatMessage";
import { FamilyHistoryWizardValues, YearResult } from "../../dialog/actorWizardApplication";


export const documentRqidFlags = "documentRqidFlags";
export const actorWizardFlags = "actorWizardFlags";

export interface RqgItemFlags {
  [documentRqidFlags]: DocumentRqidFlags;
}

export interface RqgJournalEntryFlags {
  [documentRqidFlags]: DocumentRqidFlags;
}

export interface RqgRollTableFlags {
  [documentRqidFlags]: DocumentRqidFlags;
}

export interface RqgActorFlags {
  [documentRqidFlags]?: DocumentRqidFlags;
  [actorWizardFlags]?: {
    actorWizardComplete?: boolean;
    selectedSpeciesId?: string;
    selectedHomelandRqid?: string;
    familyHistory?: FamilyHistoryWizardValues;
    isActorTemplate?: boolean;
    wizardChoices?: string;
  };
}

export interface DocumentRqidFlags {
  /** Defines what the document is. Example "i.skill.ride-bison" */
  /**
   * Defines the identity of a document (item, journal entry, ...).
   * The id is not unique, instead it is used to identify what the document is. It is made up of three parts
   * separated with a dot (.)
   * First parts is document type abbreviation {@link RQG_CONFIG} see rqid.prefixes
   * Second part is type inside the document, for example cult or skill. This can be empty for documents that
   * do not have types
   * Third part is the sluggified id given to the document.
   * Example `i.skill.ride-bison`or `je..rune-descriptions-air`
   */
  id?: string;
  /** Defines what language the document is written in. Example "en", "pl" */
  lang?: string;
  /** Defines how this rqid should be ranked compared to others with the same id. Higher number wins. */
  priority?: number;
}

// Base chat message flag structure
export type BaseRqgChatFlags = {
  /** The different types of chatmessages. Used for type narrowing, see {@link assertChatMessageFlagType} */
  type: ChatMessageType;
  /** Data that needs to be persisted. Should include {@link CommonRqgChatFlags} */
  chat: {};
  /** Data from inputs in the form only */
  formData: {};
};

// Flags common to all chatmessages
export type CommonRqgChatFlags = {
  /** The actor that is speaking / acting */
  actorUuid: string;
  /** The token that is speaking / acting */
  tokenUuid: string | undefined;
  /** An image url to represent what the chat message is about (often an item.img) */
  chatImage: string | undefined;
};

export interface CharacteristicChatFlags extends BaseRqgChatFlags {
  type: "characteristicChat";
  chat: CommonRqgChatFlags & {
    characteristic: CharacteristicData;
  };
  formData: {
    difficulty: FormDataEntryValue;
    modifier: FormDataEntryValue;
  };
}

export interface ItemChatFlags extends BaseRqgChatFlags {
  type: "itemChat";
  chat: CommonRqgChatFlags & {
    itemUuid: string;
  };
  formData: {
    modifier: FormDataEntryValue;
  };
}

export interface ReputationChatFlags extends BaseRqgChatFlags {
  type: "reputationChat";
  chat: CommonRqgChatFlags & {};
  formData: {
    modifier: FormDataEntryValue;
  };
}
export interface RuneMagicChatFlags extends BaseRqgChatFlags {
  type: "runeMagicChat";
  chat: CommonRqgChatFlags & {
    itemUuid: string;
  };
  formData: {
    runePointCost: FormDataEntryValue;
    magicPointBoost: FormDataEntryValue;
    ritualOrMeditation: FormDataEntryValue;
    skillAugmentation: FormDataEntryValue;
    otherModifiers: FormDataEntryValue;
    selectedRuneId: FormDataEntryValue;
  };
}

export interface SpiritMagicChatFlags extends BaseRqgChatFlags {
  type: "spiritMagicChat";
  chat: CommonRqgChatFlags & {
    itemUuid: string;
  };
  formData: {
    level: FormDataEntryValue;
    boost: FormDataEntryValue;
  };
}

export interface WeaponChatFlags extends BaseRqgChatFlags {
  type: "weaponChat";
  chat: CommonRqgChatFlags & {
    weaponUuid: string;
    result: ResultEnum | undefined;
    specialDamageTypeText: string | undefined;
  };
  formData: {
    otherModifiers: FormDataEntryValue;
    usage: FormDataEntryValue;
    combatManeuverName: FormDataEntryValue;
    actionName: string; // the clicked buttons name (like "combatManeuver" or "damageRoll")
    actionValue: string; // the clicked buttons value (like "slash" or "special")
  };
}

export type RqgChatMessageFlags =
  | CharacteristicChatFlags
  | ItemChatFlags
  | ReputationChatFlags
  | RuneMagicChatFlags
  | SpiritMagicChatFlags
  | WeaponChatFlags;

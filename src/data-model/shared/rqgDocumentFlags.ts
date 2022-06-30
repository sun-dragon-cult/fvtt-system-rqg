import { ResultEnum } from "./ability";
import { CharacteristicData } from "../../chat/characteristicCard";
import { UsageType } from "../item-data/weaponData";

export type ChatCardTypes =
  | "characteristic"
  | "item"
  | "reputation"
  | "runeMagic"
  | "spiritMagic"
  | "weapon";

// Base chat card flag structure
export type BaseRqgChatCard = {
  /** The different types of chatmessages. Used for type narrowing, see {@link assertChatMessageFlagType} */
  type: ChatCardTypes;
  /** Data that needs to be persisted. Should include {@link CommonRqgCardFlags} */
  card: {};
  /** Data from inputs in the form only */
  formData: {};
};

// Flags common to all chatmessages
export type CommonRqgCardFlags = {
  /** The actor that is speaking / acting */
  actorUuid: string;
  /** The token that is speaking / acting */
  tokenUuid: string | undefined;
  /** An image url to represent what the chat card is about (often an item.img) */
  chatImage: string | undefined;
};

export interface CharacteristicCardFlags extends BaseRqgChatCard {
  type: "characteristic";
  card: CommonRqgCardFlags & {
    characteristic: CharacteristicData;
  };
  formData: {
    difficulty: FormDataEntryValue;
    modifier: FormDataEntryValue;
  };
}

export interface ItemCardFlags extends BaseRqgChatCard {
  type: "item";
  card: CommonRqgCardFlags & {
    itemUuid: string;
  };
  formData: {
    modifier: FormDataEntryValue;
  };
}

export interface ReputationCardFlags extends BaseRqgChatCard {
  type: "reputation";
  card: CommonRqgCardFlags & {};
  formData: {
    modifier: FormDataEntryValue;
  };
}
export interface RuneMagicCardFlags extends BaseRqgChatCard {
  type: "runeMagic";
  card: CommonRqgCardFlags & {
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

export interface SpiritMagicCardFlags extends BaseRqgChatCard {
  type: "spiritMagic";
  card: CommonRqgCardFlags & {
    itemUuid: string;
  };
  formData: {
    level: FormDataEntryValue;
    boost: FormDataEntryValue;
  };
}

export interface WeaponCardFlags extends BaseRqgChatCard {
  type: "weapon";
  card: CommonRqgCardFlags & {
    skillUuid: string;
    weaponUuid: string;
    usage: UsageType;
    result: ResultEnum | undefined;
    specialDamageTypeText: string | undefined;
  };
  formData: {
    otherModifiers: FormDataEntryValue;
    combatManeuverName: FormDataEntryValue;
  };
}

export type RqgChatMessageFlags =
  | CharacteristicCardFlags
  | ItemCardFlags
  | ReputationCardFlags
  | RuneMagicCardFlags
  | SpiritMagicCardFlags
  | WeaponCardFlags;

import { ResultEnum } from "./ability";
import { CharacteristicData } from "../../chat/characteristicCard";
import { UsageType } from "../item-data/weaponData";
import { ChatCardType } from "../../chat/RqgChatMessage";

// Base chat card flag structure
export type BaseRqgChatCard = {
  /** The different types of chatmessages. Used for type narrowing, see {@link assertChatMessageFlagType} */
  type: ChatCardType;
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
  type: "characteristicCard";
  card: CommonRqgCardFlags & {
    characteristic: CharacteristicData;
  };
  formData: {
    difficulty: FormDataEntryValue;
    modifier: FormDataEntryValue;
  };
}

export interface ItemCardFlags extends BaseRqgChatCard {
  type: "itemCard";
  card: CommonRqgCardFlags & {
    itemUuid: string;
  };
  formData: {
    modifier: FormDataEntryValue;
  };
}

export interface ReputationCardFlags extends BaseRqgChatCard {
  type: "reputationCard";
  card: CommonRqgCardFlags & {};
  formData: {
    modifier: FormDataEntryValue;
  };
}
export interface RuneMagicCardFlags extends BaseRqgChatCard {
  type: "runeMagicCard";
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
  type: "spiritMagicCard";
  card: CommonRqgCardFlags & {
    itemUuid: string;
  };
  formData: {
    level: FormDataEntryValue;
    boost: FormDataEntryValue;
  };
}

export interface WeaponCardFlags extends BaseRqgChatCard {
  type: "weaponCard";
  card: CommonRqgCardFlags & {
    skillUuid: string; // TODO Not needed with weaponUuid + usage ?
    weaponUuid: string;
    usage: UsageType;
    result: ResultEnum | undefined;
    specialDamageTypeText: string | undefined;
  };
  formData: {
    otherModifiers: FormDataEntryValue;
    combatManeuverName: FormDataEntryValue;
    actionName: string; // the clicked buttons name (like "combatManeuver" or "damageRoll")
    actionValue: string; // the clicked buttons value (like "slash" or "special")
  };
}

export type RqgChatMessageFlags =
  | CharacteristicCardFlags
  | ItemCardFlags
  | ReputationCardFlags
  | RuneMagicCardFlags
  | SpiritMagicCardFlags
  | WeaponCardFlags;

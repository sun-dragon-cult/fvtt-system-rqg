import type { RqgItemType } from "@item-model/itemTypes.ts";
import type { RqgConfig, systemId } from "./system/config";
import type {
  CardFlags,
  MacroFlags,
  PlaylistFlags,
  RqgActorFlags,
  RqgItemFlags,
  RqgJournalEntryFlags,
  RqgJournalEntryPageFlags,
  RollTableFlags,
  SceneFlags,
} from "./data-model/shared/rqgDocumentFlags";
import type { TokenRulerSettingsType } from "./applications/settings/tokenRulerSettings.types";
import type { RqgChatMessageDataSource } from "./data-model/chat-data/combatChatMessage.types.ts";

import type { RqgChatMessage } from "./chat/RqgChatMessage.ts";
import type { RqgToken } from "./combat/rqgToken.ts";
import type { Dice3D } from "./module-integrations/dice-so-nice";
import type { CombatChatMessageData } from "./data-model/chat-data/combatChatMessage.dataModel.ts";
import type { RqgActor } from "@actors/rqgActor.ts";
import type { RqgItem } from "@items/rqgItem.ts";
import type { RqgCombatant } from "./combat/rqgCombatant.ts";
import type { RqgActiveEffect } from "./active-effect/rqgActiveEffect.ts";

import type { ArmorDataModel } from "./data-model/item-data/armorDataModel";
import type { CultDataModel } from "./data-model/item-data/cultDataModel";
import type { GearDataModel } from "./data-model/item-data/gearDataModel";
import type { HitLocationDataModel } from "./data-model/item-data/hitLocationDataModel";
import type { HomelandDataModel } from "./data-model/item-data/homelandDataModel";
import type { OccupationDataModel } from "./data-model/item-data/occupationDataModel";
import type { PassionDataModel } from "./data-model/item-data/passionDataModel";
import type { RuneDataModel } from "./data-model/item-data/runeDataModel";
import type { RuneMagicDataModel } from "./data-model/item-data/runeMagicDataModel";
import type { SkillDataModel } from "./data-model/item-data/skillDataModel";
import type { SpiritMagicDataModel } from "./data-model/item-data/spiritMagicDataModel";
import type { WeaponDataModel } from "./data-model/item-data/weaponDataModel";
import type { CharacterDataModel } from "./data-model/actor-data/characterDataModel";

declare global {
  // TEMP(v14-types): Remove this namespace augmentation once
  // @league-of-foundry-developers/foundry-vtt-types includes
  // CONST.ACTIVE_EFFECT_CHANGE_TYPES.
  // Search token for cleanup: RQG-TEMP-REMOVE-ACTIVE-EFFECT-CHANGE-TYPES
  namespace CONST {
    const ACTIVE_EFFECT_CHANGE_TYPES: Readonly<{
      custom: 0;
      multiply: 10;
      add: 20;
      subtract: 20;
      downgrade: 30;
      upgrade: 40;
      override: 50;
    }>;
  }

  interface Game {
    dice3d?: Dice3D;
  }

  interface CONFIG {
    RQG: RqgConfig;
  }

  // Since we never use these before `init` tell league types that they are never undefined
  interface LenientGlobalVariableTypes {
    game: never;
    socket: never;
    ui: never;
  }

  /** Standard format for data to Foundry SelectOptions handlebar helper */
  type SelectOptionData<T> = { value: T; label: string; group?: string };

  interface DocumentClassConfig {
    Actor: typeof RqgActor;
    Item: typeof RqgItem;
    ChatMessage: typeof RqgChatMessage;
    Combatant: typeof RqgCombatant;
    ActiveEffect: typeof RqgActiveEffect;
  }

  interface DataModelConfig {
    Item: {
      armor: typeof ArmorDataModel;
      cult: typeof CultDataModel;
      gear: typeof GearDataModel;
      hitLocation: typeof HitLocationDataModel;
      homeland: typeof HomelandDataModel;
      occupation: typeof OccupationDataModel;
      passion: typeof PassionDataModel;
      rune: typeof RuneDataModel;
      runeMagic: typeof RuneMagicDataModel;
      skill: typeof SkillDataModel;
      spiritMagic: typeof SpiritMagicDataModel;
      weapon: typeof WeaponDataModel;
    };
    Actor: {
      character: typeof CharacterDataModel;
    };
    ChatMessage: {
      combat: typeof CombatChatMessageData;
    };
  }

  interface FlagConfig {
    Actor: { [systemId]?: RqgActorFlags };
    Card: { [systemId]?: CardFlags };
    Item: { [systemId]?: RqgItemFlags };
    JournalEntry: { [systemId]?: RqgJournalEntryFlags };
    JournalEntryPage: { [systemId]?: RqgJournalEntryPageFlags };
    Macro: { [systemId]?: MacroFlags };
    Playlist: { [systemId]?: PlaylistFlags };
    RollTable: { [systemId]?: RollTableFlags };
    Scene: { [systemId]?: SceneFlags };
    ChatMessage: { [systemId]?: RqgChatMessageDataSource };
  }

  interface PlaceableObjectClassConfig {
    Token: typeof RqgToken;
  }

  interface SettingConfig {
    "rqg.autoActivateChatTab": boolean;
    "rqg.worldLanguage": string;
    "rqg.fumbleRollTable": string;
    "rqg.worldMigrationVersion": string;
    "rqg.sortHitLocationsLowToHigh": boolean;
    "rqg.defaultItemIconSettings": Record<RqgItemType | "reputation", string>;
    "rqg.actor-wizard-feature-flag": boolean;
    "rqg.showHeropoints": boolean;
    "rqg.showCharacteristicRatings": boolean;
    "rqg.tokenRulerSettings": TokenRulerSettingsType;
    "rqg.allowCombatWithoutToken": boolean;
  }

  interface ConfiguredCombatant {
    document: RqgCombatant;
  }

  interface SystemNameConfig {
    name: "rqg";
  }
}

// // Type for documents that can have RQID flags
type RqidEnabledDocument =
  | Actor
  | Item
  | JournalEntry
  | JournalEntryPage
  | Macro
  | Playlist
  | RollTable
  | Scene
  | Card
  | ActiveEffect
  | Combatant
  | RqgChatMessage;

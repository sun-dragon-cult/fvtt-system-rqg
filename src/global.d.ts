import type { RqgItemDataProperties, RqgItemDataSource } from "@item-model/itemTypes.ts";
import {
  type RqgActorDataProperties,
  type RqgActorDataSource,
} from "./data-model/actor-data/rqgActorData";
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
import type { IconSettingsData } from "./applications/defaultItemIconSettings";
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

declare global {
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

  // Use SourceConfig/DataConfig for Items and Actors (template.json approach)
  interface SourceConfig {
    Item: RqgItemDataSource;
    Actor: RqgActorDataSource;
  }

  interface DataConfig {
    Item: RqgItemDataProperties;
    Actor: RqgActorDataProperties;
  }

  // Use DataModelConfig for ChatMessages (DataModel approach)
  interface DataModelConfig {
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
    "rqg.defaultItemIconSettings": IconSettingsData;
    "rqg.actor-wizard-feature-flag": boolean;
    "rqg.showHeropoints": boolean;
    "rqg.showCharacteristicRatings": boolean;
    "rqg.tokenRulerSettings": TokenRulerSettingsType;
    "rqg.allowCombatWithoutToken": boolean;
  }

  interface ConfiguredCombatant<SubType extends Combatant.SubType> {
    document: RqgCombatant<SubType>;
  }

  interface SystemNameConfig {
    name: "rqg";
  }
}

// TODO how to type which documents that can handle Rqid?
// type RqidDocumentType =
//   | "actor"
//   | "item"
//   | "journalEntry"
//   | "cards"
//   | "macro"
//   | "playlist"
//   | "rollTable"
//   | "scene";
//
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

import type { RqgItemType } from "@item-model/item-types.ts";
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
} from "./data-model/shared/rqg-document-flags";
import type { TokenRulerSettingsType } from "./applications/settings/token-ruler-settings.types";
import type { RqgChatMessageDataSource } from "./chat/data-model/combat-chat-message.types.ts";
import type { RqgActor } from "./actors/rqg-actor.ts";
import type { RqgItem } from "./items/rqg-item.ts";
import type { RqgChatMessage } from "./chat/rqg-chat-message.ts";
import type { RqgCombatant } from "./combat/rqg-combatant.ts";
import type { RqgActiveEffect } from "./active-effect/rqg-active-effect.ts";
import type { ClickableScriptsRegionBehavior } from "./scene/clickable-scripts-region-behavior.ts";
import type { ArmorDataModel } from "./data-model/item-data/armor-data-model";
import type { CultDataModel } from "./data-model/item-data/cult-data-model";
import type { GearDataModel } from "./data-model/item-data/gear-data-model";
import type { HitLocationDataModel } from "./data-model/item-data/hit-location-data-model";
import type { HomelandDataModel } from "./data-model/item-data/homeland-data-model";
import type { OccupationDataModel } from "./data-model/item-data/occupation-data-model";
import type { PassionDataModel } from "./data-model/item-data/passion-data-model";
import type { RuneDataModel } from "./data-model/item-data/rune-data-model";
import type { RuneMagicDataModel } from "./data-model/item-data/rune-magic-data-model";
import type { SkillDataModel } from "./data-model/item-data/skill-data-model";
import type { SpiritMagicDataModel } from "./data-model/item-data/spirit-magic-data-model";
import type { WeaponDataModel } from "./data-model/item-data/weapon-data-model";
import type { CharacterDataModel } from "./data-model/actor-data/character-data-model";
import type { CombatChatMessageData } from "./chat/data-model/combat-chat-message.data-model.ts";
import type { Dice3D } from "./module-integrations/dice-so-nice";

// Namespace imports for Foundry document types (from fvtt-types)
import Actor = foundry.documents.Actor;
import Item = foundry.documents.Item;
import ActiveEffect = foundry.documents.ActiveEffect;
import JournalEntry = foundry.documents.JournalEntry;
import JournalEntryPage = foundry.documents.JournalEntryPage;
import Macro = foundry.documents.Macro;
import Playlist = foundry.documents.Playlist;
import RollTable = foundry.documents.RollTable;
import Scene = foundry.documents.Scene;
import Card = foundry.documents.Card;
import Combatant = foundry.documents.Combatant;

declare global {
  // TEMP(v14-types): Remove this namespace augmentation once
  // @league-of-foundry-developers/foundry-vtt-types includes
  // CONST.ACTIVE_EFFECT_CHANGE_TYPES.
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

  type ActiveEffectChangeType = Exclude<keyof typeof CONST.ACTIVE_EFFECT_CHANGE_TYPES, "subtract">;

  interface Game {
    dice3d?: Dice3D;
  }

  interface CONFIG {
    RQG: RqgConfig;
  }

  namespace CONFIG {
    // TEMP(v14-types): Declare the RQG custom "Norse" font so it can be assigned to
    // CONFIG.fontDefinitions, which strips its index signature via RemoveIndexSignatures.
    interface FontDefinitions {
      Norse: Font.FamilyDefinition;
    }
  }

  // Since we never use these before `init` tell league types that they are never undefined
  interface LenientGlobalVariableTypes {
    game: never;
    socket: never;
    ui: never;
  }

  // TEMP(v14-types): Remove once fvtt-types declares Foundry's global `_del` helper.
  const _del: never;

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
    RegionBehavior: {
      clickableScripts: typeof ClickableScriptsRegionBehavior;
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

  // TEMP(v14-types): We previously augmented PlaceableObjectClassConfig.Token with `typeof RqgToken`
  // to get RqgToken-specific typing from CONFIG.Token.objectClass / canvas.tokens.placeables etc.
  // As of fvtt-types main (confirmed with any entry, even the base Token class), this triggers an
  // internal generic-constraint bug in placeable-object.d.mts:
  // "_GetKey<PlaceableObjectClassConfig, Name, DefaultPlaceables[Name]> does not satisfy the
  // constraint 'abstract new (...args: never) => any'". This is an upstream fvtt-types bug, not
  // something fixable from our augmentation. Removed the augmentation until upstream fixes it;
  // call sites that need RqgToken-specific members should narrow via `instanceof RqgToken` or use
  // the base `Token` type when the RqgToken-specific members aren't actually needed.

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
    "rqg.matchEffectSuspensionToEquippedStatusDefault": boolean;
    "rqg.showActorActiveEffectsTab": boolean;
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

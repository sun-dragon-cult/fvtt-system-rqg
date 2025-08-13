import type { RqgItemDataProperties, RqgItemDataSource } from "@item-model/itemTypes.ts";
import type { RqgActor } from "./actors/rqgActor";
import type {
  RqgActorDataProperties,
  RqgActorDataSource,
} from "./data-model/actor-data/rqgActorData";
import type { RqgConfig, systemId } from "./system/config";
import type {
  RqgActorFlags,
  RqgItemFlags,
  RqgJournalEntryFlags,
  RqgRollTableFlags,
} from "./data-model/shared/rqgDocumentFlags";
import type { IconSettingsData } from "./applications/defaultItemIconSettings";
import type { RqgItem } from "./items/rqgItem";
import type TokenRulerSettings from "./applications/settings/tokenRulerSettings";
import type {
  RqgChatMessageDataProperties,
  RqgChatMessageDataSource,
} from "./data-model/chat-data/combatChatMessage.types.ts";

declare global {
  // Since we never use these before `init` tell league types that they are never undefined
  interface LenientGlobalVariableTypes {
    game: never;
    canvas: never;
  }

  /** Standard format for data to Foundry SelectOptions handlebar helper */
  type SelectOptionData<T> = { value: T; label: string; group?: string };

  interface DocumentClassConfig {
    Item: typeof RqgItem;
    Actor: typeof RqgActor;
    // ChatMessage: typeof RqgChatMessage;
    // RegionBehavior: typeof ClickableScriptsRegionBehavior;
  }

  interface SourceConfig {
    Item: RqgItemDataSource;
    Actor: RqgActorDataSource;
    ChatMessage: RqgChatMessageDataSource;
    // RegionBehavior: typeof ClickableScriptsRegionBehavior;
  }

  interface DataConfig {
    Item: RqgItemDataProperties;
    Actor: RqgActorDataProperties;
    ChatMessage: RqgChatMessageDataProperties;
  }

  interface FlagConfig {
    Item: { [systemId]?: RqgItemFlags };
    Actor: { [systemId]?: RqgActorFlags };
    JournalEntry: { [systemId]?: RqgJournalEntryFlags };
    RollTable: { [systemId]?: RqgRollTableFlags };
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
    "rqg.tokenRulerSettings": TokenRulerSettings;
    "rqg.allowCombatWithoutToken": boolean;
  }

  interface CONFIG {
    RQG: RqgConfig;
  }
}

// Dice so Nice integration TODO move to separate file
declare global {
  namespace Dice3D {
    interface ShowForRollOptions {
      /** @defaultValue {false} */
      ghost?: boolean | null | undefined;

      /** @defaultValue {false} */
      secret?: boolean | null | undefined;
    }

    interface SpeakerData {} // Stub
    interface ShowForRollOptions {}
  }

  interface Dice3D {
    /**
     * Show the 3D Dice animation for the Roll made by the User.
     *
     * @param roll an instance of Roll class to show 3D dice animation.
     * @param user the user who made the roll (game.user by default).
     * @param synchronize if the animation needs to be sent and played for each players (true/false).
     * @param users list of users or userId who can see the roll, leave it empty if everyone can see.
     * @param blind if the roll is blind for the current user
     * @param messageID ChatMessage related to this roll (default: null)
     * @param speaker Object based on the ChatSpeakerData data schema related to this roll. Useful to fully support DsN settings like "hide npc rolls". (Default: null)
     * @param options Object with 2 booleans: ghost (default: false) and secret (default: false)
     * @returns {Promise<boolean>} when resolved true if the animation was displayed, false if not.
     */
    showForRoll(
      roll: Roll.Any,
      user: User.Implementation | null | undefined,
      synchronize: boolean,
      users: Users[] | null | undefined,
      blind: boolean,
      messageID?: string,
      speaker?: Dice3D.SpeakerData,
      options?: Dice3D.ShowForRollOptions,
    ): Promise<boolean>;
  }

  interface Game {
    dice3d: Dice3D;
  }
}

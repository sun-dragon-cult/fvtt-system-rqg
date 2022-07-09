import { RqgItem } from "./items/rqgItem";
import { RqgItemDataProperties, RqgItemDataSource } from "./data-model/item-data/itemTypes";
import { RqgActor } from "./actors/rqgActor";
import { RqgActorDataProperties, RqgActorDataSource } from "./data-model/actor-data/rqgActorData";
import { RqgConfig } from "./system/config";
import { RqgChatMessageFlags } from "./data-model/shared/rqgDocumentFlags";
import {
  RqgActorFlags,
  RqgItemFlags,
  RqgJournalEntryFlags,
  RqgRollTableFlags,
} from "./data-model/shared/rqgDocumentFlags";

declare global {
  interface DocumentClassConfig {
    Item: typeof RqgItem;
    Actor: typeof RqgActor;
  }
}

declare global {
  interface SourceConfig {
    Item: RqgItemDataSource;
    Actor: RqgActorDataSource;
  }
}

declare global {
  interface DataConfig {
    Item: RqgItemDataProperties;
    Actor: RqgActorDataProperties;
  }
}

declare global {
  interface FlagConfig {
    Item: { rqg?: RqgItemFlags };
    Actor: { rqg?: RqgActorFlags };
    JournalEntry: { rqg?: RqgJournalEntryFlags };
    RollTable: { rqg?: RqgRollTableFlags };
    ChatMessage: { rqg?: RqgChatMessageFlags };
  }
}

declare global {
  namespace ClientSettings {
    interface Values {
      "rqg.specialCrit": boolean;
      "rqg.runesCompendium": string;
      "rqg.fumbleRollTable": string;
      "rqg.systemMigrationVersion": string;
      "rqg.hitLocations": Object;
      "rqg.magicRuneName": string;
      "rqg.defaultItemIconSettings": any; // TODO type the setting
    }
  }
}

declare global {
  interface CONFIG {
    RQG: RqgConfig;
  }
}

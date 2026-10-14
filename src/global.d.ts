import type { RqgItemType } from "@item-model/item-types.ts";
import type { RqgConfig, systemId } from "./system/config";
import type {
  CardFlags,
  MacroFlags,
  RqgActiveEffectFlags,
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
import type { ApplySpellBehaviourQueryData } from "./system/spell-effects/run-spell-apply.ts";
import type { SpellEffectApplied } from "./system/spell-effects/apply-spell-effect.ts";
import type { SpellBehaviourRegistry } from "./system/spell-effects/spell-behaviour.ts";
import type { SkillBehaviorRegistry } from "./system/skill-behaviors/skill-behavior.ts";
import type { AbilityItem } from "@item-model/item-types.ts";
import type { SpellItem } from "@item-model/spell.ts";
import type { WeaponItem } from "@item-model/weapon-data-model.ts";
import type { AttackHookData, DefenceHookData } from "./rolls/roll-method-options.ts";
import type { SpiritMagicRoll } from "./rolls/spirit-magic-roll/spirit-magic-roll.ts";
import type { SpiritMagicRollOptions } from "./rolls/spirit-magic-roll/spirit-magic-roll.types.ts";
import type { RuneMagicRoll } from "./rolls/rune-magic-roll/rune-magic-roll.ts";
import type { RuneMagicRollOptions } from "./rolls/rune-magic-roll/rune-magic-roll.types.ts";
import type { AbilityRoll } from "./rolls/ability-roll/ability-roll.ts";
import type { AbilityRollOptions } from "./rolls/ability-roll/ability-roll.types.ts";
import type { CharacteristicRoll } from "./rolls/characteristic-roll/characteristic-roll.ts";
import type { CharacteristicRollOptions } from "./rolls/characteristic-roll/characteristic-roll.types.ts";
import type { RqgChatMessage } from "./chat/rqg-chat-message.ts";
import type { RqgCombatant } from "./combat/rqg-combatant.ts";
import type { RqgActiveEffect } from "./active-effect/rqg-active-effect.ts";
import type { RqgToken } from "./combat/rqg-token.ts";
import type { SpellStackingRule } from "./active-effect/data-model/spell-effect.defs";
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
import type { ResistanceRequestChatMessageData } from "./chat/data-model/resistance-request-chat-message.data-model.ts";
import type { SpellCastChatMessageData } from "./chat/data-model/spell-cast-chat-message.data-model.ts";
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
  type ActiveEffectChangeType = Exclude<keyof typeof CONST.ACTIVE_EFFECT_CHANGE_TYPES, "subtract">;

  interface Game {
    dice3d?: Dice3D;
  }

  interface CONFIG {
    RQG: RqgConfig;
  }

  /** The system's own hooks, called through callRqgHook - part of the public API. */
  interface RqgHooks {
    /** Fired at `setup`: modules register their spell behaviours. */
    "rqg.registerSpellBehaviours": (registry: SpellBehaviourRegistry) => void;
    /** Fired at `setup`: modules register their skill behaviors. */
    "rqg.registerSkillBehaviors": (registry: SkillBehaviorRegistry) => void;
    /**
     * Before a skill, rune or passion roll, on the rolling client. Change `options` (for example
     * push to `options.modifiers`) or return false to cancel. Listeners run synchronously.
     */
    "rqg.preAbilityRoll": (item: AbilityItem, options: AbilityRollOptions) => boolean | void;
    /** After a skill, rune or passion roll, on the rolling client, before experience is checked. */
    "rqg.abilityRoll": (item: AbilityItem, roll: AbilityRoll, options: AbilityRollOptions) => void;
    /** Before a characteristic roll, see `rqg.preAbilityRoll`. */
    "rqg.preCharacteristicRoll": (
      actor: RqgActor,
      options: CharacteristicRollOptions,
    ) => boolean | void;
    /** After a characteristic roll, on the rolling client. */
    "rqg.characteristicRoll": (
      actor: RqgActor,
      roll: CharacteristicRoll,
      options: CharacteristicRollOptions,
    ) => void;
    /** Before a Reputation roll, see `rqg.preAbilityRoll`. */
    "rqg.preReputationRoll": (actor: RqgActor, options: AbilityRollOptions) => boolean | void;
    /** After a Reputation roll, on the rolling client. */
    "rqg.reputationRoll": (actor: RqgActor, roll: AbilityRoll, options: AbilityRollOptions) => void;
    /**
     * Before a spirit or rune magic spell is cast, on the casting client, before the cast is
     * checked. `caster` may differ from the spell's owner (Allied Spirit, bound spirit, matrix).
     * Change `options` or return false to cancel; see `rqg.preAbilityRoll`. For rune magic the
     * rune is already chosen: `usedRuneName` and `usedRuneChance` are only shown and rolled, while
     * experience and rune points still go to that rune. To use another rune, cast with
     * `usedRuneId` instead.
     */
    "rqg.preSpellCast": (
      spell: SpellItem,
      caster: RqgActor,
      options: SpiritMagicRollOptions | RuneMagicRollOptions,
    ) => boolean | void;
    /** After a spell was cast and its costs paid, on the casting client. */
    "rqg.spellCast": (
      spell: SpellItem,
      caster: RqgActor,
      roll: SpiritMagicRoll | RuneMagicRoll,
      options: SpiritMagicRollOptions | RuneMagicRollOptions,
    ) => void;
    /**
     * When an attack is made, on the attacking client, before ammunition is used. Push to
     * `attack.rollOptions.modifiers` or return false to cancel; see `rqg.preAbilityRoll`.
     */
    "rqg.preAttack": (weapon: WeaponItem, attack: AttackHookData) => boolean | void;
    /**
     * The attack is made: the attack card is posted and ammunition used, on the attacking client.
     * Not called when the card wasn't created. The attack roll is rolled later, in the defence.
     */
    "rqg.attack": (
      weapon: WeaponItem,
      attack: AttackHookData & { chatMessage: ChatMessage },
    ) => void;
    /**
     * Before the defence is rolled, on the client that submits the defence (the defender's or the
     * GM's). To forbid a parry or dodge, set `defence.defence = "ignore"` and push a note saying
     * why; returning false aborts the defence and leaves the attack card waiting for one.
     */
    "rqg.preDefence": (defender: RqgActor, defence: DefenceHookData) => boolean | void;
    /** After the attack and defence are rolled and the attack card updated with the outcome. */
    "rqg.defence": (
      defender: RqgActor,
      defence: DefenceHookData & {
        attackRoll: AbilityRoll;
        defenceRoll: AbilityRoll | undefined;
        chatMessage: ChatMessage;
      },
    ) => void;
  }

  namespace CONFIG {
    interface Queries {
      "rqg.applySpellBehaviour": (
        data: ApplySpellBehaviourQueryData,
      ) => Promise<SpellEffectApplied | undefined>;
    }

    // Declare the RQG custom "Norse" font so it can be assigned to
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
      resistanceRequest: typeof ResistanceRequestChatMessageData;
      spellCast: typeof SpellCastChatMessageData;
    };
    RegionBehavior: {
      clickableScripts: typeof ClickableScriptsRegionBehavior;
    };
  }

  interface FlagConfig {
    ActiveEffect: { [systemId]?: RqgActiveEffectFlags };
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
    "rqg.matchEffectSuspensionToEquippedStatusDefault": boolean;
    "rqg.showActorActiveEffectsTab": boolean;
    "rqg.spellStackingRule": SpellStackingRule;
    "rqg.naturalHealingEnabled": boolean;
    "rqg.magicPointRecoveryEnabled": boolean;
    "rqg.showResistanceRequestTokenHudButton": boolean;
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

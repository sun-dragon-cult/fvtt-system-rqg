import type { weaponDesignation } from "./combatChatMessage.defs";
import type { attackState } from "./combatChatMessage.defs";
import type { CombatManeuver, UsageType } from "@item-model/weaponData.ts";

// TODO: This is a temporary fix until the data model is fully implemented
export type AttackState = (typeof attackState)[number];
export type WeaponDesignation = (typeof weaponDesignation)[number];

export type ChatMessageTypes = "combat";

// Narrowed actor type for subtype "combat"
export type CombatChatMessage = ChatMessage & { system: CombatDataPropertiesData };

export interface CombatDataSourceData {
  attackState: AttackState;
  attackingTokenOrActorUuid: string;
  defendingTokenOrActorUuid: string | undefined;
  attackRoll: string | object; // JSONField can be string or parsed object
  attackCombatManeuver: CombatManeuver;
  attackExtraDamage: string | undefined;
  attackDamageBonus: string | undefined;
  actorDamagedApplied: boolean;
  weaponDamageApplied: boolean;
  attackWeaponUuid: string | undefined;
  attackWeaponUsage: UsageType;
  defenceWeaponUsage: UsageType | undefined;
  outcomeDescription: string | undefined;
  defenceRoll: string | object | undefined; // JSONField can be string or parsed object
  attackerFumbled: boolean;
  defenderFumbled: boolean;
  damageRoll: string | object | undefined; // JSONField can be string or parsed object
  hitLocationRoll: string | object | undefined; // JSONField can be string or parsed object
  ignoreDefenderAp: boolean;
  weaponDamage: number | undefined;
  defenderHitLocationDamage: number | undefined;
  damagedWeaponUuid: string | undefined;
  attackerFumbleOutcome: string | undefined;
  defenderFumbleOutcome: string | undefined;
  weaponDoingDamage: WeaponDesignation | undefined;
}

export interface CombatDataPropertiesData extends CombatDataSourceData {}

export interface CombatDataSource {
  type: "combat";
  system: CombatDataSourceData;
}

export interface CombatDataProperties {
  type: "combat";
  system: CombatDataPropertiesData;
}

export type RqgChatMessageDataSource = CombatDataSource;
export type RqgChatMessageDataProperties = CombatDataProperties;

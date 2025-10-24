import type { weaponDesignation } from "./combatChatMessage.defs";
import type { attackState } from "./combatChatMessage.defs";
import type { CombatManeuver, UsageType } from "@item-model/weaponData.ts";

// TODO: This is a temporary fix until the data model is fully implemented
export type AttackState = (typeof attackState)[number];
export type WeaponDesignation = (typeof weaponDesignation)[number];

export type ChatMessageTypes = "combat";

export interface CombatDataSourceData {
  attackState: AttackState;
  attackingTokenOrActorUuid: string;
  defendingTokenOrActorUuid: string | undefined;
  attackRoll: string;
  attackCombatManeuver: CombatManeuver;
  attackExtraDamage: string | undefined;
  attackDamageBonus: string | undefined;
  actorDamagedApplied: boolean;
  weaponDamageApplied: boolean;
  attackWeaponUuid: string | undefined;
  attackWeaponUsage: UsageType;
  defenceWeaponUsage: UsageType | undefined;
  outcomeDescription: string | undefined;
  defenceRoll: string | undefined;
  attackerFumbled: boolean;
  defenderFumbled: boolean;
  damageRoll: string | undefined;
  hitLocationRoll: string | undefined;
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
  data: CombatDataSourceData;
}

export interface CombatDataProperties {
  type: "combat";
  data: CombatDataPropertiesData;
}

export type RqgChatMessageDataSource = CombatDataSource;
export type RqgChatMessageDataProperties = CombatDataProperties;

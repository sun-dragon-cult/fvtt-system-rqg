export const ActorTypeEnum = {
  Character: "character",
} as const;
export type ActorTypeEnum = (typeof ActorTypeEnum)[keyof typeof ActorTypeEnum];

import type { RqgActor } from "@actors/rqgActor.ts";

/**
 * Derived attribute fields that `prepareDerivedData()` adds under `system.attributes`.
 * These are NOT part of the DataModel schema — they are computed at runtime.
 * We add them via intersection so that `CharacterActor` reflects the full runtime shape.
 */
interface DerivedAttributes {
  encumbrance: { max: number; travel: number; equipped: number };
  move: { value: number; equipped: number; travel: number };
  dexStrikeRank: number | null | undefined;
  sizStrikeRank: number | null | undefined;
  damageBonus: string;
  healingRate: number | undefined;
  spiritCombatDamage: string;
}

// Narrowed actor type for subtype "character"
export type CharacterActor = RqgActor & {
  system: Actor.SystemOfType<"character"> & { attributes: DerivedAttributes };
};

import Actor = foundry.documents.Actor;

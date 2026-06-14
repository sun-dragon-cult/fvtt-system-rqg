// Base actor types with literal string values for type extraction.
const ActorTypeBase = {
  Character: "character",
} as const;

export type ActorTypeEnum = (typeof ActorTypeBase)[keyof typeof ActorTypeBase];

// Cast literal actor subtype strings to Foundry's Actor.SubType for compatibility.
function asActorSubTypes<T extends Record<string, string>>(
  obj: T,
): { [K in keyof T]: Actor.SubType } {
  return obj as any;
}

export const ActorTypeEnum = asActorSubTypes(ActorTypeBase);

import type { RqgActor } from "@actors/rqg-actor.ts";
import type { SkillCategories } from "./skill-categories";

/**
 * Derived attribute fields that `prepareDerivedData()` adds under `system.attributes`.
 * These are NOT part of the DataModel schema — they are computed at runtime.
 * We add them via intersection so that `CharacterActor` reflects the full runtime shape.
 */
interface ItemDependentDerivedAttributes {
  encumbrance: { max: number; travel: number; equipped: number };
  move: { value: number; equipped: number; travel: number };
}

interface CharacteristicDerivedAttributes {
  dexStrikeRank: number | null | undefined;
  sizStrikeRank: number | null | undefined;
  damageBonus: string;
  healingRate: number | undefined;
  spiritCombatDamage: string;
}

type DerivedAttributes = ItemDependentDerivedAttributes & CharacteristicDerivedAttributes;

// Narrowed actor type for subtype "character".
export type CharacterActor = RqgActor & {
  system: Actor.SystemOfType<"character"> & {
    attributes: DerivedAttributes;
    baseSkillCategoryModifiers: SkillCategories;
    effect: {
      magicPoints: { max: number };
      hitPoints: { max: number };
      skillCategoryModifiers: SkillCategories;
    };
  };
};

import Actor = foundry.documents.Actor;

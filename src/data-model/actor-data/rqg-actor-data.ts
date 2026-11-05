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

// Narrowed actor type for subtype "character".
export type CharacterActor = RqgActor & {
  system: Actor.SystemOfType<"character">;
};

import Actor = foundry.documents.Actor;

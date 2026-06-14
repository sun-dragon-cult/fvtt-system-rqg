import type { StatusEffectsById } from "./token-status-effects";
import { getTokenFromActor } from "./util";

export function getConfigStatusEffects(): StatusEffectsById {
  return CONFIG.statusEffects as unknown as StatusEffectsById;
}

export function setConfigStatusEffects(effects: StatusEffectsById): void {
  // TEMP(v14-types): Remove once fvtt-types models CONFIG.statusEffects as an object map in v14.
  // @ts-expect-error fvtt-types currently declares CONFIG.statusEffects as CONFIG.StatusEffect[].
  CONFIG.statusEffects = effects;
}

type SpeakerOptionsCompat = {
  scene?: ChatMessage.GetSpeakerOptions["scene"];
  actor?: ChatMessage.GetSpeakerOptions["actor"] | Actor | null;
  token?: ChatMessage.GetSpeakerOptions["token"] | TokenDocument | null;
  alias?: string | null;
};

/**
 * TEMP(v14-types): Bridge stricter speaker option typing until fvtt-types nullability aligns with runtime.
 */
export function getSpeakerCompat(options: SpeakerOptionsCompat = {}): ChatMessage.SpeakerData {
  const speakerOptions = { ...options };

  // Prefer the actor's currently controlled token when token is omitted.
  if (speakerOptions.token === undefined && speakerOptions.actor instanceof Actor) {
    speakerOptions.token = getTokenFromActor(speakerOptions.actor as any) ?? undefined;
  }

  return ChatMessage.getSpeaker(speakerOptions as ChatMessage.GetSpeakerOptions);
}

import Actor = foundry.documents.Actor;

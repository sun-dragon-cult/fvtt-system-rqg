import type { StatusEffectsById } from "./token-status-effects";

export function getConfigStatusEffects(): StatusEffectsById {
  return CONFIG.statusEffects as unknown as StatusEffectsById;
}

export function setConfigStatusEffects(effects: StatusEffectsById): void {
  // TEMP(v14-types): Remove once fvtt-types models CONFIG.statusEffects as an object map in v14.
  // @ts-expect-error fvtt-types currently declares CONFIG.statusEffects as CONFIG.StatusEffect[].
  CONFIG.statusEffects = effects;
}

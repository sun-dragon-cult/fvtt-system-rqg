type TokenStatusEffectSeed = Omit<CONFIG.StatusEffect, "id" | "changes">;

export type StatusEffectsById = Record<string, CONFIG.StatusEffect>;

export function getTokenStatusEffects(): StatusEffectsById {
  const effects = {
    dead: {
      name: "EFFECT.StatusDead",
      img: "systems/rqg/assets/images/token-effects/dead.svg",
      tint: "#901010",
    },
    unconscious: {
      name: "EFFECT.StatusUnconscious",
      img: "systems/rqg/assets/images/token-effects/unconscious.svg",
      tint: "#f3a71e",
    },
    shock: {
      name: "EFFECT.StatusShocked",
      img: "systems/rqg/assets/images/token-effects/shock.svg",
      tint: "#f3a71e",
    },
    bleeding: {
      name: "EFFECT.StatusBleeding",
      img: "systems/rqg/assets/images/token-effects/bleeding.svg",
    },
    sleep: {
      name: "EFFECT.StatusAsleep",
      img: "systems/rqg/assets/images/token-effects/asleep.svg",
    },
    prone: {
      name: "EFFECT.StatusProne",
      img: "systems/rqg/assets/images/token-effects/prone.svg",
    },
    restrain: {
      name: "RQG.TokenEffects.StatusImmobilized",
      img: "icons/svg/net.svg",
    },
    helpless: {
      name: "RQG.TokenEffects.StatusHelpless",
      img: "icons/svg/paralysis.svg",
    },
    blind: {
      name: "EFFECT.StatusBlind",
      img: "icons/svg/blind.svg",
    },
    deaf: {
      name: "EFFECT.StatusDeaf",
      img: "icons/svg/deaf.svg",
    },
    silence: {
      name: "EFFECT.StatusSilenced",
      img: "icons/svg/silenced.svg",
    },
    concentrating: {
      name: "RQG.TokenEffects.StatusConcentrating",
      img: "icons/svg/eye.svg",
    },
    spiritCombat: {
      name: "RQG.TokenEffects.StatusSpiritCombat",
      img: "icons/svg/aura.svg",
    },
    discorporate: {
      name: "RQG.TokenEffects.StatusDiscorporate",
      img: "icons/svg/portal.svg",
    },
    possessed: {
      name: "RQG.TokenEffects.StatusPossessed",
      img: "icons/svg/cowled.svg",
    },
    invisible: {
      name: "EFFECT.StatusInvisible",
      img: "icons/svg/invisible.svg",
    },
    fly: {
      name: "EFFECT.StatusFlying",
      img: "icons/svg/wing.svg",
    },
    burning: {
      name: "EFFECT.StatusBurning",
      img: "icons/svg/fire.svg",
    },
    fear: {
      name: "EFFECT.StatusFear",
      img: "icons/svg/terror.svg",
    },
    disease: {
      name: "EFFECT.StatusDisease",
      img: "icons/svg/biohazard.svg",
    },
    poison: {
      name: "EFFECT.StatusPoison",
      img: "icons/svg/poison.svg",
    },
    curse: {
      name: "EFFECT.StatusCursed",
      img: "icons/svg/sun.svg",
    },
  } satisfies Record<string, TokenStatusEffectSeed>;

  const effectsWithId = Object.fromEntries(
    Object.entries(effects).map(([id, effect], index) => [id, { id, order: index, ...effect }]),
  );

  return effectsWithId as StatusEffectsById;
}

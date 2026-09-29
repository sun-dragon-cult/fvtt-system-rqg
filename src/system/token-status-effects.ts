type TokenStatusEffectSeed = Omit<CONFIG.StatusEffect, "id" | "changes">;

export type StatusEffectsById = Record<string, CONFIG.StatusEffect>;

function twoMinutesDuration(): CONFIG.StatusEffect["duration"] {
  // TEMP(v14-types): fvtt-types still models legacy duration fields, but Foundry v14 runtime
  // accepts unit-based duration data.
  return { value: 2, units: "minutes", expiry: null } as unknown as CONFIG.StatusEffect["duration"];
}

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
    ironhand: {
      name: "RQG.TokenEffects.StatusIronhand",
      img: "systems/rqg/assets/images/token-effects/ironhand.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    parry: {
      name: "RQG.TokenEffects.StatusParry",
      img: "systems/rqg/assets/images/token-effects/parry.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    sleep: {
      name: "EFFECT.StatusAsleep",
      img: "systems/rqg/assets/images/token-effects/asleep.svg",
    },
    prone: {
      name: "EFFECT.StatusProne",
      img: "systems/rqg/assets/images/token-effects/prone.svg",
    },
    deaf: {
      name: "EFFECT.StatusDeaf",
      img: "icons/svg/deaf.svg",
    },
    blind: {
      name: "EFFECT.StatusBlind",
      img: "icons/svg/blind.svg",
    },
    silence: {
      name: "EFFECT.StatusSilenced",
      img: "icons/svg/silenced.svg",
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
    restrain: {
      name: "EFFECT.StatusRestrained",
      img: "icons/svg/net.svg",
    },
    number1: {
      name: "1",
      img: "systems/rqg/assets/images/token-effects/one.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    number2: {
      name: "2",
      img: "systems/rqg/assets/images/token-effects/two.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    number3: {
      name: "3",
      img: "systems/rqg/assets/images/token-effects/three.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    number4: {
      name: "4",
      img: "systems/rqg/assets/images/token-effects/four.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    number5: {
      name: "5",
      img: "systems/rqg/assets/images/token-effects/five.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    number6: {
      name: "6",
      img: "systems/rqg/assets/images/token-effects/six.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
  } satisfies Record<string, TokenStatusEffectSeed>;

  const effectsWithId = Object.fromEntries(
    Object.entries(effects).map(([id, effect], index) => [id, { id, order: index, ...effect }]),
  );

  return effectsWithId as StatusEffectsById;
}

type TokenStatusEffectSeed = Omit<CONFIG.StatusEffect, "id" | "changes"> & {
  changes?: Array<{
    key: string;
    value: string;
    type?: string;
    mode?: number;
    priority?: number;
  }>;
};

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
    protection1: {
      name: "RQG.TokenEffects.StatusProtection1",
      img: "systems/rqg/assets/images/token-effects/protection1.svg",
      duration: twoMinutesDuration(),
      changes: [
        {
          key: "~^i\\.hit-location\\.:system.naturalAp",
          type: "custom",
          value: "1",
        },
      ],
    },
    protection2: {
      name: "RQG.TokenEffects.StatusProtection2",
      img: "systems/rqg/assets/images/token-effects/protection2.svg",
      duration: twoMinutesDuration(),
      changes: [
        {
          key: "~^i\\.hit-location\\.:system.naturalAp",
          type: "custom",
          value: "2",
        },
      ],
    },
    protection3: {
      name: "RQG.TokenEffects.StatusProtection3",
      img: "systems/rqg/assets/images/token-effects/protection3.svg",
      duration: twoMinutesDuration(),
      changes: [
        {
          key: "~^i\\.hit-location\\.:system.naturalAp",
          type: "custom",
          value: "3",
        },
      ],
    },
    protection4: {
      name: "RQG.TokenEffects.StatusProtection4",
      img: "systems/rqg/assets/images/token-effects/protection4.svg",
      duration: twoMinutesDuration(),
      changes: [
        {
          key: "~^i\\.hit-location\\.:system.naturalAp",
          type: "custom",
          value: "4",
        },
      ],
    },
    strength: {
      name: "RQG.TokenEffects.StatusStrength",
      img: "systems/rqg/assets/images/token-effects/strength.svg",
      disabled: false,
      duration: twoMinutesDuration(),
      changes: [
        {
          key: "system.characteristics.strength.value",
          type: "add",
          value: "8",
        },
      ],
    },
    befuddled: {
      name: "RQG.TokenEffects.StatusBefuddled",
      img: "systems/rqg/assets/images/token-effects/befuddled.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    bladesharp: {
      name: "RQG.TokenEffects.StatusBladesharp",
      img: "systems/rqg/assets/images/token-effects/bladesharp.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    bludgeon: {
      name: "RQG.TokenEffects.StatusBludgeon",
      img: "systems/rqg/assets/images/token-effects/bludgeon.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    coordination: {
      name: "RQG.TokenEffects.StatusCoordination",
      img: "systems/rqg/assets/images/token-effects/coordination.svg",
      disabled: false,
      duration: twoMinutesDuration(),
      changes: [
        {
          key: "system.characteristics.dexterity.value",
          type: "add",
          value: "3",
        },
      ],
    },
    countermagic: {
      name: "RQG.TokenEffects.StatusCountermagic",
      img: "systems/rqg/assets/images/token-effects/countermagic.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    demoralize: {
      name: "RQG.TokenEffects.StatusDemoralize",
      img: "systems/rqg/assets/images/token-effects/demoralize.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    dullblade: {
      name: "RQG.TokenEffects.StatusDullblade",
      img: "systems/rqg/assets/images/token-effects/dullblade.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    fanaticism: {
      name: "RQG.TokenEffects.StatusFanaticism",
      img: "systems/rqg/assets/images/token-effects/fanaticism.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    fireblade: {
      name: "RQG.TokenEffects.StatusFireblade",
      img: "systems/rqg/assets/images/token-effects/fireblade.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    glamour: {
      name: "RQG.TokenEffects.StatusGlamour",
      img: "systems/rqg/assets/images/token-effects/glamour.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    glue: {
      name: "RQG.TokenEffects.StatusGlue",
      img: "systems/rqg/assets/images/token-effects/glue.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    ironhand: {
      name: "RQG.TokenEffects.StatusIronhand",
      img: "systems/rqg/assets/images/token-effects/ironhand.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    lantern: {
      name: "RQG.TokenEffects.StatusLantern",
      img: "systems/rqg/assets/images/token-effects/lantern.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    light: {
      name: "RQG.TokenEffects.StatusLight",
      img: "systems/rqg/assets/images/token-effects/light.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    mobility: {
      name: "RQG.TokenEffects.StatusMobility",
      img: "systems/rqg/assets/images/token-effects/mobility.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    parry: {
      name: "RQG.TokenEffects.StatusParry",
      img: "systems/rqg/assets/images/token-effects/parry.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    shimmer: {
      name: "RQG.TokenEffects.StatusShimmer",
      img: "systems/rqg/assets/images/token-effects/shimmer.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    slow: {
      name: "RQG.TokenEffects.StatusSlow",
      img: "systems/rqg/assets/images/token-effects/slow.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    spiritscreen: {
      name: "RQG.TokenEffects.StatusSpiritScreen",
      img: "systems/rqg/assets/images/token-effects/spirit-screen.svg",
      disabled: false,
      duration: twoMinutesDuration(),
    },
    vigor: {
      name: "RQG.TokenEffects.StatusVigor",
      img: "systems/rqg/assets/images/token-effects/vigor.svg",
      disabled: false,
      duration: twoMinutesDuration(),
      changes: [
        {
          key: "system.characteristics.constitution.value",
          type: "add",
          value: "3",
        },
      ],
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

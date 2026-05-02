export function getTokenStatusEffects(): any[] {
  return [
    {
      id: "dead",
      name: "EFFECT.StatusDead",
      img: "systems/rqg/assets/images/token-effects/dead.svg",
      tint: "#901010",
    },
    {
      id: "unconscious",
      name: "EFFECT.StatusUnconscious",
      img: "systems/rqg/assets/images/token-effects/unconscious.svg",
      tint: "#f3a71e",
    },
    {
      id: "shock",
      name: "EFFECT.StatusShocked",
      img: "systems/rqg/assets/images/token-effects/shock.svg",
      tint: "#f3a71e",
    },
    {
      id: "bleeding",
      name: "EFFECT.StatusBleeding",
      img: "systems/rqg/assets/images/token-effects/bleeding.svg",
    },
    {
      id: "protection1",
      name: "RQG.TokenEffects.StatusProtection1",
      img: "systems/rqg/assets/images/token-effects/protection1.svg",
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
      changes: [
        {
          key: "~^i\\.hit-location\\.:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_CHANGE_TYPES.custom,
          value: "1",
        },
      ],
    },
    {
      id: "protection2",
      name: "RQG.TokenEffects.StatusProtection2",
      img: "systems/rqg/assets/images/token-effects/protection2.svg",
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
      changes: [
        {
          key: "~^i\\.hit-location\\.:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_CHANGE_TYPES.custom,
          value: "2",
        },
      ],
    },
    {
      id: "protection3",
      name: "RQG.TokenEffects.StatusProtection3",
      img: "systems/rqg/assets/images/token-effects/protection3.svg",
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
      changes: [
        {
          key: "~^i\\.hit-location\\.:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_CHANGE_TYPES.custom,
          value: "3",
        },
      ],
    },
    {
      id: "protection4",
      name: "RQG.TokenEffects.StatusProtection4",
      img: "systems/rqg/assets/images/token-effects/protection4.svg",
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
      changes: [
        {
          key: "~^i\\.hit-location\\.:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_CHANGE_TYPES.custom,
          value: "4",
        },
      ],
    },
    {
      id: "strength",
      name: "RQG.TokenEffects.StatusStrength",
      img: "systems/rqg/assets/images/token-effects/strength.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
      changes: [
        {
          key: "system.characteristics.strength.value",
          mode: CONST.ACTIVE_EFFECT_CHANGE_TYPES.add,
          value: "8",
        },
      ],
    },
    {
      id: "befuddled",
      name: "RQG.TokenEffects.StatusBefuddled",
      img: "systems/rqg/assets/images/token-effects/befuddled.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },

    {
      id: "bladesharp",
      name: "RQG.TokenEffects.StatusBladesharp",
      img: "systems/rqg/assets/images/token-effects/bladesharp.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "bludgeon",
      name: "RQG.TokenEffects.StatusBludgeon",
      img: "systems/rqg/assets/images/token-effects/bludgeon.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "coordination",
      name: "RQG.TokenEffects.StatusCoordination",
      img: "systems/rqg/assets/images/token-effects/coordination.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
      changes: [
        {
          key: "system.characteristics.dexterity.value",
          mode: CONST.ACTIVE_EFFECT_CHANGE_TYPES.add,
          value: "3",
        },
      ],
    },
    {
      id: "countermagic",
      name: "RQG.TokenEffects.StatusCountermagic",
      img: "systems/rqg/assets/images/token-effects/countermagic.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "demoralize",
      name: "RQG.TokenEffects.StatusDemoralize",
      img: "systems/rqg/assets/images/token-effects/demoralize.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "dullblade",
      name: "RQG.TokenEffects.StatusDullblade",
      img: "systems/rqg/assets/images/token-effects/dullblade.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "fanaticism",
      name: "RQG.TokenEffects.StatusFanaticism",
      img: "systems/rqg/assets/images/token-effects/fanaticism.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "fireblade",
      name: "RQG.TokenEffects.StatusFireblade",
      img: "systems/rqg/assets/images/token-effects/fireblade.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "glamour",
      name: "RQG.TokenEffects.StatusGlamour",
      img: "systems/rqg/assets/images/token-effects/glamour.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "glue",
      name: "RQG.TokenEffects.StatusGlue",
      img: "systems/rqg/assets/images/token-effects/glue.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "ironhand",
      name: "RQG.TokenEffects.StatusIronhand",
      img: "systems/rqg/assets/images/token-effects/ironhand.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "lantern",
      name: "RQG.TokenEffects.StatusLantern",
      img: "systems/rqg/assets/images/token-effects/lantern.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "light",
      name: "RQG.TokenEffects.StatusLight",
      img: "systems/rqg/assets/images/token-effects/light.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "mobility",
      name: "RQG.TokenEffects.StatusMobility",
      img: "systems/rqg/assets/images/token-effects/mobility.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "parry",
      name: "RQG.TokenEffects.StatusParry",
      img: "systems/rqg/assets/images/token-effects/parry.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "shimmer",
      name: "RQG.TokenEffects.StatusShimmer",
      img: "systems/rqg/assets/images/token-effects/shimmer.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "slow",
      name: "RQG.TokenEffects.StatusSlow",
      img: "systems/rqg/assets/images/token-effects/slow.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "spiritscreen",
      name: "RQG.TokenEffects.StatusSpiritScreen",
      img: "systems/rqg/assets/images/token-effects/spirit-screen.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "vigor",
      name: "RQG.TokenEffects.StatusVigor",
      img: "systems/rqg/assets/images/token-effects/vigor.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
      changes: [
        {
          key: "system.characteristics.constitution.value",
          mode: CONST.ACTIVE_EFFECT_CHANGE_TYPES.add,
          value: "3",
        },
      ],
    },
    {
      id: "sleep",
      name: "EFFECT.StatusAsleep",
      img: "systems/rqg/assets/images/token-effects/asleep.svg",
    },
    {
      id: "prone",
      name: "EFFECT.StatusProne",
      img: "systems/rqg/assets/images/token-effects/prone.svg",
    },
    {
      id: "deaf",
      name: "EFFECT.StatusDeaf",
      img: "icons/svg/deaf.svg",
    },
    {
      id: "blind",
      name: "EFFECT.StatusBlind",
      img: "icons/svg/blind.svg",
    },
    {
      id: "silence",
      name: "EFFECT.StatusSilenced",
      img: "icons/svg/silenced.svg",
    },
    {
      id: "fear",
      name: "EFFECT.StatusFear",
      img: "icons/svg/terror.svg",
    },

    {
      id: "disease",
      name: "EFFECT.StatusDisease",
      img: "icons/svg/biohazard.svg",
    },
    {
      id: "poison",
      name: "EFFECT.StatusPoison",
      img: "icons/svg/poison.svg",
    },
    {
      id: "curse",
      name: "EFFECT.StatusCursed",
      img: "icons/svg/sun.svg",
    },
    {
      id: "restrain",
      name: "EFFECT.StatusRestrained",
      img: "icons/svg/net.svg",
    },
    {
      id: "number1",
      name: "1",
      img: "systems/rqg/assets/images/token-effects/one.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "number2",
      name: "2",
      img: "systems/rqg/assets/images/token-effects/two.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "number3",
      name: "3",
      img: "systems/rqg/assets/images/token-effects/three.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "number4",
      name: "4",
      img: "systems/rqg/assets/images/token-effects/four.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "number5",
      name: "5",
      img: "systems/rqg/assets/images/token-effects/five.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "number6",
      name: "6",
      img: "systems/rqg/assets/images/token-effects/six.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
  ];
}

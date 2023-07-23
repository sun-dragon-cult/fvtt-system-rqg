export function getTokenStatusEffects(): any[] {
  return [
    {
      id: "dead",
      name: "EFFECT.StatusDead",
      icon: "systems/rqg/assets/images/token-effects/dead.svg",
      tint: "#901010",
    },
    {
      id: "unconscious",
      name: "EFFECT.StatusUnconscious",
      icon: "systems/rqg/assets/images/token-effects/unconscious.svg",
      tint: "#f3a71e",
    },
    {
      id: "shock",
      name: "EFFECT.StatusShocked",
      icon: "systems/rqg/assets/images/token-effects/shock.svg",
      tint: "#f3a71e",
    },
    {
      id: "bleeding",
      name: "EFFECT.StatusBleeding",
      icon: "systems/rqg/assets/images/token-effects/bleeding.svg",
    },
    {
      id: "protection1",
      name: "RQG.TokenEffects.StatusProtection1",
      icon: "systems/rqg/assets/images/token-effects/protection1.svg",
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
      changes: [
        {
          key: "i.hit-location.head:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "i.hit-location.left-arm:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "i.hit-location.right-arm:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "i.hit-location.chest:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "i.hit-location.abdomen:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "i.hit-location.left-leg:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "i.hit-location.right-leg:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
      ],
    },
    {
      id: "protection2",
      name: "RQG.TokenEffects.StatusProtection2",
      icon: "systems/rqg/assets/images/token-effects/protection2.svg",
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
      changes: [
        {
          key: "i.hit-location.head:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "2",
        },
        {
          key: "i.hit-location.left-arm:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "2",
        },
        {
          key: "i.hit-location.right-arm:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "2",
        },
        {
          key: "i.hit-location.chest:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "2",
        },
        {
          key: "i.hit-location.abdomen:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "2",
        },
        {
          key: "i.hit-location.left-leg:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "2",
        },
        {
          key: "i.hit-location.right-leg:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "2",
        },
      ],
    },
    {
      id: "protection3",
      name: "RQG.TokenEffects.StatusProtection3",
      icon: "systems/rqg/assets/images/token-effects/protection3.svg",
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
      changes: [
        {
          key: "i.hit-location.head:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "3",
        },
        {
          key: "i.hit-location.left-arm:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "3",
        },
        {
          key: "i.hit-location.right-arm:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "3",
        },
        {
          key: "i.hit-location.chest:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "3",
        },
        {
          key: "i.hit-location.abdomen:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "3",
        },
        {
          key: "i.hit-location.left-leg:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "3",
        },
        {
          key: "i.hit-location.right-leg:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "3",
        },
      ],
    },
    {
      id: "protection4",
      name: "RQG.TokenEffects.StatusProtection4",
      icon: "systems/rqg/assets/images/token-effects/protection4.svg",
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
      changes: [
        {
          key: "i.hit-location.head:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "4",
        },
        {
          key: "i.hit-location.left-arm:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "4",
        },
        {
          key: "i.hit-location.right-arm:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "4",
        },
        {
          key: "i.hit-location.chest:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "4",
        },
        {
          key: "i.hit-location.abdomen:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "4",
        },
        {
          key: "i.hit-location.left-leg:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "4",
        },
        {
          key: "i.hit-location.right-leg:system.naturalAp",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "4",
        },
      ],
    },
    {
      id: "strength",
      name: "RQG.TokenEffects.StatusStrength",
      icon: "systems/rqg/assets/images/token-effects/strength.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
      changes: [
        {
          key: "system.characteristics.strength.value",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "8",
        },
      ],
    },
    {
      id: "befuddled",
      name: "RQG.TokenEffects.StatusBefuddled",
      icon: "systems/rqg/assets/images/token-effects/befuddled.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },

    {
      id: "bladesharp",
      name: "RQG.TokenEffects.StatusBladesharp",
      icon: "systems/rqg/assets/images/token-effects/bladesharp.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "bludgeon",
      name: "RQG.TokenEffects.StatusBludgeon",
      icon: "systems/rqg/assets/images/token-effects/bludgeon.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "coordination",
      name: "RQG.TokenEffects.StatusCoordination",
      icon: "systems/rqg/assets/images/token-effects/coordination.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
      changes: [
        {
          key: "system.characteristics.dexterity.value",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "3",
        },
      ],
    },
    {
      id: "countermagic",
      name: "RQG.TokenEffects.StatusCountermagic",
      icon: "systems/rqg/assets/images/token-effects/countermagic.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "demoralize",
      name: "Demoralize",
      icon: "systems/rqg/assets/images/token-effects/demoralize.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "dullblade",
      name: "RQG.TokenEffects.StatusDullblade",
      icon: "systems/rqg/assets/images/token-effects/dullblade.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "fanaticism",
      name: "RQG.TokenEffects.StatusFanaticism",
      icon: "systems/rqg/assets/images/token-effects/fanaticism.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "fireblade",
      name: "RQG.TokenEffects.StatusFireblade",
      icon: "systems/rqg/assets/images/token-effects/fireblade.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "glamour",
      name: "RQG.TokenEffects.StatusGlamour",
      icon: "systems/rqg/assets/images/token-effects/glamour.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "glue",
      name: "RQG.TokenEffects.StatusGlue",
      icon: "systems/rqg/assets/images/token-effects/glue.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "ironhand",
      name: "RQG.TokenEffects.StatusIronhand",
      icon: "systems/rqg/assets/images/token-effects/ironhand.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "lantern",
      name: "RQG.TokenEffects.StatusLantern",
      icon: "systems/rqg/assets/images/token-effects/lantern.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "light",
      name: "RQG.TokenEffects.StatusLight",
      icon: "systems/rqg/assets/images/token-effects/light.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "mobility",
      name: "RQG.TokenEffects.StatusMobility",
      icon: "systems/rqg/assets/images/token-effects/mobility.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "parry",
      name: "RQG.TokenEffects.StatusParry",
      icon: "systems/rqg/assets/images/token-effects/parry.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "shimmer",
      name: "RQG.TokenEffects.StatusShimmer",
      icon: "systems/rqg/assets/images/token-effects/shimmer.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "slow",
      name: "RQG.TokenEffects.StatusSlow",
      icon: "systems/rqg/assets/images/token-effects/slow.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "spiritscreen",
      name: "RQG.TokenEffects.StatusSpiritScreen",
      icon: "systems/rqg/assets/images/token-effects/spirit-screen.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "vigor",
      name: "RQG.TokenEffects.StatusVigor",
      icon: "systems/rqg/assets/images/token-effects/vigor.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
      changes: [
        {
          key: "system.characteristics.constitution.value",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "3",
        },
      ],
    },
    {
      id: "sleep",
      name: "EFFECT.StatusAsleep",
      icon: "systems/rqg/assets/images/token-effects/asleep.svg",
    },
    {
      id: "prone",
      name: "EFFECT.StatusProne",
      icon: "systems/rqg/assets/images/token-effects/prone.svg",
    },
    {
      id: "deaf",
      name: "EFFECT.StatusDeaf",
      icon: "icons/svg/deaf.svg",
    },
    {
      id: "blind",
      name: "EFFECT.StatusBlind",
      icon: "icons/svg/blind.svg",
    },
    {
      id: "silence",
      name: "EFFECT.StatusSilenced",
      icon: "icons/svg/silenced.svg",
    },
    {
      id: "fear",
      name: "EFFECT.StatusFear",
      icon: "icons/svg/terror.svg",
    },

    {
      id: "disease",
      name: "EFFECT.StatusDisease",
      icon: "icons/svg/biohazard.svg",
    },
    {
      id: "poison",
      name: "EFFECT.StatusPoison",
      icon: "icons/svg/poison.svg",
    },
    {
      id: "curse",
      name: "EFFECT.StatusCursed",
      icon: "icons/svg/sun.svg",
    },
    {
      id: "restrain",
      name: "EFFECT.StatusRestrained",
      icon: "icons/svg/net.svg",
    },
    {
      id: "number1",
      name: "1",
      icon: "systems/rqg/assets/images/token-effects/one.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "number2",
      name: "2",
      icon: "systems/rqg/assets/images/token-effects/two.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "number3",
      name: "3",
      icon: "systems/rqg/assets/images/token-effects/three.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "number4",
      name: "4",
      icon: "systems/rqg/assets/images/token-effects/four.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "number5",
      name: "5",
      icon: "systems/rqg/assets/images/token-effects/five.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
    {
      id: "number6",
      name: "6",
      icon: "systems/rqg/assets/images/token-effects/six.svg",
      disabled: false,
      duration: {
        seconds: CONFIG.time.roundTime * 10,
      },
    },
  ];
}

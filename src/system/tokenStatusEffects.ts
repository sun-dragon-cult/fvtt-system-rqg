export function getTokenStatusEffects(): any[] {
  return [
    {
      id: "dead",
      label: "EFFECT.StatusDead",
      icon: "systems/rqg/assets/images/token-effects/dead.svg",
      tint: "#901010",
    },
    {
      id: "unconscious",
      label: "EFFECT.StatusUnconscious",
      icon: "systems/rqg/assets/images/token-effects/unconscious.svg",
      tint: "#f3a71e",
    },
    {
      id: "shock",
      label: "EFFECT.StatusShocked",
      icon: "systems/rqg/assets/images/token-effects/shock.svg",
      tint: "#f3a71e",
    },
    {
      id: "bleeding",
      label: "EFFECT.StatusBleeding",
      icon: "systems/rqg/assets/images/token-effects/bleeding.svg",
    },
    {
      id: "protection1",
      label: "RQG.TokenEffects.StatusProtection1",
      icon: "systems/rqg/assets/images/token-effects/protection1.svg",
      duration: {
        rounds: 10,
      },
      changes: [
        {
          key: "i.hit-location.humanoids-head:system.naturalAp",
          mode: 0, // custom
          value: "1",
        },
        {
          key: "i.hit-location.humanoids-left-arm:system.naturalAp",
          mode: 0, // custom
          value: "1",
        },
        {
          key: "i.hit-location.humanoids-right-arm:system.naturalAp",
          mode: 0, // custom
          value: "1",
        },
        {
          key: "i.hit-location.humanoids-chest:system.naturalAp",
          mode: 0, // custom
          value: "1",
        },
        {
          key: "i.hit-location.humanoids-abdomen:system.naturalAp",
          mode: 0, // custom
          value: "1",
        },
        {
          key: "i.hit-location.humanoids-left-leg:system.naturalAp",
          mode: 0, // custom
          value: "1",
        },
        {
          key: "i.hit-location.humanoids-right-leg:system.naturalAp",
          mode: 0, // custom
          value: "1",
        },
      ],
    },
    {
      id: "protection2",
      label: "RQG.TokenEffects.StatusProtection2",
      icon: "systems/rqg/assets/images/token-effects/protection2.svg",
      duration: {
        rounds: 10,
      },
      changes: [
        {
          key: "i.hit-location.humanoids-head:system.naturalAp",
          mode: 0, // custom
          value: "2",
        },
        {
          key: "i.hit-location.humanoids-left-arm:system.naturalAp",
          mode: 0, // custom
          value: "2",
        },
        {
          key: "i.hit-location.humanoids-right-arm:system.naturalAp",
          mode: 0, // custom
          value: "2",
        },
        {
          key: "i.hit-location.humanoids-chest:system.naturalAp",
          mode: 0, // custom
          value: "2",
        },
        {
          key: "i.hit-location.humanoids-abdomen:system.naturalAp",
          mode: 0, // custom
          value: "2",
        },
        {
          key: "i.hit-location.humanoids-left-leg:system.naturalAp",
          mode: 0, // custom
          value: "2",
        },
        {
          key: "i.hit-location.humanoids-right-leg:system.naturalAp",
          mode: 0, // custom
          value: "2",
        },
      ],
    },
    {
      id: "protection3",
      label: "RQG.TokenEffects.StatusProtection3",
      icon: "systems/rqg/assets/images/token-effects/protection3.svg",
      duration: {
        rounds: 10,
      },
      changes: [
        {
          key: "i.hit-location.humanoids-head:system.naturalAp",
          mode: 0, // custom
          value: "3",
        },
        {
          key: "i.hit-location.humanoids-left-arm:system.naturalAp",
          mode: 0, // custom
          value: "3",
        },
        {
          key: "i.hit-location.humanoids-right-arm:system.naturalAp",
          mode: 0, // custom
          value: "3",
        },
        {
          key: "i.hit-location.humanoids-chest:system.naturalAp",
          mode: 0, // custom
          value: "3",
        },
        {
          key: "i.hit-location.humanoids-abdomen:system.naturalAp",
          mode: 0, // custom
          value: "3",
        },
        {
          key: "i.hit-location.humanoids-left-leg:system.naturalAp",
          mode: 0, // custom
          value: "3",
        },
        {
          key: "i.hit-location.humanoids-right-leg:system.naturalAp",
          mode: 0, // custom
          value: "3",
        },
      ],
    },
    {
      id: "protection4",
      label: "RQG.TokenEffects.StatusProtection4",
      icon: "systems/rqg/assets/images/token-effects/protection4.svg",
      duration: {
        rounds: 10,
      },
      changes: [
        {
          key: "i.hit-location.humanoids-head:system.naturalAp",
          mode: 0, // custom
          value: "4",
        },
        {
          key: "i.hit-location.humanoids-left-arm:system.naturalAp",
          mode: 0, // custom
          value: "4",
        },
        {
          key: "i.hit-location.humanoids-right-arm:system.naturalAp",
          mode: 0, // custom
          value: "4",
        },
        {
          key: "i.hit-location.humanoids-chest:system.naturalAp",
          mode: 0, // custom
          value: "4",
        },
        {
          key: "i.hit-location.humanoids-abdomen:system.naturalAp",
          mode: 0, // custom
          value: "4",
        },
        {
          key: "i.hit-location.humanoids-left-leg:system.naturalAp",
          mode: 0, // custom
          value: "4",
        },
        {
          key: "i.hit-location.humanoids-right-leg:system.naturalAp",
          mode: 0, // custom
          value: "4",
        },
      ],
    },
    {
      id: "strength",
      label: "RQG.TokenEffects.StatusStrength",
      icon: "systems/rqg/assets/images/token-effects/strength.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
      changes: [
        {
          key: "system.characteristics.strength.value",
          mode: 2, // ACTIVE_EFFECT_MODES.ADD,
          value: "8",
        },
      ],
    },
    {
      id: "befuddled",
      label: "RQG.TokenEffects.StatusBefuddled",
      icon: "systems/rqg/assets/images/token-effects/befuddled.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },

    {
      id: "bladesharp",
      label: "RQG.TokenEffects.StatusBladesharp",
      icon: "systems/rqg/assets/images/token-effects/bladesharp.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "bludgeon",
      label: "RQG.TokenEffects.StatusBludgeon",
      icon: "systems/rqg/assets/images/token-effects/bludgeon.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "coordination",
      label: "RQG.TokenEffects.StatusCoordination",
      icon: "systems/rqg/assets/images/token-effects/coordination.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
      changes: [
        {
          key: "system.characteristics.dexterity.value",
          mode: 2, // ACTIVE_EFFECT_MODES.ADD,
          value: "3",
        },
      ],
    },
    {
      id: "countermagic",
      label: "RQG.TokenEffects.StatusCountermagic",
      icon: "systems/rqg/assets/images/token-effects/countermagic.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "demoralize",
      label: "Demoralize",
      icon: "systems/rqg/assets/images/token-effects/demoralize.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "dullblade",
      label: "RQG.TokenEffects.StatusDullblade",
      icon: "systems/rqg/assets/images/token-effects/dullblade.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "fanaticism",
      label: "RQG.TokenEffects.StatusFanaticism",
      icon: "systems/rqg/assets/images/token-effects/fanaticism.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "fireblade",
      label: "RQG.TokenEffects.StatusFireblade",
      icon: "systems/rqg/assets/images/token-effects/fireblade.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "glamour",
      label: "RQG.TokenEffects.StatusGlamour",
      icon: "systems/rqg/assets/images/token-effects/glamour.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "glue",
      label: "RQG.TokenEffects.StatusGlue",
      icon: "systems/rqg/assets/images/token-effects/glue.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "ironhand",
      label: "RQG.TokenEffects.StatusIronhand",
      icon: "systems/rqg/assets/images/token-effects/ironhand.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "lantern",
      label: "RQG.TokenEffects.StatusLantern",
      icon: "systems/rqg/assets/images/token-effects/lantern.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "light",
      label: "RQG.TokenEffects.StatusLight",
      icon: "systems/rqg/assets/images/token-effects/light.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "mobility",
      label: "RQG.TokenEffects.StatusMobility",
      icon: "systems/rqg/assets/images/token-effects/mobility.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "parry",
      label: "RQG.TokenEffects.StatusParry",
      icon: "systems/rqg/assets/images/token-effects/parry.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "shimmer",
      label: "RQG.TokenEffects.StatusShimmer",
      icon: "systems/rqg/assets/images/token-effects/shimmer.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "slow",
      label: "RQG.TokenEffects.StatusSlow",
      icon: "systems/rqg/assets/images/token-effects/slow.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "spiritscreen",
      label: "RQG.TokenEffects.StatusSpiritScreen",
      icon: "systems/rqg/assets/images/token-effects/spirit-screen.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "vigor",
      label: "RQG.TokenEffects.StatusVigor",
      icon: "systems/rqg/assets/images/token-effects/vigor.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
      changes: [
        {
          key: "system.characteristics.constitution.value",
          mode: 2, // ACTIVE_EFFECT_MODES.ADD,
          value: "3",
        },
      ],
    },
    {
      id: "sleep",
      label: "EFFECT.StatusAsleep",
      icon: "systems/rqg/assets/images/token-effects/asleep.svg",
    },
    {
      id: "prone",
      label: "EFFECT.StatusProne",
      icon: "systems/rqg/assets/images/token-effects/prone.svg",
    },
    {
      id: "deaf",
      label: "EFFECT.StatusDeaf",
      icon: "icons/svg/deaf.svg",
    },
    {
      id: "blind",
      label: "EFFECT.StatusBlind",
      icon: "icons/svg/blind.svg",
    },
    {
      id: "silence",
      label: "EFFECT.StatusSilenced",
      icon: "icons/svg/silenced.svg",
    },
    {
      id: "fear",
      label: "EFFECT.StatusFear",
      icon: "icons/svg/terror.svg",
    },

    {
      id: "disease",
      label: "EFFECT.StatusDisease",
      icon: "icons/svg/biohazard.svg",
    },
    {
      id: "poison",
      label: "EFFECT.StatusPoison",
      icon: "icons/svg/poison.svg",
    },
    {
      id: "curse",
      label: "EFFECT.StatusCursed",
      icon: "icons/svg/sun.svg",
    },
    {
      id: "restrain",
      label: "EFFECT.StatusRestrained",
      icon: "icons/svg/net.svg",
    },
    {
      id: "number1",
      label: "1",
      icon: "systems/rqg/assets/images/token-effects/one.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "number2",
      label: "2",
      icon: "systems/rqg/assets/images/token-effects/two.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "number3",
      label: "3",
      icon: "systems/rqg/assets/images/token-effects/three.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "number4",
      label: "4",
      icon: "systems/rqg/assets/images/token-effects/four.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "number5",
      label: "5",
      icon: "systems/rqg/assets/images/token-effects/five.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
    {
      id: "number6",
      label: "6",
      icon: "systems/rqg/assets/images/token-effects/six.svg",
      disabled: false,
      duration: {
        rounds: 10,
      },
    },
  ];
}

export const RQG_CONFIG = {
  debug: {
    showActorActiveEffectsTab: false,
    showAllUiSections: false,
  },

  // Skill items that need special handling
  skillRqid: {
    dodge: "i.skill.dodge",
    jump: "i.skill.jump",
    moveQuietly: "i.skill.move-quietly",
    spiritCombat: "i.skill.spirit-combat",
  },

  // Default Combat Maneuvers for weapon items
  combatManeuvers: new Map([
    [
      "Throw",
      {
        defaultDamageType: "impale",
      },
    ],
    [
      "Shoot",
      {
        defaultDamageType: "impale",
      },
    ],
    [
      "Thrust",
      {
        defaultDamageType: "impale",
      },
    ],
    [
      "Cut",
      {
        defaultDamageType: "slash",
      },
    ],
    [
      "Bash",
      {
        defaultDamageType: "crush",
      },
    ],
    [
      "Parry",
      {
        defaultDamageType: "parry",
      },
    ],
    [
      "Grapple",
      {
        defaultDamageType: "special",
        specialDescriptionHtml: `<details>
        <summary>Grapple rules</summary>
        <p>.....</p>

        </details>`,
      },
    ],
    [
      "Knockback",
      {
        defaultDamageType: "special",
        specialDescriptionHtml: `<details>
          <summary>Attacker STR+SIZ vs Defender SIZ+DEX</summary>
          <p>The average of
          the attacker’s STR+SIZ is compared with the average of the
          defender’s SIZ+DEX as a resistance roll (see page 10). For the resistance roll:</p>
          <ul>
            <li>A success knocks the target back 1D3 meters.</li>
            <li>A special success knocks the target down (see Fighting While Prone, page 57).</li>
            <li>A critical success knocks them down and disarms them.</li>
          </ul>
          <p>The target does not take any damage from the knockback
          itself. If the knockback is not successful, the attacker must roll DEX×5 or fall. If unsuccessful, the attacker is knocked back [1D3] meters instead, or misses completely and rushes by the intended target.</p>
          <p>A fumble by attacker or defender results in a roll on the Fumbles table (page 25).</p>
          </details>`,
      },
    ],
  ]),

  equippedIcons: {
    notCarried: "systems/rqg/assets/images/equipped/not_carried.svg",
    carried: "systems/rqg/assets/images/equipped/carried.svg",
    equipped: "systems/rqg/assets/images/equipped/equipped.svg",
  },

  gearViewIcons: {
    byItemType: "systems/rqg/assets/images/gear-views/by-item-type.svg",
    byLocation: "systems/rqg/assets/images/gear-views/by-location.svg",
  },

  missileWeaponReloadIcon: "<i class='x-small-size fas fa-redo-alt'></i>",

  dblClickTimeout: 250, // Timeout for differentiating between single & double clicks

  minTotalHitPoints: 3, // The minimum hit points for an actor.

  rqid: {
    prefixes: {
      // TODO remove from here, is defined in class Rqid
      actor: "a.",
      card: "c.",
      chatMessage: "cm.",
      combat: "co.",
      folder: "f.",
      item: "i.",
      journalEntry: "je.",
      macro: "m.",
      playlist: "p.",
      rollTable: "rt.",
      scene: "s.",
    },
    defaultPriority: 999999, // TODO move to class Rqid when that doesn't import RqgItem anymore
    defaultLang: "en",
  },
};

export type RqgConfig = typeof RQG_CONFIG;

export const systemId = "rqg";

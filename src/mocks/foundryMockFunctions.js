global.mergeObject = jest.fn((...args) => mockMergeObject(...args));
global.getType = jest.fn((...args) => mockGetType(...args));

const mockCONFIG = {
  statusEffects: [
    {
      id: "dead",
      label: "EFFECT.StatusDead",
      icon: "icons/svg/skull.svg",
    },
    {
      id: "unconscious",
      label: "EFFECT.StatusUnconscious",
      icon: "icons/svg/unconscious.svg",
    },
    {
      id: "sleep",
      label: "EFFECT.StatusAsleep",
      icon: "icons/svg/sleep.svg",
    },
    {
      id: "stun",
      label: "EFFECT.StatusStunned",
      icon: "icons/svg/daze.svg",
    },
    {
      id: "prone",
      label: "EFFECT.StatusProne",
      icon: "icons/svg/falling.svg",
    },
    {
      id: "restrain",
      label: "EFFECT.StatusRestrained",
      icon: "icons/svg/net.svg",
    },
    {
      id: "paralysis",
      label: "EFFECT.StatusParalysis",
      icon: "icons/svg/paralysis.svg",
    },
    {
      id: "fly",
      label: "EFFECT.StatusFlying",
      icon: "icons/svg/wing.svg",
    },
    {
      id: "blind",
      label: "EFFECT.StatusBlind",
      icon: "icons/svg/blind.svg",
    },
    {
      id: "deaf",
      label: "EFFECT.StatusDeaf",
      icon: "icons/svg/deaf.svg",
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
      id: "burning",
      label: "EFFECT.StatusBurning",
      icon: "icons/svg/fire.svg",
    },
    {
      id: "frozen",
      label: "EFFECT.StatusFrozen",
      icon: "icons/svg/frozen.svg",
    },
    {
      id: "shock",
      label: "EFFECT.StatusShocked",
      icon: "icons/svg/lightning.svg",
    },
    {
      id: "corrode",
      label: "EFFECT.StatusCorrode",
      icon: "icons/svg/acid.svg",
    },
    {
      id: "bleeding",
      label: "EFFECT.StatusBleeding",
      icon: "icons/svg/blood.svg",
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
      id: "radiation",
      label: "EFFECT.StatusRadiation",
      icon: "icons/svg/radiation.svg",
    },
    {
      id: "regen",
      label: "EFFECT.StatusRegen",
      icon: "icons/svg/regen.svg",
    },
    {
      id: "degen",
      label: "EFFECT.StatusDegen",
      icon: "icons/svg/degen.svg",
    },
    {
      id: "upgrade",
      label: "EFFECT.StatusUpgrade",
      icon: "icons/svg/upgrade.svg",
    },
    {
      id: "downgrade",
      label: "EFFECT.StatusDowngrade",
      icon: "icons/svg/downgrade.svg",
    },
    {
      id: "target",
      label: "EFFECT.StatusTarget",
      icon: "icons/svg/target.svg",
    },
    {
      id: "eye",
      label: "EFFECT.StatusMarked",
      icon: "icons/svg/eye.svg",
    },
    {
      id: "curse",
      label: "EFFECT.StatusCursed",
      icon: "icons/svg/sun.svg",
    },
    {
      id: "bless",
      label: "EFFECT.StatusBlessed",
      icon: "icons/svg/angel.svg",
    },
    {
      id: "fireShield",
      label: "EFFECT.StatusFireShield",
      icon: "icons/svg/fire-shield.svg",
    },
    {
      id: "coldShield",
      label: "EFFECT.StatusIceShield",
      icon: "icons/svg/ice-shield.svg",
    },
    {
      id: "magicShield",
      label: "EFFECT.StatusMagicShield",
      icon: "icons/svg/mage-shield.svg",
    },
    {
      id: "holyShield",
      label: "EFFECT.StatusHolyShield",
      icon: "icons/svg/holy-shield.svg",
    },
  ],
};
global.CONFIG = mockCONFIG;

// Copied from foundry 0.7.9
function mockMergeObject(
  original,
  other = {},
  {
    insertKeys = true,
    insertValues = true,
    overwrite = true,
    recursive = true,
    inplace = true,
    enforceTypes = false,
  } = {},
  _d = 0
) {
  other = other || {};
  if (!(original instanceof Object) || !(other instanceof Object)) {
    throw new Error("One of original or other are not Objects!");
  }
  let depth = _d + 1;

  // Maybe copy the original data at depth 0
  if (!inplace && _d === 0) original = duplicate(original);

  // Enforce object expansion at depth 0
  if (_d === 0 && Object.keys(original).some((k) => /\./.test(k)))
    original = expandObject(original);
  if (_d === 0 && Object.keys(other).some((k) => /\./.test(k))) other = expandObject(other);

  // Iterate over the other object
  for (let [k, v] of Object.entries(other)) {
    let tv = getType(v);

    // Prepare to delete
    let toDelete = false;
    if (k.startsWith("-=")) {
      k = k.slice(2);
      toDelete = v === null;
    }

    // Get the existing object
    let x = original[k];
    let has = original.hasOwnProperty(k);
    let tx = getType(x);

    // Ensure that inner objects exist
    if (!has && tv === "Object") {
      x = original[k] = {};
      has = true;
      tx = "Object";
    }

    // Case 1 - Key exists
    if (has) {
      // 1.1 - Recursively merge an inner object
      if (tv === "Object" && tx === "Object" && recursive) {
        mergeObject(
          x,
          v,
          {
            insertKeys: insertKeys,
            insertValues: insertValues,
            overwrite: overwrite,
            inplace: true,
            enforceTypes: enforceTypes,
          },
          depth
        );
      }

      // 1.2 - Remove an existing key
      else if (toDelete) {
        delete original[k];
      }

      // 1.3 - Overwrite existing value
      else if (overwrite) {
        if (tx && tv !== tx && enforceTypes) {
          throw new Error(`Mismatched data types encountered during object merge.`);
        }
        original[k] = v;
      }

      // 1.4 - Insert new value
      else if (x === undefined && insertValues) {
        original[k] = v;
      }
    }

    // Case 2 - Key does not exist
    else if (!toDelete) {
      let canInsert = (depth === 1 && insertKeys) || (depth > 1 && insertValues);
      if (canInsert) original[k] = v;
    }
  }

  // Return the object for use
  return original;
}

function mockGetType(token) {
  const tof = typeof token;
  if (tof === "object") {
    if (token === null) return "null";
    let cn = token.constructor.name;
    if (["String", "Number", "Boolean", "Array", "Set"].includes(cn)) return cn;
    else if (/^HTML/.test(cn)) return "HTMLElement";
    else return "Object";
  }
  return tof;
}

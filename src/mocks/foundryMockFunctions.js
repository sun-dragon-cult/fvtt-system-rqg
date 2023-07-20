/* eslint-disable no-undef */
// eslint-disable-file no-undef
global.mergeObject = jest.fn((...args) => mockMergeObject(...args));
global.getType = jest.fn((...args) => mockGetType(...args));
global.getProperty = jest.fn((...args) => mockGetProperty(...args));

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

// Copied from Foundry 10.291

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
    performDeletions = false,
  } = {},
  _d = 0,
) {
  other = other || {};
  if (!(original instanceof Object) || !(other instanceof Object)) {
    throw new Error("One of original or other are not Objects!");
  }
  const options = {
    insertKeys,
    insertValues,
    overwrite,
    recursive,
    inplace,
    enforceTypes,
    performDeletions,
  };

  // Special handling at depth 0
  if (_d === 0) {
    if (Object.keys(other).some((k) => /\./.test(k))) other = expandObject(other);
    if (Object.keys(original).some((k) => /\./.test(k))) {
      const expanded = expandObject(original);
      if (inplace) {
        Object.keys(original).forEach((k) => delete original[k]);
        Object.assign(original, expanded);
      } else original = expanded;
    } else if (!inplace) original = deepClone(original);
  }

  // Iterate over the other object
  for (let k of Object.keys(other)) {
    const v = other[k];
    // eslint-disable-next-line no-prototype-builtins
    if (original.hasOwnProperty(k)) _mergeUpdate(original, k, v, options, _d + 1);
    else _mergeInsert(original, k, v, options, _d + 1);
  }
  return original;
}

function expandObject(obj, _d = 0) {
  if (_d > 100) throw new Error("Maximum object expansion depth exceeded");

  // Recursive expansion function
  function _expand(value) {
    if (value instanceof Object) {
      if (Array.isArray(value)) return value.map(_expand);
      else return expandObject(value, _d + 1);
    }
    return value;
  }

  // Expand all object keys
  const expanded = {};
  for (let [k, v] of Object.entries(obj)) {
    setProperty(expanded, k, _expand(v));
  }
  return expanded;
}

function setProperty(object, key, value) {
  let target = object;
  let changed = false;

  // Convert the key to an object reference if it contains dot notation
  if (key.indexOf(".") !== -1) {
    let parts = key.split(".");
    key = parts.pop();
    target = parts.reduce((o, i) => {
      // eslint-disable-next-line no-prototype-builtins
      if (!o.hasOwnProperty(i)) o[i] = {};
      return o[i];
    }, object);
  }

  // Update the target
  if (target[key] !== value) {
    changed = true;
    target[key] = value;
  }

  // Return changed status
  return changed;
}

function _mergeInsert(original, k, v, { insertKeys, insertValues, performDeletions } = {}, _d) {
  // Delete a key
  if (k.startsWith("-=") && performDeletions) {
    delete original[k.slice(2)];
    return;
  }

  const canInsert = (_d <= 1 && insertKeys) || (_d > 1 && insertValues);
  if (!canInsert) return;

  // Recursively create simple objects
  if (v?.constructor === Object) {
    original[k] = mergeObject({}, v, { insertKeys: true, inplace: true, performDeletions });
    return;
  }

  // Insert a key
  original[k] = v;
}

function _mergeUpdate(
  original,
  k,
  v,
  { insertKeys, insertValues, enforceTypes, overwrite, recursive, performDeletions } = {},
  _d,
) {
  const x = original[k];
  const tv = getType(v);
  const tx = getType(x);

  // Recursively merge an inner object
  if (tv === "Object" && tx === "Object" && recursive) {
    return mockMergeObject(
      x,
      v,
      {
        insertKeys,
        insertValues,
        overwrite,
        enforceTypes,
        performDeletions,
        inplace: true,
      },
      _d,
    );
  }

  // Overwrite an existing value
  if (overwrite) {
    if (tx !== "undefined" && tv !== tx && enforceTypes) {
      throw new Error(`Mismatched data types encountered during object merge.`);
    }
    original[k] = v;
  }
}

function mockGetType(variable) {
  // Primitive types, handled with simple typeof check
  const typeOf = typeof variable;
  if (typeOf !== "object") return typeOf;

  // Special cases of object
  if (variable === null) return "null";
  if (!variable.constructor) return "Object"; // Object with the null prototype.
  if (variable.constructor.name === "Object") return "Object"; // simple objects

  // Match prototype instances
  const prototypes = [
    [Array, "Array"],
    [Set, "Set"],
    [Map, "Map"],
    [Promise, "Promise"],
    [Error, "Error"],
    // [Color, "number"], // Don't mock Color to avoid adding even more Foundry code - not used in tests
  ];
  if ("HTMLElement" in globalThis) prototypes.push([globalThis.HTMLElement, "HTMLElement"]);
  for (const [cls, type] of prototypes) {
    if (variable instanceof cls) return type;
  }

  // Unknown Object type
  return "Object";
}

function mockGetProperty(object, key) {
  if (!key) return undefined;
  let target = object;
  for (let p of key.split(".")) {
    const t = getType(target);
    if (!(t === "Object" || t === "Array")) return undefined;
    if (p in target) target = target[p];
    else return undefined;
  }
  return target;
}

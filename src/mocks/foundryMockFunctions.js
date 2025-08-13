// eslint-disable-file no-undef
global.foundry = {
  utils: {
    mergeObject: vi.fn((...args) => mockMergeObject(...args)),
    getProperty: vi.fn((...args) => mockGetProperty(...args)),
    getType: vi.fn((...args) => mockGetType(...args)),
  },
};

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
    if (Object.keys(other).some((k) => /\./.test(k))) {
      other = expandObject(other);
    }
    if (Object.keys(original).some((k) => /\./.test(k))) {
      const expanded = expandObject(original);
      if (inplace) {
        Object.keys(original).forEach((k) => delete original[k]);
        Object.assign(original, expanded);
      } else {
        original = expanded;
      }
    } else if (!inplace) {
      original = deepClone(original);
    }
  }

  // Iterate over the other object
  for (const k of Object.keys(other)) {
    const v = other[k];
    // eslint-disable-next-line no-prototype-builtins
    if (original.hasOwnProperty(k)) {
      _mergeUpdate(original, k, v, _d + 1, options);
    } else {
      _mergeInsert(original, k, v, _d + 1, options);
    }
  }
  return original;
}

function expandObject(obj) {
  const _expand = (value, depth) => {
    if (depth > 32) {
      throw new Error("Maximum object expansion depth exceeded");
    }
    if (!value) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((v) => _expand(v, depth + 1));
    } // Map arrays
    if (foundry.utils.getType(value) !== "Object") {
      return value;
    } // Return advanced objects directly
    const expanded = {}; // Expand simple objects
    for (const [k, v] of Object.entries(value)) {
      setProperty(expanded, k, _expand(v, depth + 1));
    }
    return expanded;
  };
  return _expand(obj, 0);
}

function setProperty(object, key, value) {
  if (!key) {
    return false;
  }

  // Convert the key to an object reference if it contains dot notation
  let target = object;
  if (key.indexOf(".") !== -1) {
    const parts = key.split(".");
    key = parts.pop();
    target = parts.reduce((target, p) => {
      if (!(p in target)) {
        target[p] = {};
      }
      return target[p];
    }, object);
  }

  // Update the target
  if (!(key in target) || target[key] !== value) {
    target[key] = value;
    return true;
  }
  return false;
}

function _mergeInsert(original, k, v, _d, { insertKeys, insertValues, performDeletions } = {}) {
  // Force replace a specific key
  if (performDeletions && k.startsWith("==")) {
    original[k.slice(2)] = applySpecialKeys(v);
    return;
  }

  // Delete a specific key
  if (performDeletions && k.startsWith("-=")) {
    if (v !== null) {
      throw new Error(
        "Removing a key using the -= deletion syntax requires the value of that" +
          " deletion key to be null, for example {-=key: null}",
      );
    }
    delete original[k.slice(2)];
    return;
  }

  // Insert a new object, either recursively or directly
  const canInsert = (_d <= 1 && insertKeys) || (_d > 1 && insertValues);
  if (!canInsert) {
    return;
  }
  if (foundry.utils.getType(v) === "Object") {
    original[k] = foundry.utils.mergeObject({}, v, {
      insertKeys: true,
      inplace: true,
      performDeletions,
    });
    return;
  }
  original[k] = v;
}

function _mergeUpdate(
  original,
  k,
  v,
  _d,
  { insertKeys, insertValues, enforceTypes, overwrite, recursive, performDeletions } = {},
) {
  const x = original[k];
  const tv = foundry.utils.getType(v);
  const tx = foundry.utils.getType(x);
  const ov = tv === "Object" || tv === "Unknown";
  const ox = tx === "Object" || tx === "Unknown";

  // Recursively merge an inner object
  if (ov && ox && recursive) {
    return foundry.utils.mergeObject(
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
      throw new Error("Mismatched data types encountered during object merge.");
    }
    original[k] = applySpecialKeys(v);
  }
}

function applySpecialKeys(obj) {
  const type = foundry.utils.getType(obj);
  if (type === "Array") {
    return obj.map(applySpecialKeys);
  }
  if (type !== "Object") {
    return obj;
  }
  const clone = {};
  for (const key in obj) {
    const v = obj[key];
    if (isDeletionKey(key)) {
      if (key[0] === "-") {
        if (v !== null) {
          throw new Error(
            "Removing a key using the -= deletion syntax requires the value of that" +
              " deletion key to be null, for example {-=key: null}",
          );
        }
        delete clone[key.substring(2)];
        continue;
      }
      if (key[0] === "=") {
        clone[key.substring(2)] = applySpecialKeys(v);
        continue;
      }
    }
    clone[key] = applySpecialKeys(v);
  }
  return clone;
}

const typePrototypes = [
  [Array, "Array"],
  [Set, "Set"],
  [Map, "Map"],
  [Promise, "Promise"],
  [Error, "Error"],
  // [Color, "number"], // Color is not used in the RQG code
];

function mockGetType(variable) {
  // Primitive types, handled with simple typeof check
  const typeOf = typeof variable;
  if (typeOf !== "object") {
    return typeOf;
  }

  // Special cases of object
  if (variable === null) {
    return "null";
  }
  if (!variable.constructor) {
    return "Object";
  } // Object with the null prototype.
  if (variable.constructor === Object) {
    return "Object";
  } // Simple objects

  // Match prototype instances
  for (const [cls, type] of typePrototypes) {
    if (variable instanceof cls) {
      return type;
    }
  }
  if ("HTMLElement" in globalThis && variable instanceof globalThis.HTMLElement) {
    return "HTMLElement";
  }

  // Unknown Object type
  return "Unknown";
}

function mockGetProperty(object, key) {
  if (!key || !object) {
    return undefined;
  }
  if (key in object) {
    return object[key];
  }
  let target = object;
  for (const p of key.split(".")) {
    if (!target) {
      return undefined;
    }
    const type = typeof target;
    if (type !== "object" && type !== "function") {
      return undefined;
    }
    if (p in target) {
      target = target[p];
    } else {
      return undefined;
    }
  }
  return target;
}

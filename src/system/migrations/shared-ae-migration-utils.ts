/**
 * Shared utilities for Active Effect path migrations
 *
 * Handles rewriting legacy AE paths to new non-persisted AE-target fields
 * introduced in PR4 for Foundry v14 compatibility.
 */

interface AEPathMapping {
  legacyKey: string;
  newKey: string;
}

export const AE_LEGACY_PATH_MAPPINGS: AEPathMapping[] = [
  {
    legacyKey: "system.attributes.magicPoints.max",
    newKey: "system.attributes.magicPointsMaxFromEffects",
  },
  {
    legacyKey: "system.attributes.hitPoints.max",
    newKey: "system.attributes.hitPointsMaxFromEffects",
  },
];

const AE_TARGET_KEYS = new Set(AE_LEGACY_PATH_MAPPINGS.flatMap((m) => [m.legacyKey, m.newKey]));

function getEffectChanges(effect: any): any[] {
  // v14 canonical persisted location is `system.changes`.
  // Foundry's own migrateData moves top-level changes → system.changes.
  // The shim only creates top-level as a getter/setter proxy.
  const systemChanges = Array.isArray(effect?.system?.changes) ? effect.system.changes : [];
  return systemChanges;
}

function setEffectChanges(effect: any, changes: any[]): void {
  effect.system ??= {};
  effect.system.changes = changes;
}

function toPersistedChangeData(change: any): any {
  const persisted = { ...change };
  // v14 runtime shape includes a back-reference to the parent effect.
  // It is not part of persisted change data and should never be written.
  delete persisted.effect;
  return persisted;
}

function toEffectObject(effect: any): any {
  if (effect && typeof effect.toObject === "function") {
    // ActiveEffect documents expose persisted source via toObject().
    return effect.toObject();
  }
  return structuredClone(effect);
}

function normalizeNumericValue(rawValue: unknown): number {
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    return rawValue;
  }
  if (typeof rawValue === "string") {
    const normalized = rawValue.trim().replace(",", ".");
    if (normalized.length === 0) {
      return 0;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/**
 * Migrate changes in a single effect: rewrite legacy keys to new ones.
 * Only migrates ADD-mode changes; non-ADD modes are left untouched for manual review.
 *
 * @returns true if any changes were migrated
 */
export function migrateEffectChanges(effect: any): boolean {
  const changes = getEffectChanges(effect);
  if (!changes.length) {
    return false;
  }

  const legacyKeyMap = new Map(AE_LEGACY_PATH_MAPPINGS.map((m) => [m.legacyKey, m.newKey]));
  let hasChanges = false;

  const migratedChanges = changes.map((change) => {
    const persistedChange = toPersistedChangeData(change);
    if (change.type !== "add") {
      return persistedChange;
    }
    const keyBeforeRewrite = persistedChange.key;
    const keyAfterRewrite = legacyKeyMap.get(keyBeforeRewrite) ?? keyBeforeRewrite;
    const nextKey = keyAfterRewrite;
    let nextValue = persistedChange.value;

    if (AE_TARGET_KEYS.has(nextKey)) {
      nextValue = normalizeNumericValue(persistedChange.value);
    }

    if (nextKey !== persistedChange.key || nextValue !== persistedChange.value) {
      hasChanges = true;
      return {
        ...persistedChange,
        key: nextKey,
        value: nextValue,
      };
    }

    return persistedChange;
  });

  setEffectChanges(effect, migratedChanges);

  return hasChanges;
}

/**
 * Process an array of effects and return the migrated array
 * Clones and migrates effects as needed
 *
 * @returns array of effects (migrated or original)
 */
export function migrateEffectArray(effects: any[]): any[] {
  return effects.map((effect) => {
    const effectClone = toEffectObject(effect);
    if (migrateEffectChanges(effectClone)) {
      return effectClone;
    }
    return effect;
  });
}

/**
 * Convert an effects array to persisted plain data suitable for document updates.
 */
export function toPersistedEffectArray(effects: any[]): any[] {
  return effects.map((effect) => toEffectObject(effect));
}

/**
 * Check if effect arrays are different (any migrations occurred)
 */
export function effectArraysChanged(original: any[], migrated: any[]): boolean {
  return migrated.some((e, i) => e !== original[i]);
}

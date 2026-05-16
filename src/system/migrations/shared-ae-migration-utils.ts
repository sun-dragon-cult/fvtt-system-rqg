import { systemId } from "../config";
import { documentRqidFlags } from "../../data-model/shared/rqgDocumentFlags";

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

type LegacyItemTargetSyntax = {
  itemType: string;
  itemName: string;
  systemPath: string;
};

const LEGACY_NUMERIC_TYPE_TO_CANONICAL: Record<number, ActiveEffectChangeType> = {
  0: "custom",
  1: "multiply",
  2: "add",
  3: "downgrade",
  4: "upgrade",
  5: "override",
};

const CANONICAL_CHANGE_TYPES = new Set<ActiveEffectChangeType>([
  "custom",
  "multiply",
  "add",
  "downgrade",
  "upgrade",
  "override",
]);

export const AE_LEGACY_PATH_MAPPINGS: AEPathMapping[] = [
  {
    legacyKey: "system.attributes.magicPoints.max",
    newKey: "system.effect.magicPoints.max",
  },
  {
    legacyKey: "system.attributes.hitPoints.max",
    newKey: "system.effect.hitPoints.max",
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

function parseLegacyItemTargetSyntax(key: string): LegacyItemTargetSyntax | undefined {
  const parts = key.split(":");
  if (parts.length !== 3) {
    return undefined;
  }

  const [itemType, itemName, systemPath] = parts;
  if (!itemType || !itemName || !systemPath?.startsWith("system.")) {
    return undefined;
  }

  // Already migrated or pattern syntax; not legacy item-type:item-name syntax.
  if (itemType.startsWith("i.") || itemType.startsWith("~")) {
    return undefined;
  }

  return { itemType, itemName, systemPath };
}

function getCollectionValues<T = any>(collectionLike: any): T[] {
  if (Array.isArray(collectionLike)) {
    return collectionLike as T[];
  }
  return Array.from(collectionLike?.values?.() ?? []);
}

function getDocumentRqid(item: any): string | undefined {
  if (typeof item?.getFlag === "function") {
    const rqidFlag = item.getFlag(systemId, documentRqidFlags);
    if (typeof rqidFlag?.id === "string" && rqidFlag.id.length > 0) {
      return rqidFlag.id;
    }
  }

  const rqidFromFlags = item?.flags?.[systemId]?.[documentRqidFlags]?.id;
  return typeof rqidFromFlags === "string" && rqidFromFlags.length > 0 ? rqidFromFlags : undefined;
}

function migrateLegacyItemTargetKey(key: string, owningActor?: any): string {
  const parsed = parseLegacyItemTargetSyntax(key);
  if (!parsed || !owningActor) {
    return key;
  }

  const actorItems = getCollectionValues(owningActor.items);
  const matchingItems = actorItems.filter(
    (item) => item && item.type === parsed.itemType && item.name === parsed.itemName,
  );

  // Ambiguous or missing matches should be left untouched for manual repair.
  if (matchingItems.length !== 1) {
    return key;
  }

  const rqid = getDocumentRqid(matchingItems[0]);
  if (!rqid) {
    return key;
  }

  return `${rqid}:${parsed.systemPath}`;
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

function normalizeChangeType(rawType: unknown): ActiveEffectChangeType | undefined {
  if (typeof rawType === "number" && Number.isInteger(rawType)) {
    return LEGACY_NUMERIC_TYPE_TO_CANONICAL[rawType];
  }

  if (typeof rawType !== "string") {
    return undefined;
  }

  if (rawType === "subtract") {
    return "add";
  }

  if (CANONICAL_CHANGE_TYPES.has(rawType as ActiveEffectChangeType)) {
    return rawType as ActiveEffectChangeType;
  }

  const customNumericMatch = /^custom\.(-?\d+)$/.exec(rawType);
  if (!customNumericMatch) {
    return undefined;
  }

  const numericType = Number(customNumericMatch[1]);
  if (!Number.isInteger(numericType)) {
    return undefined;
  }

  const mappedLegacyMode = LEGACY_NUMERIC_TYPE_TO_CANONICAL[numericType];
  return mappedLegacyMode ?? "custom";
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
 * Migrate legacy item target syntax in custom Active Effect keys:
 * <item type>:<item name>:<system.path> -> <rqid>:<system.path>
 */
export function migrateEffectLegacyItemTargetSyntax(effect: any, owningActor?: any): boolean {
  const changes = getEffectChanges(effect);
  if (!changes.length || !owningActor) {
    return false;
  }

  let hasChanges = false;
  const migratedChanges = changes.map((change) => {
    const persistedChange = toPersistedChangeData(change);
    if (typeof persistedChange.key !== "string") {
      return persistedChange;
    }

    const nextKey = migrateLegacyItemTargetKey(persistedChange.key, owningActor);
    if (nextKey !== persistedChange.key) {
      hasChanges = true;
      persistedChange.key = nextKey;
    }

    return persistedChange;
  });

  if (hasChanges) {
    setEffectChanges(effect, migratedChanges);
  }

  return hasChanges;
}

/**
 * Repair malformed or legacy change.type values in a single effect.
 *
 * @returns true if any type values were normalized
 */
export function migrateEffectChangeTypes(effect: any): boolean {
  const changes = getEffectChanges(effect);
  if (!changes.length) {
    return false;
  }

  let hasChanges = false;
  const migratedChanges = changes.map((change) => {
    const persistedChange = toPersistedChangeData(change);
    const normalizedType = normalizeChangeType(persistedChange.type);
    if (normalizedType && normalizedType !== persistedChange.type) {
      hasChanges = true;
      persistedChange.type = normalizedType;
    }
    return persistedChange;
  });

  if (hasChanges) {
    setEffectChanges(effect, migratedChanges);
  }

  return hasChanges;
}

/**
 * Normalize change.type values and then rewrite legacy paths in one pass.
 *
 * This keeps Active Effect migration behavior self-contained even when
 * migration infrastructure merges payloads from independent migration functions.
 */
export function migrateEffectTypesAndPaths(effect: any, owningActor?: any): boolean {
  const normalizedTypes = migrateEffectChangeTypes(effect);
  const migratedPaths = migrateEffectChanges(effect);
  const migratedLegacyItemTargets = migrateEffectLegacyItemTargetSyntax(effect, owningActor);
  return normalizedTypes || migratedPaths || migratedLegacyItemTargets;
}

/**
 * Process an array of effects and return the migrated array
 * Clones and migrates effects as needed
 *
 * @returns array of effects (migrated or original)
 */
export function migrateEffectArray(effects: any[], owningActor?: any): any[] {
  return effects.map((effect) => {
    const effectClone = toEffectObject(effect);
    if (migrateEffectTypesAndPaths(effectClone, owningActor)) {
      return effectClone;
    }
    return effect;
  });
}

/**
 * Process an array of effects and normalize change.type values.
 */
export function migrateEffectTypeArray(effects: any[]): any[] {
  return effects.map((effect) => {
    const effectClone = toEffectObject(effect);
    if (migrateEffectChangeTypes(effectClone)) {
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

import { systemId } from "../config";
import { documentRqidFlags } from "../../data-model/shared/rqg-document-flags";

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

export interface AEPathRewriteRule extends AEPathMapping {
  allowedModes?: ActiveEffectChangeType[];
  validateValue?: (value: unknown) => number | undefined;
  transformValue?: (value: number) => number;
  transformMode?: (mode: ActiveEffectChangeType) => ActiveEffectChangeType;
}

export type AERewriteWarningReason =
  | "non-additive-mode"
  | "non-numeric-value"
  | "duplicate-target-key"
  | "effect-processing-failure"
  | "document-processing-failure";

export interface AEPathRewriteSummary {
  scannedEffects: number;
  migratedChanges: number;
  skippedChanges: number;
  warningCount: number;
  warningReasons: Record<AERewriteWarningReason, number>;
  failureCount: number;
}

export interface AERewriteOptions {
  rules?: AEPathRewriteRule[];
  dryRun?: boolean;
}

export interface AERewriteResult {
  changed: boolean;
  summary: AEPathRewriteSummary;
}

export interface AERunOwner {
  id: string;
  name: string;
  effects: any[];
  owningActor?: any;
}

export interface AEOwnerUpdate {
  id: string;
  effects: any[];
}

export interface AEOwnerRunResult {
  updates: AEOwnerUpdate[];
  ownersScanned: number;
  ownersUpdated: number;
  ownersFailed: number;
  summary: AEPathRewriteSummary;
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

export const AE_DEFAULT_PATH_REWRITE_RULES: AEPathRewriteRule[] = AE_LEGACY_PATH_MAPPINGS.map(
  (mapping) => ({
    ...mapping,
    allowedModes: ["add"],
    validateValue: parseNumericValue,
  }),
);

const EMPTY_WARNING_REASONS: Record<AERewriteWarningReason, number> = {
  "non-additive-mode": 0,
  "non-numeric-value": 0,
  "duplicate-target-key": 0,
  "effect-processing-failure": 0,
  "document-processing-failure": 0,
};

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

function parseNumericValue(rawValue: unknown): number | undefined {
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    return rawValue;
  }

  if (typeof rawValue === "string") {
    const normalized = rawValue.trim().replace(",", ".");
    if (normalized.length === 0) {
      return undefined;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
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
  return migrateEffectChangesWithSummary(effect).changed;
}

export function createEmptyAEPathRewriteSummary(): AEPathRewriteSummary {
  return {
    scannedEffects: 0,
    migratedChanges: 0,
    skippedChanges: 0,
    warningCount: 0,
    warningReasons: { ...EMPTY_WARNING_REASONS },
    failureCount: 0,
  };
}

export function mergeAEPathRewriteSummaries(
  base: AEPathRewriteSummary,
  addition: AEPathRewriteSummary,
): AEPathRewriteSummary {
  const merged = createEmptyAEPathRewriteSummary();
  merged.scannedEffects = base.scannedEffects + addition.scannedEffects;
  merged.migratedChanges = base.migratedChanges + addition.migratedChanges;
  merged.skippedChanges = base.skippedChanges + addition.skippedChanges;
  merged.warningCount = base.warningCount + addition.warningCount;
  merged.failureCount = base.failureCount + addition.failureCount;

  for (const reason of Object.keys(EMPTY_WARNING_REASONS) as AERewriteWarningReason[]) {
    merged.warningReasons[reason] = base.warningReasons[reason] + addition.warningReasons[reason];
  }

  return merged;
}

function addWarning(summary: AEPathRewriteSummary, reason: AERewriteWarningReason): void {
  summary.warningCount += 1;
  summary.warningReasons[reason] += 1;
}

function getRewriteRuleByLegacyKey(rules: AEPathRewriteRule[]): Map<string, AEPathRewriteRule> {
  return new Map(rules.map((rule) => [rule.legacyKey, rule]));
}

export function migrateEffectChangesWithSummary(
  effect: any,
  options: AERewriteOptions = {},
): AERewriteResult {
  const summary = createEmptyAEPathRewriteSummary();
  summary.scannedEffects += 1;

  const rules = options.rules ?? AE_DEFAULT_PATH_REWRITE_RULES;
  const ruleByLegacyKey = getRewriteRuleByLegacyKey(rules);
  const changes = getEffectChanges(effect);
  if (!changes.length) {
    return {
      changed: false,
      summary,
    };
  }

  let hasChanges = false;

  const migratedChanges = changes.map((change) => {
    const persistedChange = toPersistedChangeData(change);
    const rule = ruleByLegacyKey.get(persistedChange.key);
    if (!rule) {
      return persistedChange;
    }

    const normalizedMode = normalizeChangeType(persistedChange.type);
    const transformedMode = rule.transformMode?.(normalizedMode ?? "custom") ?? normalizedMode;
    const allowedModes = rule.allowedModes ?? ["add"];

    if (!transformedMode || !allowedModes.includes(transformedMode)) {
      summary.skippedChanges += 1;
      addWarning(summary, "non-additive-mode");
      return persistedChange;
    }

    const validateValue = rule.validateValue ?? parseNumericValue;
    const validatedValue = validateValue(persistedChange.value);
    if (validatedValue === undefined) {
      summary.skippedChanges += 1;
      addWarning(summary, "non-numeric-value");
      return persistedChange;
    }

    const nextKey = rule.newKey;

    const transformedValue = rule.transformValue?.(validatedValue) ?? validatedValue;
    summary.migratedChanges += 1;

    if (!options.dryRun) {
      persistedChange.key = nextKey;
      persistedChange.type = transformedMode;
      persistedChange.value = transformedValue;
      hasChanges = true;
    }

    return persistedChange;
  });

  if (hasChanges) {
    setEffectChanges(effect, migratedChanges);
  }

  return {
    changed: hasChanges,
    summary,
  };
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
 * Rewrite legacy attribute paths and legacy item-target key syntax in one pass.
 *
 * - Legacy attribute paths (e.g. system.attributes.magicPoints.max) are rewritten to their
 *   current equivalents using the default path rewrite rules.
 * - Legacy item-target syntax (<itemType>:<itemName>:<systemPath>) is rewritten to
 *   rqid-based syntax when a unique actor item match can be found.
 *
 * Type normalization is handled by separate migration functions and is not performed here.
 */
export function migrateEffectTypesAndPaths(effect: any, owningActor?: any): boolean {
  const migratedPaths = migrateEffectChanges(effect);
  const migratedLegacyItemTargets = migrateEffectLegacyItemTargetSyntax(effect, owningActor);
  return migratedPaths || migratedLegacyItemTargets;
}

export function migrateEffectTypesAndPathsWithSummary(
  effect: any,
  owningActor?: any,
  options: AERewriteOptions = {},
): AERewriteResult {
  const pathRewrite = migrateEffectChangesWithSummary(effect, options);
  const migratedLegacyItemTargets = options.dryRun
    ? false
    : migrateEffectLegacyItemTargetSyntax(effect, owningActor);
  return {
    changed: pathRewrite.changed || migratedLegacyItemTargets,
    summary: pathRewrite.summary,
  };
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

export function migrateEffectArrayWithSummary(
  effects: any[],
  owningActor?: any,
  options: AERewriteOptions = {},
): { effects: any[]; summary: AEPathRewriteSummary } {
  const aggregateSummary = createEmptyAEPathRewriteSummary();

  const migrated = effects.map((effect) => {
    try {
      const effectClone = toEffectObject(effect);
      const rewriteResult = migrateEffectTypesAndPathsWithSummary(
        effectClone,
        owningActor,
        options,
      );
      const mergedSummary = mergeAEPathRewriteSummaries(aggregateSummary, rewriteResult.summary);
      Object.assign(aggregateSummary, mergedSummary);
      return rewriteResult.changed ? effectClone : effect;
    } catch {
      aggregateSummary.failureCount += 1;
      addWarning(aggregateSummary, "effect-processing-failure");
      return effect;
    }
  });

  return {
    effects: migrated,
    summary: aggregateSummary,
  };
}

export function runAEPathRewriteForOwners(
  owners: AERunOwner[],
  options: AERewriteOptions = {},
): AEOwnerRunResult {
  const summary = createEmptyAEPathRewriteSummary();
  const updates: AEOwnerUpdate[] = [];
  let ownersUpdated = 0;
  let ownersFailed = 0;

  for (const owner of owners) {
    try {
      const migrated = migrateEffectArrayWithSummary(owner.effects, owner.owningActor, options);
      const mergedSummary = mergeAEPathRewriteSummaries(summary, migrated.summary);
      Object.assign(summary, mergedSummary);

      if (effectArraysChanged(owner.effects, migrated.effects)) {
        ownersUpdated += 1;
        updates.push({ id: owner.id, effects: migrated.effects });
      }
    } catch {
      ownersFailed += 1;
      summary.failureCount += 1;
      addWarning(summary, "document-processing-failure");
    }
  }

  return {
    updates,
    ownersScanned: owners.length,
    ownersUpdated,
    ownersFailed,
    summary,
  };
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

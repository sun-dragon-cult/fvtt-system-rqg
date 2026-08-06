type LegacyDurationRecord = Record<string, unknown>;

const LEGACY_DURATION_KEYS = [
  "startTime",
  "seconds",
  "combat",
  "rounds",
  "turns",
  "startRound",
  "startTurn",
] as const;

export interface NormalizedActiveEffectDuration {
  duration: {
    value: number | null;
    units: "seconds" | "rounds" | "turns";
    startTime: typeof _del;
    seconds: typeof _del;
    combat: typeof _del;
    rounds: typeof _del;
    turns: typeof _del;
    startRound: typeof _del;
    startTurn: typeof _del;
  };
  start: {
    time: number;
    round: number | null;
    turn: number | null;
    combat: unknown;
    combatant: unknown;
    initiative: number | null;
  };
}

/**
 * Foundry v14 keeps the deprecated duration keys readable via getters that derive
 * their value from the new `duration.value`/`units`/`start` fields. Those shims
 * report data forever, so only a real stored (data) property counts as legacy.
 */
function hasStoredLegacyValue(duration: LegacyDurationRecord, key: string): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(duration, key);
  if (!descriptor || typeof descriptor.get === "function") {
    return false;
  }
  return descriptor.value !== null && descriptor.value !== undefined;
}

export function normalizeLegacyActiveEffectDuration(
  effectLike: unknown,
): NormalizedActiveEffectDuration | undefined {
  // Deliberately read `_source` rather than `toObject()`: cloning would collapse
  // the deprecation getters into plain values and hide the distinction above.
  const source =
    effectLike && typeof effectLike === "object" && "_source" in effectLike
      ? ((effectLike as { _source: Record<string, unknown> })._source ??
        (effectLike as Record<string, unknown>))
      : (effectLike as Record<string, unknown> | undefined);

  const durationRaw = source?.["duration"];
  if (!durationRaw || typeof durationRaw !== "object") {
    return undefined;
  }

  const duration = durationRaw as LegacyDurationRecord;

  const toFiniteNumber = (value: unknown): number | null => {
    const numeric = typeof value === "string" ? Number(value) : value;
    return typeof numeric === "number" && Number.isFinite(numeric) ? numeric : null;
  };

  const hasLegacyDurationShape = LEGACY_DURATION_KEYS.some((key) =>
    hasStoredLegacyValue(duration, key),
  );
  if (!hasLegacyDurationShape) {
    return undefined;
  }

  const legacyValue = (key: string): unknown =>
    hasStoredLegacyValue(duration, key) ? duration[key] : undefined;

  const existingValue = toFiniteNumber(duration["value"]);
  const existingUnits = duration["units"];
  const seconds = toFiniteNumber(legacyValue("seconds"));
  const rounds = toFiniteNumber(legacyValue("rounds"));
  const turns = toFiniteNumber(legacyValue("turns"));

  let inferredValue: number | null = null;
  let inferredUnits: "seconds" | "rounds" | "turns" = "seconds";

  if (existingValue !== null && typeof existingUnits === "string") {
    if (existingUnits === "seconds" || existingUnits === "rounds" || existingUnits === "turns") {
      inferredValue = existingValue;
      inferredUnits = existingUnits;
    }
  } else if (seconds !== null) {
    inferredValue = seconds;
    inferredUnits = "seconds";
  } else if (rounds !== null) {
    inferredValue = rounds;
    inferredUnits = "rounds";
  } else if (turns !== null) {
    inferredValue = turns;
    inferredUnits = "turns";
  }

  const startRaw = source?.["start"];
  const startRecord =
    startRaw && typeof startRaw === "object" ? (startRaw as LegacyDurationRecord) : {};

  return {
    duration: {
      value: inferredValue,
      units: inferredUnits,
      // Explicitly delete legacy fields so they don't linger alongside the new
      // value/units shape and keep triggering Foundry's compatibility warnings.
      // Foundry v14 deprecated the "-=key" deletion syntax in favor of the `_del`
      // ForcedDeletion sentinel (see foundry.data.operators.ForcedDeletion).
      startTime: _del,
      seconds: _del,
      combat: _del,
      rounds: _del,
      turns: _del,
      startRound: _del,
      startTurn: _del,
    },
    start: {
      time: toFiniteNumber(startRecord["time"]) ?? toFiniteNumber(legacyValue("startTime")) ?? 0,
      round: toFiniteNumber(startRecord["round"]) ?? toFiniteNumber(legacyValue("startRound")),
      turn: toFiniteNumber(startRecord["turn"]) ?? toFiniteNumber(legacyValue("startTurn")),
      combat: startRecord["combat"] ?? legacyValue("combat") ?? null,
      combatant: startRecord["combatant"] ?? null,
      initiative: toFiniteNumber(startRecord["initiative"]),
    },
  };
}

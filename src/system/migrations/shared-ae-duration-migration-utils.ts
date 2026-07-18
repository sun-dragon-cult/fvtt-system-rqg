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

export function normalizeLegacyActiveEffectDuration(
  effectLike: unknown,
): NormalizedActiveEffectDuration | undefined {
  const source =
    effectLike &&
    typeof effectLike === "object" &&
    "toObject" in effectLike &&
    typeof (effectLike as { toObject?: unknown }).toObject === "function"
      ? (effectLike as { toObject: () => Record<string, unknown> }).toObject()
      : (effectLike as Record<string, unknown> | undefined);

  const durationRaw = source?.["duration"];
  if (!durationRaw || typeof durationRaw !== "object") {
    return undefined;
  }

  const duration = durationRaw as LegacyDurationRecord;
  const hasLegacyDurationShape = LEGACY_DURATION_KEYS.some((key) => key in duration);
  if (!hasLegacyDurationShape) {
    return undefined;
  }

  const toFiniteNumber = (value: unknown): number | null => {
    const numeric = typeof value === "string" ? Number(value) : value;
    return typeof numeric === "number" && Number.isFinite(numeric) ? numeric : null;
  };

  const existingValue = toFiniteNumber(duration["value"]);
  const existingUnits = duration["units"];
  const seconds = toFiniteNumber(duration["seconds"]);
  const rounds = toFiniteNumber(duration["rounds"]);
  const turns = toFiniteNumber(duration["turns"]);

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
      time: toFiniteNumber(startRecord["time"]) ?? toFiniteNumber(duration["startTime"]) ?? 0,
      round: toFiniteNumber(startRecord["round"]) ?? toFiniteNumber(duration["startRound"]),
      turn: toFiniteNumber(startRecord["turn"]) ?? toFiniteNumber(duration["startTurn"]),
      combat: startRecord["combat"] ?? duration["combat"] ?? null,
      combatant: startRecord["combatant"] ?? null,
      initiative: toFiniteNumber(startRecord["initiative"]),
    },
  };
}

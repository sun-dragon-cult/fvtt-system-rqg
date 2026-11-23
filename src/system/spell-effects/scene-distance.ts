const metersPerUnit: Record<string, number> = Object.fromEntries(
  (
    [
      [0.001, "mm"],
      [0.01, "cm"],
      [1000, "km", "kilometer", "kilometers", "kilometre", "kilometres"],
      [0.0254, "in", "inch", "inches"],
      [0.3048, "ft", "foot", "feet"],
      [0.9144, "yd", "yds", "yard", "yards"],
      [1609.344, "mi", "mile", "miles"],
    ] as const
  ).flatMap(([meters, ...names]) => names.map((name) => [name, meters])),
);

/**
 * Meters in one of a scene's distance units; RQG scenes use meters, imported maps may not. A unit
 * it doesn't know, like "squares", counts as meters.
 */
export function metersPerSceneUnit(units: string | undefined): number {
  const unit = (units ?? "").trim().toLowerCase().replace(/\.$/, "");
  return metersPerUnit[unit] ?? 1;
}

/**
 * Canvas pixels for a distance in meters on a scene, by its grid scale.
 *
 * @public since 6.2.0
 */
export function metersToPixels(
  meters: number,
  grid: { size: number; distance: number; units?: string },
): number {
  return (meters / metersPerSceneUnit(grid.units) / grid.distance) * grid.size;
}

/** Token change keys holding a distance, as core passes them to a token (without "token."). */
const tokenDistanceKey = /^(light\.(dim|bright)|sight\.range|detectionModes\.[^.]+\.range)$/;

/** Change types whose value is a distance; a multiply's value is a factor. */
const distanceChangeTypes = new Set(["add", "subtract", "override", "upgrade", "downgrade"]);

/**
 * A spell effect's token change, whose distance is written in meters, with the value in the scene's
 * units. Any other change, or an empty value, is returned as it is.
 */
export function tokenChangeInSceneUnits<
  C extends { key?: string | null; type?: string; value?: unknown },
>(change: C, units: string | undefined): C {
  if (!tokenDistanceKey.test(change.key ?? "") || !distanceChangeTypes.has(change.type ?? "")) {
    return change;
  }
  const perUnit = metersPerSceneUnit(units);
  if (perUnit === 1) {
    return change;
  }
  if (typeof change.value === "number") {
    return { ...change, value: change.value / perUnit };
  }
  const meters = typeof change.value === "string" ? change.value.trim() : "";
  if (!meters) {
    return change;
  }
  const value = Number(meters);
  // Core rolls a number field's string value, so a formula like "@level * 10" can be divided
  return {
    ...change,
    value: Number.isFinite(value) ? String(value / perUnit) : `(${meters}) / ${perUnit}`,
  };
}

/** Meters for one canvas pixel on a scene, by its grid scale. */
export function metersPerPixel(grid: { size: number; distance: number; units?: string }): number {
  return (grid.distance * metersPerSceneUnit(grid.units)) / grid.size;
}

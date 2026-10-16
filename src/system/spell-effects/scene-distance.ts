/** Metres in one of a scene's distance units; RQG scenes use metres, imported maps may not. */
export function metresPerSceneUnit(units: string | undefined): number {
  if (/^(ft|feet|foot)\.?$/i.test(units ?? "")) {
    return 0.3048;
  }
  if (/^(yd|yds|yards?)\.?$/i.test(units ?? "")) {
    return 0.9144;
  }
  return 1;
}

/** Canvas pixels for a distance in metres on a scene, by its grid scale. */
export function metresToPixels(
  metres: number,
  grid: { size: number; distance: number; units?: string },
): number {
  return (metres / metresPerSceneUnit(grid.units) / grid.distance) * grid.size;
}

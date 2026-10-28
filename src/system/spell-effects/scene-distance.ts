/** Meters in one of a scene's distance units; RQG scenes use meters, imported maps may not. */
export function metersPerSceneUnit(units: string | undefined): number {
  if (/^(ft|feet|foot)\.?$/i.test(units ?? "")) {
    return 0.3048;
  }
  if (/^(yd|yds|yards?)\.?$/i.test(units ?? "")) {
    return 0.9144;
  }
  return 1;
}

/** Canvas pixels for a distance in meters on a scene, by its grid scale. */
export function metersToPixels(
  meters: number,
  grid: { size: number; distance: number; units?: string },
): number {
  return (meters / metersPerSceneUnit(grid.units) / grid.distance) * grid.size;
}

/** Meters for one canvas pixel on a scene, by its grid scale. */
export function metersPerPixel(grid: { size: number; distance: number; units?: string }): number {
  return (grid.distance * metersPerSceneUnit(grid.units)) / grid.size;
}

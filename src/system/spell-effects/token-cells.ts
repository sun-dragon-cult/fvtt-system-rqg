import { actorRefUuid } from "../../data-model/shared/actor-ref";
import { tokenOfDocument } from "./spell-across";
import type { SpellApplyScope } from "./apply-spell-effect";

export type GridRect = { col: number; row: number; w: number; h: number };

function overlaps(a: GridRect, b: GridRect): boolean {
  return a.col < b.col + b.w && b.col < a.col + a.w && a.row < b.row + b.h && b.row < a.row + a.h;
}

/**
 * The free grid cell nearest the summoner for a token of the given size, in grid units, looking
 * at most `reach` cells away.
 */
export function nearestFreeCell(
  summoner: GridRect,
  size: { w: number; h: number },
  occupied: GridRect[],
  reach = 10,
): { col: number; row: number } | undefined {
  const centre = { col: summoner.col + summoner.w / 2, row: summoner.row + summoner.h / 2 };
  let best: { col: number; row: number; distance: number } | undefined;
  for (let row = summoner.row - size.h - reach; row <= summoner.row + summoner.h + reach; row++) {
    for (let col = summoner.col - size.w - reach; col <= summoner.col + summoner.w + reach; col++) {
      const rect = { col, row, w: size.w, h: size.h };
      if (occupied.some((other) => overlaps(rect, other))) {
        continue;
      }
      const distance = Math.hypot(col + size.w / 2 - centre.col, row + size.h / 2 - centre.row);
      if (!best || distance < best.distance) {
        best = { col, row, distance };
      }
    }
  }
  return best ? { col: best.col, row: best.row } : undefined;
}

/** Who a spell acts from: the caster's token or actor, or without a caster (token HUD "+") the target. */
export async function summonerDocument(scope: SpellApplyScope): Promise<unknown> {
  return actorRefUuid(scope.cast.caster)
    ? await fromUuid(actorRefUuid(scope.cast.caster))
    : scope.targetActor;
}

/** The token to summon next to: the caster's, or without a caster (token HUD "+") the target's. */
export async function summonerToken(scope: SpellApplyScope): Promise<TokenDocument | undefined> {
  return tokenOfDocument(await summonerDocument(scope));
}

/**
 * The grid cells a token covers, by the grid's own offsets so a grid that doesn't start at the
 * scene's corner still lines up. A token's corner can sit on the edge of its cell, so its center
 * says which cell it is in.
 */
export function tokenCell(
  grid: Scene["grid"],
  token: { x: number; y: number; width: number; height: number },
): GridRect {
  const center = {
    x: token.x + (token.width * (grid.sizeX ?? grid.size)) / 2,
    y: token.y + (token.height * (grid.sizeY ?? grid.size)) / 2,
  };
  const { i, j } = grid.getOffset(center);
  return { col: j, row: i, w: token.width, h: token.height };
}

/**
 * How many grid squares across the round token of a body with this footprint in meters is: the
 * square with the same ground area, rounded up to whole squares (exact on a gridless scene).
 */
export function summonedTokenCells(
  footprintMeters: { w: number; h: number },
  gridDistance: number,
  gridless: boolean,
): number {
  const cells = Math.sqrt(footprintMeters.w * footprintMeters.h) / gridDistance;
  return gridless ? cells : Math.max(1, Math.ceil(cells - 1e-9));
}

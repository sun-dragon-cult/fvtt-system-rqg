import { localize } from "../util";
import { systemId } from "../config";
import { SpellRangeEnum } from "../../data-model/item-data/spell";
import { RqgLogger } from "../logging/rqg-logger";
import type { RqgItem } from "@items/rqg-item.ts";
import type {
  SpellApplyScope,
  SpellEffectApplied,
  SpellEffectDuration,
} from "./apply-spell-effect";
import { casterOnScene, createHeldForSpell } from "./held-scene-document";
import { pickSpellLocation } from "./pick-spell-location";
import { metersPerSceneUnit, metersToPixels } from "./scene-distance";
import type { HeldDocument } from "./spell-anchor";
import {
  applyRequestData,
  placeUnlessTaken,
  requestGmWork,
  runApplyRequest,
  type SpellApplyAnswer,
  type SpellApplyRequestData,
} from "./spell-apply-request";
import { spellRangeInMeters } from "./spell-area";
import { spellBehaviorOf, type SpellLight } from "./spell-behavior";
import { summonerToken } from "./token-cells";

const logger = new RqgLogger("SpellLight", { notify: false });

/** What a player's client sends the GM to place a spell's light, since players may not create lights. */
export type CreateSpellLightQueryData = SpellApplyRequestData & {
  /** The caster's token the light was placed from. */
  casterTokenUuid: string;
  x: number;
  y: number;
  /** Degrees, 0 facing down. */
  rotation: number;
};

/** The light the spell's registered behavior declares. */
function spellLightOf(spell: RqgItem): SpellLight | undefined {
  return spellBehaviorOf(spell)?.light;
}

/** The scene document data of an ambient light, in the scene's own units. */
export function ambientLightData(
  light: SpellLight,
  point: { x: number; y: number },
  rotation: number,
  grid: { units?: string },
  heldBy?: string,
): Record<string, unknown> {
  return {
    x: point.x,
    y: point.y,
    rotation: rotation,
    config: {
      dim: light.radiusMeters / metersPerSceneUnit(grid.units),
      bright: 0,
      angle: light.angle ?? 360,
      ...(light.color ? { color: light.color } : {}),
    },
    flags: heldBy ? { [systemId]: { heldBy } } : {},
  };
}

/** A rotation in degrees from 0 up to 360, 0 for anything else. */
export function normalizedRotation(rotation: unknown): number {
  const degrees = Number(rotation);
  return Number.isFinite(degrees) ? ((degrees % 360) + 360) % 360 : 0;
}

/**
 * Put the spell's light on the scene: the caster clicks a point within range (and sight) of their
 * token, turning a cone of light with the mouse wheel, and it lights the scene there for as long
 * as the spell lasts. The light's radius, angle and color come from the spell behavior's `light`.
 * The active GM creates the AmbientLight, since players may not; the caster gets an effect that
 * ends the light when it expires, and deleting the light ends the effect. Resolves to undefined,
 * leaving Apply clickable, when the placement is cancelled or the spell has no light.
 *
 * @public since 6.2.0
 */
export async function placeLight(scope: SpellApplyScope): Promise<SpellEffectApplied | undefined> {
  const spellName = scope.spell.name ?? "";
  const light = spellLightOf(scope.spell);
  if (!light) {
    logger.warn(`${spellName} has no light to place`);
    return undefined;
  }
  const caster = await summonerToken(scope);
  if (!caster?.parent) {
    ui.notifications?.warn(
      localize("RQG.ChatMessage.SpellCast.Summon.NoCasterToken", { spellName }),
    );
    return undefined;
  }
  const ranged = (scope.spell.system as any).castingRange === SpellRangeEnum.Ranged;
  const placed = await placeUnlessTaken(scope, () =>
    pickSpellLocation(scope, {
      rangeMeters: ranged ? spellRangeInMeters(scope.spell) : undefined,
      requireSight: true,
      rotatable: (light.angle ?? 360) < 360,
    }),
  );
  if (!placed) {
    return undefined;
  }
  const data: CreateSpellLightQueryData = {
    ...applyRequestData(scope),
    casterTokenUuid: caster.uuid ?? "",
    x: placed.x,
    y: placed.y,
    rotation: placed.rotation ?? 0,
  };
  return requestGmWork("rqg.createSpellLight", handleCreateSpellLightQuery, data, spellName);
}

/** Make a spell's light for the placeLight request of a user, on the GM's client. */
export async function handleCreateSpellLightQuery(
  data: CreateSpellLightQueryData,
  { user }: RqgQueryContext,
): Promise<SpellApplyAnswer | undefined> {
  return runApplyRequest(data, user, (scope) => createLightAsGm(scope, data));
}

async function createLightAsGm(
  scope: SpellApplyScope,
  data: CreateSpellLightQueryData,
): Promise<SpellEffectApplied | undefined> {
  const spellName = scope.spell.name ?? "";
  // The radius, angle and color are the spell's, never the request's
  const light = spellLightOf(scope.spell);
  const placed = await casterOnScene(scope, data.casterTokenUuid);
  if (!light || !placed) {
    return undefined;
  }
  const { scene, casterToken, casterActor } = placed;
  const grid = scene.grid;
  const point = { x: Number(data.x), y: Number(data.y) };
  const rect = scene.dimensions.sceneRect;
  if (
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    !rect.contains(point.x, point.y) ||
    ((scope.spell.system as any).castingRange === SpellRangeEnum.Ranged &&
      Math.hypot(
        point.x - (casterToken.x + (casterToken.width * (grid.sizeX ?? grid.size)) / 2),
        point.y - (casterToken.y + (casterToken.height * (grid.sizeY ?? grid.size)) / 2),
      ) > metersToPixels(spellRangeInMeters(scope.spell), grid))
  ) {
    ui.notifications?.warn(localize("RQG.SpellLocation.OutOfRange", { spellName }));
    return undefined;
  }
  const rotation = normalizedRotation(data.rotation);
  const createLight = async (heldBy?: string) =>
    (await scene.createEmbeddedDocuments(
      "AmbientLight",
      [ambientLightData(light, point, rotation, grid, heldBy) as any],
      { keepId: !!heldBy },
    )) as HeldDocument[];
  const duration: SpellEffectDuration | undefined = scope.duration;
  if (!duration) {
    const [created] = await createLight();
    return created ? { outcome: "resolved" } : undefined;
  }
  return createHeldForSpell({
    scope,
    effectParentUuid: casterActor.uuid ?? "",
    duration,
    create: createLight,
  });
}

export function initCreateSpellLightQuery(): void {
  CONFIG.queries["rqg.createSpellLight"] = handleCreateSpellLightQuery;
}

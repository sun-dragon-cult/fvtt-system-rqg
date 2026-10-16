import { localize } from "../util";
import { systemId } from "../config";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { SpellRangeEnum } from "../../data-model/item-data/spell";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import {
  applySpellEffect,
  spellProvenance,
  type SpellApplyScope,
  type SpellEffectApplied,
  type SpellEffectCast,
  type SpellEffectDuration,
} from "./apply-spell-effect";
import { summonerToken } from "./summon";
import { metresToPixels } from "./scene-distance";
import { pickAreaCentre } from "./pick-area-centre";
import { RqgLogger } from "../logging/rqg-logger";

const logger = new RqgLogger("spell-area");

/** The shape of a spell's area, in metres - part of the public API. */
export type SpellAreaShape = { kind: "circle"; radius: number } | { kind: "square"; side: number };

/** How `createArea` makes a spell's area - part of the public API. */
export type SpellAreaOptions = {
  shape: SpellAreaShape;
  /**
   * "pick": the caster clicks the centre, within the spell's range (RBM p.4); "caster": around the
   * caster's token. Defaults to "pick" for Ranged spells and "caster" for the rest (Self, rituals).
   */
  placement?: "pick" | "caster";
  /** How long the area lasts; the spell's own duration when left out, none for null. */
  duration?: SpellEffectDuration | null;
  /** Whether players see the area on the canvas, like a mist; otherwise only on the Regions layer. */
  visible?: boolean;
};

/**
 * What a spell's `onAreaEnter` and `onAreaExit` run with - part of the public API. They run on the
 * active GM's client. `crossed` is false for a token that was already inside when the area was
 * made, so wards can tell crossing the boundary from being there.
 */
export type SpellAreaScope = {
  spell: RqgItem;
  cast: SpellEffectCast;
  region: RegionDocument;
  token: TokenDocument;
  actor: RqgActor;
  crossed: boolean;
};

/** What a player's client sends the GM to make a spell area, since players may not create Regions. */
export type CreateSpellAreaQueryData = {
  spellUuid: string;
  casterTokenUuid: string;
  cast: SpellEffectCast;
  centre: { x: number; y: number };
  shape: SpellAreaShape;
  duration: SpellEffectDuration | null;
  visible: boolean;
};

/** The default casting range (RBM p.4): 160 m for Rune spells, 50 m for spirit magic. */
export function spellRangeInMetres(spell: RqgItem): number {
  return spell.type === ItemTypeEnum.RuneMagic ? 160 : 50;
}

/** How far the area reaches from its centre, in metres - for keeping it inside the range. */
export function areaExtent(shape: SpellAreaShape): number {
  return shape.kind === "circle" ? shape.radius : (shape.side / 2) * Math.SQRT2;
}

function regionShape(
  shape: SpellAreaShape,
  centre: { x: number; y: number },
  scene: Scene,
): Record<string, unknown> {
  const grid = { size: scene.grid.size, distance: scene.grid.distance, units: scene.grid.units };
  if (shape.kind === "circle") {
    return {
      type: "circle",
      x: centre.x,
      y: centre.y,
      radius: metresToPixels(shape.radius, grid),
    };
  }
  const side = metresToPixels(shape.side, grid);
  return {
    type: "rectangle",
    x: centre.x - side / 2,
    y: centre.y - side / 2,
    width: side,
    height: side,
  };
}

/**
 * Make a spell's area as a scene Region with a `spellArea` behavior, and an effect on the caster
 * that it lasts as long as: when that effect ends (it expires, or Dispel Magic removes it), the
 * Region goes, and deleting the Region ends the effect. Players may not create Regions, so the
 * active GM's client makes it; the caster picks the centre on their own client first.
 */
export async function createArea(
  scope: SpellApplyScope,
  options: SpellAreaOptions,
): Promise<SpellEffectApplied | undefined> {
  const spellName = scope.spell.name ?? "";
  const caster = await summonerToken(scope);
  if (!caster?.parent) {
    ui.notifications?.warn(
      localize("RQG.ChatMessage.SpellCast.Summon.NoCasterToken", { spellName }),
    );
    return undefined;
  }
  const ranged = (scope.spell.system as any).castingRange === SpellRangeEnum.Ranged;
  const placement = options.placement ?? (ranged ? "pick" : "caster");
  const centre =
    placement === "pick"
      ? await pickAreaCentre(caster, spellRangeInMetres(scope.spell), options.shape, spellName)
      : caster.object?.center;
  if (!centre) {
    return undefined;
  }
  const data: CreateSpellAreaQueryData = {
    spellUuid: scope.spell.uuid ?? "",
    casterTokenUuid: caster.uuid ?? "",
    cast: scope.cast,
    centre: { x: centre.x, y: centre.y },
    shape: options.shape,
    duration: options.duration === undefined ? (scope.duration ?? null) : options.duration,
    visible: !!options.visible,
  };
  if (game.user?.isGM) {
    return createAreaAsGm(data);
  }
  const gm = game.users?.activeGM;
  if (!gm) {
    ui.notifications?.warn(localize("RQG.ChatMessage.SpellCast.NeedsActiveGm", { spellName }));
    return undefined;
  }
  try {
    return (await gm.query("rqg.createSpellArea", data)) as SpellEffectApplied | undefined;
  } catch (error) {
    logger.warn(
      localize("RQG.ChatMessage.SpellCast.NeedsActiveGm", { spellName }),
      undefined,
      error,
    );
    return undefined;
  }
}

async function createAreaAsGm(
  data: CreateSpellAreaQueryData,
): Promise<SpellEffectApplied | undefined> {
  const [spell, caster] = (await Promise.all([
    fromUuid(data.spellUuid),
    fromUuid(data.casterTokenUuid),
  ])) as [RqgItem | null, TokenDocument | null];
  const scene = caster?.parent;
  const casterActor = caster?.actor as RqgActor | null | undefined;
  if (!spell || !scene || !casterActor) {
    return undefined;
  }
  const provenance = spellProvenance(spell, data.cast);
  const [region] = (await scene.createEmbeddedDocuments("Region", [
    {
      name: spell.name ?? "",
      color: data.visible ? "#bbbbbb" : "#7fb3d5",
      shapes: [regionShape(data.shape, data.centre, scene)],
      visibility: data.visible
        ? CONST.REGION_VISIBILITY.ALWAYS
        : CONST.REGION_VISIBILITY.LAYER_UNLOCKED,
      behaviors: [{ name: spell.name ?? "", type: "spellArea", system: { spell: provenance } }],
    } as any,
  ])) as RegionDocument[];
  if (!region) {
    return undefined;
  }
  const [effect] = (await casterActor.createEmbeddedDocuments("ActiveEffect", [
    {
      name: spell.name ?? "",
      img: spell.img ?? undefined,
      duration: data.duration ?? undefined,
      start: { time: game.time?.worldTime ?? 0 },
      flags: { [systemId]: { spellArea: region.uuid } },
      system: { spell: provenance },
    } as any,
  ])) as ActiveEffect[];
  return effect ? { outcome: "applied", effectUuids: [effect.uuid ?? ""] } : undefined;
}

/**
 * Put the spell's effect template on a token in its area, with the usual stacking but no
 * protective spells, since the area isn't cast at the token. Marked so `removeAreaEffect` takes it
 * off again. For `onAreaEnter`.
 */
export async function applyAreaEffect(scope: SpellAreaScope): Promise<void> {
  const applied = await applySpellEffect(
    scope.spell,
    scope.actor,
    scope.token.name ?? scope.actor.name ?? "",
    scope.cast,
    { areaEffect: true },
  );
  if (applied?.outcome !== "applied") {
    return;
  }
  for (const uuid of applied.effectUuids) {
    const effect = (await fromUuid(uuid)) as ActiveEffect | null;
    await effect?.setFlag(systemId, "areaRegion", scope.region.uuid ?? "");
  }
}

/** Take off what `applyAreaEffect` put on a token. For `onAreaExit`. */
export async function removeAreaEffect(
  scope: Pick<SpellAreaScope, "actor" | "region">,
): Promise<void> {
  await deleteAreaEffects(scope.actor, scope.region.uuid ?? "");
}

async function deleteAreaEffects(actor: RqgActor, regionUuid: string): Promise<void> {
  const ids = actor.effects
    .filter((effect) => effect.getFlag(systemId, "areaRegion") === regionUuid)
    .map((effect) => effect.id ?? "");
  if (ids.length) {
    await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  }
}

/** Remove the Region of a spell area once its effect on the caster has ended. */
export async function removeSpellArea(effect: ActiveEffect): Promise<void> {
  const regionUuid = effect.getFlag(systemId, "spellArea") as string | undefined;
  const region = regionUuid ? ((await fromUuid(regionUuid)) as RegionDocument | null) : null;
  if (region?.parent?.regions.has(region.id ?? "")) {
    await region.delete();
  }
}

/**
 * When a spell area's Region is deleted, by the spell ending or by the GM, end the caster's effect
 * and take the area's effects off the tokens it had them on. Runs on the active GM's client.
 */
export function initSpellAreaCleanup(): void {
  Hooks.on("deleteRegion", (region: RegionDocument) => {
    if (!game.users?.activeGM?.isSelf) {
      return;
    }
    const uuid = region.uuid ?? "";
    const actors = new Set<RqgActor>([
      ...((game.actors?.contents ?? []) as RqgActor[]),
      ...((region.parent?.tokens.contents ?? [])
        .map((token) => token.actor)
        .filter((actor) => !!actor) as RqgActor[]),
    ]);
    for (const actor of actors) {
      const anchors = actor.effects
        .filter((effect) => effect.getFlag(systemId, "spellArea") === uuid)
        .map((effect) => effect.id ?? "");
      if (anchors.length) {
        void actor.deleteEmbeddedDocuments("ActiveEffect", anchors);
      }
      void deleteAreaEffects(actor, uuid);
    }
  });
}

export function initCreateSpellAreaQuery(): void {
  CONFIG.queries["rqg.createSpellArea"] = createAreaAsGm;
}

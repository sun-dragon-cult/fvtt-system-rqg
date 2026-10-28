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
import { metersToPixels } from "./scene-distance";
import { placeSpellArea, spellAreaColor, type PlacedAreaShape } from "./place-spell-area";
import { queryActiveGm } from "./run-spell-apply";
import { spellAreaBehavior } from "./spell-across";
import { resolveActorFromUuid } from "../../applications/resistance-roll-dialog/resistance-roll-shared";

/**
 * The shape of a spell's area, in meters - part of the public API. A polygon is clicked corner by
 * corner, like a ward's wands, and may not exceed `maxArea` square meters.
 */
export type SpellAreaShape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number }
  | { kind: "polygon"; corners: number; maxArea: number };

/** How `createArea` makes a spell's area - part of the public API. */
export type SpellAreaOptions = {
  shape: SpellAreaShape;
  /**
   * "pick": the caster places the area, within range for a Ranged spell (RBM p.4) and anywhere for
   * the rest, as a ritual is held where its area is; "caster": a circle or square around the
   * caster's token. Defaults to "pick".
   */
  placement?: "pick" | "caster";
  /**
   * How long the area lasts; the spell's own duration when left out. With a duration the caster
   * gets an effect that ends the area when it expires; null makes an area that lasts until its
   * Region is deleted, like a ward until its wands are removed.
   */
  duration?: SpellEffectDuration | null;
  /** Whether every player sees the area, like a mist; otherwise only the GM and the caster's players. */
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

/**
 * What a spell's `onSpellAcross` runs with - part of the public API. It runs on the active GM's
 * client when `incomingSpell` is cast from outside the area at `targets`, the tokens inside it that
 * it was cast at, once per cast, before their protective spells meet it.
 */
export type SpellAcrossScope = {
  spell: RqgItem;
  cast: SpellEffectCast;
  region: RegionDocument;
  incomingSpell: RqgItem;
  incomingCast: SpellEffectCast;
  targets: TokenDocument[];
};

/** What a player's client sends the GM to make a spell area, since players may not create Regions. */
export type CreateSpellAreaQueryData = {
  spellUuid: string;
  casterTokenUuid: string;
  cast: SpellEffectCast;
  shape: PlacedAreaShape;
  duration: SpellEffectDuration | null;
  visible: boolean;
};

/** The default casting range (RBM p.4): 160 m for Rune spells, 50 m for spirit magic. */
export function spellRangeInMeters(spell: RqgItem): number {
  return spell.type === ItemTypeEnum.RuneMagic ? 160 : 50;
}

/** How far the area reaches from its center, in meters - for keeping it inside the range. */
export function areaExtent(shape: SpellAreaShape): number {
  switch (shape.kind) {
    case "circle":
      return shape.radius;
    case "square":
      return (shape.side / 2) * Math.SQRT2;
    case "polygon":
      // each corner is checked against the range itself
      return 0;
  }
}

function shapeAroundCaster(shape: SpellAreaShape, caster: TokenDocument): PlacedAreaShape {
  const center = caster.getCenterPoint();
  const grid = caster.parent!.grid;
  if (shape.kind === "circle") {
    return {
      type: "circle",
      ...center,
      radius: metersToPixels(shape.radius, grid),
      gridBased: true,
    };
  }
  const side = metersToPixels(
    shape.kind === "square" ? shape.side : Math.sqrt(shape.maxArea),
    grid,
  );
  return {
    type: "rectangle",
    ...center,
    width: side,
    height: side,
    anchorX: 0.5,
    anchorY: 0.5,
    gridBased: true,
  };
}

/**
 * Make a spell's area as a scene Region with a `spellArea` behavior. An area with a duration also
 * gets an effect on the caster that it lasts as long as: when that effect ends (it expires, or
 * Dispel Magic removes it), the Region goes, and deleting the Region ends the effect. Players may
 * not create Regions, so the active GM's client makes it; the caster places it on their own
 * client first.
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
  const shape =
    options.placement === "caster"
      ? shapeAroundCaster(options.shape, caster)
      : await placeSpellArea(
          caster,
          options.shape,
          ranged ? spellRangeInMeters(scope.spell) : undefined,
          spellName,
        );
  if (!shape) {
    return undefined;
  }
  const data: CreateSpellAreaQueryData = {
    spellUuid: scope.spell.uuid ?? "",
    casterTokenUuid: caster.uuid ?? "",
    cast: scope.cast,
    shape: shape,
    duration: options.duration === undefined ? (scope.duration ?? null) : options.duration,
    visible: !!options.visible,
  };
  return game.user?.isGM
    ? createAreaAsGm(data)
    : queryActiveGm("rqg.createSpellArea", data, spellName);
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
  const observers = (game.users?.contents ?? []).filter(
    (user) => !user.isGM && casterActor.testUserPermission(user, "OWNER"),
  );
  const [region] = (await scene.createEmbeddedDocuments("Region", [
    {
      name: spell.name ?? "",
      color: data.visible ? "#bbbbbb" : spellAreaColor,
      shapes: [data.shape],
      highlightMode: "coverage",
      visibility: data.visible ? CONST.REGION_VISIBILITY.ALWAYS : CONST.REGION_VISIBILITY.OBSERVER,
      ownership: {
        default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
        ...Object.fromEntries(
          observers.map((user) => [user.id, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER]),
        ),
      },
      behaviors: [{ name: spell.name ?? "", type: "spellArea", system: { spell: provenance } }],
    } as any,
  ])) as RegionDocument[];
  if (!region) {
    return undefined;
  }
  if (!data.duration) {
    return { outcome: "resolved" };
  }
  const [effect] = (await casterActor.createEmbeddedDocuments("ActiveEffect", [
    {
      name: spell.name ?? "",
      img: spell.img ?? undefined,
      duration: data.duration,
      start: { time: game.time?.worldTime ?? 0 },
      flags: { [systemId]: { spellArea: region.uuid } },
      system: { spell: provenance },
    } as any,
  ])) as ActiveEffect[];
  return effect ? { outcome: "applied", effectUuids: [effect.uuid ?? ""] } : undefined;
}

/**
 * Put the spell's effect template on a token in its area, with the usual stacking but no
 * protective spells, since the area isn't cast at the token. It comes off when the token leaves the
 * area or the area goes. For `onAreaEnter`.
 */
export async function applyAreaEffect(scope: SpellAreaScope): Promise<void> {
  await applySpellEffect(
    scope.spell,
    scope.actor,
    scope.token.name ?? scope.actor.name ?? "",
    scope.cast,
    { areaRegion: scope.region.uuid ?? "" },
  );
}

/** Effects of these spell areas: the caster's (`spellArea`), those put on tokens (`areaRegion`). */
function areaEffectIds(
  actor: RqgActor,
  flags: readonly ("spellArea" | "areaRegion")[],
  regionUuids: ReadonlySet<string>,
): string[] {
  return actor.effects
    .filter((effect) =>
      flags.some((flag) => {
        const uuid = effect.getFlag(systemId, flag);
        return typeof uuid === "string" && regionUuids.has(uuid);
      }),
    )
    .map((effect) => effect.id ?? "");
}

async function deleteEffects(actor: RqgActor, ids: string[]): Promise<void> {
  if (ids.length) {
    await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  }
}

/** Take the effects an area put on a token off it, when it leaves or the area goes. */
export async function removeAreaEffects(actor: RqgActor, regionUuid: string): Promise<void> {
  await deleteEffects(actor, areaEffectIds(actor, ["areaRegion"], new Set([regionUuid])));
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
 * When a spell area's Region is deleted, by the spell ending or by the GM, end the caster's effect;
 * the tokens inside get an exit event, which takes theirs off. A deleted scene takes its unlinked
 * tokens with it and sends no events, so world actors are cleared of its areas' effects. Runs on the
 * active GM's client.
 */
export function initSpellAreaCleanup(): void {
  Hooks.on("deleteRegion", (region: RegionDocument) => {
    const area = spellAreaBehavior(region);
    if (!game.users?.activeGM?.isSelf || !area) {
      return;
    }
    const casterUuid = area.spell.casterUuid;
    const casterActor = casterUuid ? resolveActorFromUuid(casterUuid) : undefined;
    if (casterActor) {
      // Only the anchor: deleting an effect the exit event already took fails the whole batch
      const anchorIds = areaEffectIds(casterActor, ["spellArea"], new Set([region.uuid ?? ""]));
      void deleteEffects(casterActor, anchorIds);
    }
  });
  Hooks.on("deleteScene", (scene: Scene) => {
    if (!game.users?.activeGM?.isSelf) {
      return;
    }
    const uuids = new Set(
      scene.regions.contents.filter((r) => spellAreaBehavior(r)).map((r) => r.uuid ?? ""),
    );
    if (!uuids.size) {
      return;
    }
    for (const actor of (game.actors?.contents ?? []) as RqgActor[]) {
      void deleteEffects(actor, areaEffectIds(actor, ["spellArea", "areaRegion"], uuids));
    }
  });
}

export function initCreateSpellAreaQuery(): void {
  CONFIG.queries["rqg.createSpellArea"] = createAreaAsGm;
}

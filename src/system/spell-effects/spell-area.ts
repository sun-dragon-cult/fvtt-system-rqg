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
import { summonerToken } from "./token-cells";
import { actorRefUuid } from "../../data-model/shared/actor-ref";
import { metersToPixels } from "./scene-distance";
import { placeSpellArea, spellAreaColor, type PlacedAreaShape } from "./place-spell-area";
import { queryActiveGm } from "./run-spell-apply";
import { createAnchored } from "./spell-anchor";
import {
  applyRequestData,
  runApplyRequest,
  type SpellApplyRequestData,
} from "./spell-apply-request";
import { spellAreaBehavior } from "./spell-across";

/**
 * The shape of a spell's area, in meters. A polygon is clicked corner by
 * corner, like a ward's wands, and may not exceed `maxArea` square meters.
 *
 * @public since 6.2.0
 */
export type SpellAreaShape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number }
  | { kind: "polygon"; corners: number; maxArea: number };

/**
 * How `createArea` makes a spell's area.
 *
 * @public since 6.2.0
 */
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
 * What a spell's `onAreaEnter` and `onAreaExit` run with. They run on the
 * active GM's client. `crossed` is false for a token that was already inside when the area was
 * made, so wards can tell crossing the boundary from being there.
 *
 * @public since 6.2.0
 */
export type SpellAreaScope = {
  spell: RqgItem;
  cast: SpellEffectCast;
  region: RegionDocument;
  token: TokenDocument;
  actor: RqgActor;
  crossed: boolean;
};

/** What any Region behavior's `onSpellAcross` runs with. */
export type SpellAcrossRegionScope = {
  region: RegionDocument;
  behavior: RegionBehavior;
  incomingSpell: RqgItem;
  incomingCast: SpellEffectCast;
  targets: TokenDocument[];
};

/**
 * What a spell's `onSpellAcross` runs with. It runs on the active GM's
 * client when `incomingSpell` is cast from outside the area at `targets`, the tokens inside it that
 * it was cast at, once per cast, before their protective spells meet it.
 *
 * @public since 6.2.0
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
export type CreateSpellAreaQueryData = SpellApplyRequestData & {
  /** The caster's token the area was placed from. */
  casterTokenUuid: string;
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
 *
 * @public since 6.2.0
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
    ...applyRequestData(scope),
    casterTokenUuid: caster.uuid ?? "",
    shape: shape,
    duration: options.duration === undefined ? (scope.duration ?? null) : options.duration,
    visible: !!options.visible,
  };
  return game.users?.activeGM?.isSelf && game.user
    ? handleCreateSpellAreaQuery(data, { user: game.user })
    : queryActiveGm("rqg.createSpellArea", data, spellName);
}

/** Make a spell area for the createArea request of a user, on the GM's client. */
export async function handleCreateSpellAreaQuery(
  data: CreateSpellAreaQueryData,
  { user }: RqgQueryContext,
): Promise<SpellEffectApplied | undefined> {
  return runApplyRequest(data, user, (scope) => createAreaAsGm(scope, data));
}

async function createAreaAsGm(
  scope: SpellApplyScope,
  data: CreateSpellAreaQueryData,
): Promise<SpellEffectApplied | undefined> {
  const spell = scope.spell;
  const casterUuid = actorRefUuid(scope.cast.caster);
  const [caster, expected] = (await Promise.all([
    fromUuid(data.casterTokenUuid),
    casterUuid ? fromUuid(casterUuid) : scope.targetActor,
  ])) as [TokenDocument | null, { uuid?: string } | null];
  const scene = caster?.parent;
  const casterActor = caster?.actor as RqgActor | null | undefined;
  // The token placed from must be the one summonerToken found for this cast on the client
  const isCasterToken =
    !!expected?.uuid && (caster?.uuid === expected.uuid || casterActor?.uuid === expected.uuid);
  if (!scene || !casterActor || !isCasterToken) {
    return undefined;
  }
  const provenance = spellProvenance(spell, scope.cast);
  const observers = (game.users?.contents ?? []).filter(
    (user) => !user.isGM && casterActor.testUserPermission(user, "OWNER"),
  );
  const createRegion = async (heldBy?: string) =>
    (await scene.createEmbeddedDocuments("Region", [
      {
        name: spell.name ?? "",
        color: data.visible ? "#bbbbbb" : spellAreaColor,
        shapes: [data.shape],
        highlightMode: "coverage",
        visibility: data.visible
          ? CONST.REGION_VISIBILITY.ALWAYS
          : CONST.REGION_VISIBILITY.OBSERVER,
        ownership: {
          default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
          ...Object.fromEntries(
            observers.map((user) => [user.id, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER]),
          ),
        },
        behaviors: [{ name: spell.name ?? "", type: "spellArea", system: { spell: provenance } }],
        flags: heldBy ? { [systemId]: { heldBy } } : {},
      } as any,
    ])) as RegionDocument[];
  if (!data.duration) {
    const [region] = await createRegion();
    return region ? { outcome: "resolved" } : undefined;
  }
  // Without a caster (token HUD "+") the effect is on the target's actor
  const anchored = await createAnchored({
    effectParentUuid: casterActor.uuid ?? "",
    effectData: {
      name: spell.name ?? "",
      img: spell.img ?? undefined,
      duration: data.duration,
      start: { time: game.time?.worldTime ?? 0 },
      system: { spell: provenance },
    },
    create: async (heldBy) => (await createRegion(heldBy)) as any[],
  });
  return anchored ? { outcome: "applied", effectUuids: [anchored.effect.uuid] } : undefined;
}

/**
 * Put the spell's effect template on a token in its area, with the usual stacking but no
 * protective spells, since the area isn't cast at the token. It comes off when the token leaves the
 * area or the area goes. For `onAreaEnter`.
 *
 * @public since 6.2.0
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

/** The effects these spell areas put on tokens inside them (`areaRegion`). */
function areaEffectIds(actor: RqgActor, regionUuids: ReadonlySet<string>): string[] {
  return actor.effects
    .filter((effect) => {
      const uuid = effect.getFlag(systemId, "areaRegion");
      return typeof uuid === "string" && regionUuids.has(uuid);
    })
    .map((effect) => effect.id ?? "");
}

async function deleteEffects(actor: RqgActor, ids: string[]): Promise<void> {
  if (ids.length) {
    await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  }
}

/** Take the effects an area put on a token off it, when it leaves or the area goes. */
export async function removeAreaEffects(actor: RqgActor, regionUuid: string): Promise<void> {
  await deleteEffects(actor, areaEffectIds(actor, new Set([regionUuid])));
}

/**
 * A deleted scene takes its unlinked tokens with it and sends no exit events, so world actors are
 * cleared of its areas' effects. Runs on the active GM's client. The caster's effect that keeps an
 * area alive is `spell-anchor`'s.
 */
export function initSpellAreaCleanup(): void {
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
      void deleteEffects(actor, areaEffectIds(actor, uuids));
    }
  });
}

export function initCreateSpellAreaQuery(): void {
  CONFIG.queries["rqg.createSpellArea"] = handleCreateSpellAreaQuery;
}

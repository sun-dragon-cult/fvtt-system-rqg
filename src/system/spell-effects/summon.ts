import { hasActiveGm, localize } from "../util";
import { systemId } from "../config";
import { Rqid } from "../api/rqid-api";
import {
  spellProvenance,
  type SpellEffectApplied,
  type SpellEffectDuration,
  type SpellApplyScope,
} from "./apply-spell-effect";
import { casterTokenOnScene } from "./spell-area-targets";
import { placeSummonedToken } from "./place-summoned-token";
import { queryActiveGm } from "./query-active-gm";
import {
  applyRequestData,
  runApplyRequest,
  type SpellApplyRequestData,
} from "./spell-apply-request";
import {
  nearestFreeCell,
  summonedTokenCells,
  summonerToken,
  tokenCell,
  type GridRect,
} from "./token-cells";
import type { RqgActor } from "@actors/rqg-actor.ts";

type Point = { x: number; y: number };

async function summonedFolder(): Promise<Folder | undefined> {
  const name = localize("RQG.ChatMessage.SpellCast.Summon.Folder");
  const existing = game.folders?.find((folder) => folder.type === "Actor" && folder.name === name);
  return existing ?? (await Folder.implementation.create({ name: name, type: "Actor" }));
}

/** The world copy of the actor, imported from its compendium the first time it's summoned. */
async function worldActor(actorRqid: string): Promise<Actor | undefined> {
  // silent: the caller explains what to create instead
  const actor = await Rqid.fromRqid(actorRqid, undefined, true);
  if (!(actor instanceof Actor)) {
    return undefined;
  }
  if (!actor.pack) {
    return actor;
  }
  const data: any = game.actors?.fromCompendium(actor as any);
  data.folder = (await summonedFolder())?.id;
  return (await Actor.implementation.create(data)) as Actor | undefined;
}

/**
 * The options of `spellEffects.summon`.
 *
 * @public since 6.2.0
 */
export type SummonOptions = {
  /** The summoning's icon on the token, the spell's own by default. */
  img?: string;
  /** How long the summoning lasts, the scope's Temporal duration by default. */
  duration?: SpellEffectDuration;
  /**
   * The body's footprint in meters, e.g. 1x3 for a medium elemental (RBM p.90). The token is round
   * with the same ground area, rounded up to whole squares, so it follows the scene's grid scale;
   * the actor's own token size by default.
   */
  footprintMeters?: { w: number; h: number };
};

/** What a player's client sends the GM to make a summoned token, since players may not create them. */
export type SummonQueryData = SpellApplyRequestData & {
  actorRqid: string;
  options: SummonOptions;
  /** The top left corner of the token's place, or null to put it next to the summoner. */
  position: Point | null;
};

/** The token size in grid squares, from the options' footprint in meters or else the actor's own. */
function summonedFootprint(
  options: SummonOptions,
  grid: Scene["grid"],
  actorSize: { w: number; h: number },
): { w: number; h: number } {
  if (!options.footprintMeters) {
    return actorSize;
  }
  const cells = summonedTokenCells(options.footprintMeters, grid.distance, grid.isGridless);
  return { w: cells, h: cells };
}

/**
 * Summon the actor with this rqid. The user who applies the spell places the token with Foundry's
 * own token placement, within range and sight of the caster (RBM p.6). Without a caster token on
 * the viewed scene that the user owns, or without a caster (token HUD "+"), it goes on the nearest
 * free cell next to the summoner. The active GM creates the token, importing the actor into a Summoned folder the
 * first time, and gives it an effect carrying the spell's provenance that removes it when the
 * summoning ends (RBM p.90). Resolves to undefined, leaving Apply clickable, when the placement is
 * cancelled.
 *
 * @public since 6.2.0
 */
export async function summon(
  scope: SpellApplyScope,
  actorRqid: string,
  options: SummonOptions = {},
): Promise<SpellEffectApplied | undefined> {
  const spellName = scope.spell.name ?? "";
  if (!game.user?.isGM && !hasActiveGm(spellName)) {
    return undefined;
  }
  const summoner = await summonerToken(scope);
  let position: Point | null = null;
  const casterOnScene =
    scope.cast.caster && summoner?.isOwner
      ? casterTokenOnScene(summoner, summoner.actor as RqgActor)
      : undefined;
  if (casterOnScene) {
    const actor = await Rqid.fromRqid(actorRqid, undefined, true);
    if (actor instanceof Actor) {
      const placed = await placeSummonedToken(
        scope,
        casterOnScene,
        actor,
        summonedFootprint(options, summoner!.parent!.grid, {
          w: actor.prototypeToken.width,
          h: actor.prototypeToken.height,
        }),
      );
      if (!placed) {
        return undefined;
      }
      position = placed;
    }
  }
  const data: SummonQueryData = {
    ...applyRequestData(scope),
    actorRqid: actorRqid,
    options: options,
    position: position,
  };
  return game.users?.activeGM?.isSelf && game.user
    ? handleSummonQuery(data, { user: game.user })
    : queryActiveGm("rqg.summon", data, spellName);
}

/** Make a summoned token for the summon request of a user, on the GM's client. */
export async function handleSummonQuery(
  data: SummonQueryData,
  { user }: RqgQueryContext,
): Promise<SpellEffectApplied | undefined> {
  return runApplyRequest(data, user, (scope) => summonAsGm(scope, data));
}

async function summonAsGm(
  scope: SpellApplyScope,
  data: SummonQueryData,
): Promise<SpellEffectApplied | undefined> {
  const { actorRqid, options } = data;
  const spellName = scope.spell.name ?? "";
  const summoner = await summonerToken(scope);
  const scene = summoner?.parent;
  if (!summoner || !scene) {
    ui.notifications?.warn(
      localize("RQG.ChatMessage.SpellCast.Summon.NoCasterToken", { spellName }),
    );
    return undefined;
  }
  const actor = await worldActor(actorRqid);
  if (!actor) {
    ui.notifications?.warn(
      localize("RQG.ChatMessage.SpellCast.Summon.NoActor", { spellName, rqid: actorRqid }),
    );
    return undefined;
  }

  const grid = scene.grid;
  const size = summonedFootprint(options, grid, {
    w: actor.prototypeToken.width,
    h: actor.prototypeToken.height,
  });
  // Where the user placed it, exactly; else the free cell nearest the summoner
  let position: Point | undefined = data.position ?? undefined;
  if (!position) {
    if (grid.isGridless) {
      position = { x: summoner.x + summoner.width * grid.size, y: summoner.y };
    } else {
      const occupied: GridRect[] = scene.tokens.contents.map((token) => tokenCell(grid, token));
      const cell = nearestFreeCell(tokenCell(grid, summoner), size, occupied);
      position = cell ? grid.getTopLeftPoint({ i: cell.row, j: cell.col }) : undefined;
    }
  }
  if (!position) {
    ui.notifications?.warn(
      localize("RQG.ChatMessage.SpellCast.Summon.NoRoom", {
        spellName,
        casterName: summoner.name ?? "",
      }),
    );
    return undefined;
  }
  const tokenData = await actor.getTokenDocument(
    {
      x: position.x,
      y: position.y,
      width: size.w,
      height: size.h,
      actorLink: false,
      disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
    },
    { parent: scene },
  );
  const [token] = (await scene.createEmbeddedDocuments("Token", [tokenData.toObject()])) ?? [];
  const [effect] =
    (await token?.actor?.createEmbeddedDocuments("ActiveEffect", [
      {
        name: spellName,
        img: options.img ?? scope.spell.img ?? undefined,
        duration: options.duration ?? scope.duration,
        start: { time: game.time?.worldTime ?? 0 },
        flags: { rqg: { summoning: true } },
        system: { spell: spellProvenance(scope.spell, scope.cast) },
      } as any,
    ])) ?? [];
  if (!effect) {
    return undefined;
  }
  ui.notifications?.info(
    localize("RQG.ChatMessage.SpellCast.Summon.Summoned", {
      spellName,
      summonedName: token?.name ?? "",
    }),
  );
  return { outcome: "applied", effectUuids: [effect.uuid] };
}

export function initSummonQuery(): void {
  CONFIG.queries["rqg.summon"] = handleSummonQuery;
}

/** Remove the token of a summoning made by `summon` once its effect has ended. */
export async function removeSummonedToken(effect: ActiveEffect): Promise<void> {
  const actor = effect.parent;
  if (!effect.getFlag(systemId, "summoning") || !(actor instanceof Actor) || !actor.isToken) {
    return;
  }
  const token = actor.token;
  // Deleting the token itself also takes its effects with it
  if (token?.id && token.parent?.tokens.has(token.id)) {
    await token.delete();
  }
}

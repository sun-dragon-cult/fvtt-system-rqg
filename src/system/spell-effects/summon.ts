import { localize } from "../util";
import { Rqid } from "../api/rqid-api";
import {
  spellProvenance,
  type SpellEffectApplied,
  type SpellEffectDuration,
  type SpellApplyScope,
} from "./apply-spell-effect";

type GridRect = { col: number; row: number; w: number; h: number };

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

/** The token to summon next to: the caster's, or without a caster (token HUD "+") the target's. */
async function summonerToken(scope: SpellApplyScope): Promise<TokenDocument | undefined> {
  const summoner: any = scope.cast.casterUuid
    ? await fromUuid(scope.cast.casterUuid)
    : scope.targetActor;
  if (summoner instanceof TokenDocument) {
    return summoner;
  }
  return summoner?.isToken ? summoner.token : summoner?.getActiveTokens?.(false, true)[0];
}

async function summonedFolder(): Promise<Folder | undefined> {
  const name = localize("RQG.ChatMessage.SpellCast.Summon.Folder");
  const existing = game.folders?.find((folder) => folder.type === "Actor" && folder.name === name);
  return existing ?? (await Folder.implementation.create({ name: name, type: "Actor" }));
}

/** The world copy of the actor, imported from its compendium the first time it's summoned. */
async function worldActor(actorRqid: string): Promise<Actor | undefined> {
  const actor = await Rqid.fromRqid(actorRqid);
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

function gridRect(token: TokenDocument, gridSize: number): GridRect {
  return { col: token.x / gridSize, row: token.y / gridSize, w: token.width, h: token.height };
}

export type SummonOptions = {
  /** The summoning's icon on the token, the spell's own by default. */
  img?: string;
  /** How long the summoning lasts, the scope's Temporal duration by default. */
  duration?: SpellEffectDuration;
};

/**
 * Place an unlinked token of the actor with this rqid on the nearest free cell next to the caster,
 * importing the actor into a Summoned folder the first time. The token gets an effect carrying the
 * spell's provenance. Creates tokens, so the behaviour calling it needs `runAsGm`, and its `onEnd`
 * should be `removeSummonedToken`.
 */
export async function summon(
  scope: SpellApplyScope,
  actorRqid: string,
  options: SummonOptions = {},
): Promise<SpellEffectApplied | undefined> {
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

  const gridSize = scene.grid.size;
  const cell = nearestFreeCell(
    gridRect(summoner, gridSize),
    { w: actor.prototypeToken.width, h: actor.prototypeToken.height },
    scene.tokens.contents.map((token) => gridRect(token, gridSize)),
  );
  if (!cell) {
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
      x: cell.col * gridSize,
      y: cell.row * gridSize,
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
      casterName: summoner.name ?? "",
    }),
  );
  return { outcome: "applied", effectUuids: [effect.uuid] };
}

import {
  spellProvenance,
  type SpellApplyScope,
  type SpellEffectApplied,
  type SpellEffectDuration,
} from "./apply-spell-effect";
import { createAnchored, type HeldDocument } from "./spell-anchor";
import { summonerDocument } from "./token-cells";
import type { RqgActor } from "@actors/rqg-actor.ts";

/**
 * The scene and actor a spell makes something on, from the caster's token that a client placed it
 * from. The token must be the caster's (summonerToken's); which of a linked caster's tokens depends
 * on the scene the placing client views, so any of them will do.
 */
export async function casterOnScene(
  scope: SpellApplyScope,
  casterTokenUuid: string,
): Promise<{ scene: Scene; casterToken: TokenDocument; casterActor: RqgActor } | undefined> {
  const [casterToken, expected] = (await Promise.all([
    fromUuid(casterTokenUuid),
    summonerDocument(scope),
  ])) as [TokenDocument | null, { uuid?: string } | null];
  const scene = casterToken?.parent;
  const casterActor = casterToken?.actor as RqgActor | null | undefined;
  const isCasterToken =
    !!expected?.uuid &&
    (casterToken?.uuid === expected.uuid || casterActor?.uuid === expected.uuid);
  return scene && casterActor && isCasterToken ? { scene, casterToken, casterActor } : undefined;
}

/**
 * Make documents on a scene that a spell effect holds while it lasts (see `createAnchored`): the
 * effect is on `effectParentUuid`, carries the spell's provenance and ends them when it ends.
 */
export async function createHeldForSpell(params: {
  scope: SpellApplyScope;
  effectParentUuid: string;
  duration: SpellEffectDuration | undefined | null;
  /** The effect's icon, the spell's own by default. */
  img?: string | undefined;
  create: (heldBy: string) => Promise<HeldDocument[]>;
}): Promise<SpellEffectApplied | undefined> {
  const { scope } = params;
  const anchored = await createAnchored({
    effectParentUuid: params.effectParentUuid,
    effectData: {
      name: scope.spell.name ?? "",
      img: params.img ?? scope.spell.img ?? undefined,
      duration: params.duration,
      start: { time: game.time?.worldTime ?? 0 },
      system: { spell: spellProvenance(scope.spell, scope.cast) },
    },
    create: params.create,
  });
  return anchored ? { outcome: "applied", effectUuids: [anchored.effect.uuid] } : undefined;
}

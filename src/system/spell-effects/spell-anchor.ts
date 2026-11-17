import { systemId } from "../config";
import { RqgLogger } from "../logging/rqg-logger";

const logger = new RqgLogger("SpellAnchor", { notify: false });

/**
 * Something a spell effect keeps alive while it lasts, recorded on the effect as `holds`: a
 * document it made, e.g. a spell area's Region or a summoned token. The held document names its
 * effect in `heldBy`.
 */
export type SpellHold = { kind: "document"; uuid: string };

/** A document a spell effect keeps alive. */
export type HeldDocument = RegionDocument | TokenDocument;

type AnchorEffect = ActiveEffect & { uuid: string };

export function holdsOf(effect: ActiveEffect): SpellHold[] {
  const holds = effect.getFlag?.(systemId, "holds") as SpellHold[] | undefined;
  return Array.isArray(holds) ? holds : [];
}

function heldByOf(document: HeldDocument): string {
  // The union's getFlag overloads don't combine; both read the same SpellHeldFlags
  const heldBy = (document as RegionDocument).getFlag(systemId, "heldBy");
  return typeof heldBy === "string" ? heldBy : "";
}

/** Whether an effect keeps a spell area's Region alive: a caster's area anchor, not a spell on them. */
export function holdsRegion(effect: ActiveEffect): boolean {
  return holdsOf(effect).some((hold) => hold.uuid.includes(".Region."));
}

function existing<T = HeldDocument>(uuid: string): T | undefined {
  return ((uuid ? fromUuidSync(uuid, { strict: false }) : null) ?? undefined) as T | undefined;
}

/**
 * Delete documents, skipping those already gone (deleting one that's gone fails the batch), with
 * one request per scene and document type; one scene's failure doesn't stop the others.
 */
async function deleteAll(documents: readonly HeldDocument[]): Promise<void> {
  const batches = new Map<string, { scene: Scene; type: "Region" | "Token"; ids: Set<string> }>();
  for (const document of documents) {
    const scene = document.parent;
    if (!scene) {
      continue;
    }
    const type = document.documentName as "Region" | "Token";
    const key = `${scene.uuid}.${type}`;
    const batch = batches.get(key) ?? { scene, type, ids: new Set<string>() };
    batch.ids.add(document.id ?? "");
    batches.set(key, batch);
  }
  // Checked again right before each request, since deleting one batch can delete others' documents
  const results = await Promise.allSettled(
    [...batches.values()].map(({ scene, type, ids }) => {
      const left = [...ids].filter((id) => scene.getEmbeddedCollection(type).has(id));
      return left.length ? scene.deleteEmbeddedDocuments(type, left) : undefined;
    }),
  );
  for (const result of results) {
    if (result.status === "rejected") {
      logger.warn("Could not delete what a spell effect held", undefined, result.reason);
    }
  }
}

/**
 * Make documents a spell effect keeps alive, then the effect that holds them, on the document with
 * `effectParentUuid` (which `create` may make, e.g. a summoned token's actor). `create` gets the
 * effect's uuid to put in each document's `heldBy` flag, and creates them with `keepId` (and their
 * own `_id`) so the flag stays: other creations are copies, which drop it. When the effect can't be written, the
 * documents are deleted again, so none is left without an effect to end it.
 */
export async function createAnchored(params: {
  effectParentUuid: string;
  /** The effect's data, without flags. */
  effectData: Record<string, unknown>;
  create: (heldBy: string) => Promise<HeldDocument[]>;
}): Promise<{ effect: AnchorEffect; held: HeldDocument[] } | undefined> {
  const effectId = foundry.utils.randomID();
  const held = await params.create(`${params.effectParentUuid}.ActiveEffect.${effectId}`);
  if (!held.length) {
    return undefined;
  }
  let effect: AnchorEffect | undefined;
  try {
    const parent = existing<Actor>(params.effectParentUuid);
    const holds = held.map((d): SpellHold => ({ kind: "document", uuid: d.uuid ?? "" }));
    const effectData = { ...params.effectData, _id: effectId, flags: { [systemId]: { holds } } };
    [effect] = ((await parent?.createEmbeddedDocuments("ActiveEffect", [effectData as any], {
      keepId: true,
    })) ?? []) as AnchorEffect[];
  } catch (error) {
    logger.warn("Could not write a spell effect's anchor", undefined, error);
  }
  if (!effect) {
    await deleteAll(held);
    return undefined;
  }
  return { effect, held };
}

/** The document an effect holds, while it exists and names that effect (not a pasted copy). */
function heldDocument(effectUuid: string, hold: SpellHold): HeldDocument | undefined {
  const document = existing(hold.uuid);
  return document && heldByOf(document) === effectUuid ? document : undefined;
}

/**
 * Delete what an ended effect kept alive. True when it deleted something, whose cleanup then ends
 * the effect: a held document's deletion deletes its effect.
 */
export async function releaseHeld(effect: ActiveEffect): Promise<boolean> {
  const uuid = effect.uuid ?? "";
  const documents = holdsOf(effect).flatMap((hold) => heldDocument(uuid, hold) ?? []);
  await deleteAll(documents);
  return documents.length > 0;
}

/** End the effect that kept a deleted document alive. */
async function endHolder(document: HeldDocument): Promise<void> {
  const effect = existing<AnchorEffect>(heldByOf(document));
  if (effect && holdsOf(effect).some((hold) => hold.uuid === document.uuid)) {
    await effect.delete();
  }
}

const allScenes = (): Scene[] => game.scenes?.contents ?? [];

/** The Regions and tokens of a scene: what a spell effect can hold. */
const sceneDocuments = (scene: Scene): HeldDocument[] => [
  ...scene.regions.contents,
  ...scene.tokens.contents,
];

/** Every document on a scene that a spell effect keeps alive. */
function heldDocuments(): HeldDocument[] {
  return allScenes().flatMap((scene) => sceneDocuments(scene).filter((d) => !!heldByOf(d)));
}

type EffectSource = { flags?: Record<string, Record<string, unknown> | undefined> };

/** The source of the effects an unlinked token's delta adds, read without building its actor. */
function deltaEffects(token: TokenDocument): EffectSource[] {
  return ((token as any).delta?._source?.effects ?? []) as EffectSource[];
}

const sourceFlag = (source: object, key: string): unknown =>
  foundry.utils.getProperty(source, `flags.${systemId}.${key}`);

const sourceHolds = (effect: EffectSource) =>
  !!(sourceFlag(effect, "holds") as unknown[] | undefined)?.length;

/**
 * Every actor whose effects can hold documents or come from an area: world actors, and the actors
 * of unlinked tokens with such an effect.
 */
function anchorActors(): Actor[] {
  const tokenActors = allScenes().flatMap((scene) =>
    scene.tokens.contents.flatMap((token) =>
      !token.actorLink &&
      deltaEffects(token).some((e) => sourceHolds(e) || !!sourceFlag(e, "areaRegion")) &&
      token.actor
        ? [token.actor]
        : [],
    ),
  );
  return [...(game.actors?.contents ?? []), ...tokenActors] as Actor[];
}

/** Delete the held documents whose effect is gone, e.g. with the token or actor it was on. */
async function deleteOrphans(): Promise<void> {
  await deleteAll(heldDocuments().filter((document) => !existing(heldByOf(document))));
}

/**
 * Whether the caster of the spell that made an anchor effect is gone. A summoning's effect is on
 * the summoned token, not the caster, so it ends this way when the caster's actor is deleted, or
 * an unlinked caster's token or world actor.
 */
function casterGone(effect: ActiveEffect): boolean {
  const caster = (
    effect.system as { spell?: { caster?: { actorUuid?: string; tokenUuid?: string } } } | null
  )?.spell?.caster;
  if (caster?.actorUuid && !existing(caster.actorUuid)) {
    return true;
  }
  // An unlinked token keeps its built actor for a while after the world actor is deleted
  const token = caster?.tokenUuid ? existing<TokenDocument>(caster.tokenUuid) : undefined;
  return !!token && !token.actorLink && !token.baseActor;
}

/** Delete these effects of an actor, skipping those gone meanwhile; logs a failure. */
async function deleteEffects(actor: Actor, effects: readonly ActiveEffect[]): Promise<void> {
  const ids = [...new Set(effects.map((effect) => effect.id ?? ""))].filter((id) =>
    actor.effects.has(id),
  );
  try {
    if (ids.length) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
    }
  } catch (error) {
    logger.warn("Could not end an actor's spell effects", undefined, actor.uuid, error);
  }
}

/** End the anchor effects whose caster is gone, which deletes what they held. */
async function endCasterless(): Promise<void> {
  for (const actor of anchorActors()) {
    const ended = actor.effects.contents.filter(
      (effect) => holdsOf(effect).length > 0 && casterGone(effect),
    );
    await deleteEffects(actor, ended);
  }
}

/**
 * Bring spell-held state in line after something happened without the active GM's cleanup, e.g.
 * while no GM was logged in: delete held documents whose effect is gone, end effects one of whose
 * held documents is gone (as deleting it would have) or whose caster is gone, and take an area's
 * effect off a token whose area is gone or that isn't in it any more.
 */
export async function reconcileSpellAnchors(): Promise<void> {
  await deleteOrphans();
  for (const actor of anchorActors()) {
    const ended = actor.effects.contents.filter(
      (effect) =>
        holdsOf(effect).some((hold) => !heldDocument(effect.uuid ?? "", hold)) ||
        (holdsOf(effect).length > 0 && casterGone(effect)),
    );
    const leftArea = actor.effects.contents.filter((effect) => !isInArea(actor, effect));
    // A deleted Region's exit events may take some of these off meanwhile
    await deleteEffects(actor, [...ended, ...leftArea]);
  }
}

/** False for an effect an area put on a token that is no longer in that area. */
function isInArea(actor: Actor, effect: ActiveEffect): boolean {
  const regionUuid = effect.getFlag?.(systemId, "areaRegion");
  if (typeof regionUuid !== "string" || !regionUuid) {
    return true;
  }
  const region = existing<RegionDocument>(regionUuid);
  if (!region) {
    return false;
  }
  return [...region.tokens].some((token) =>
    actor.isToken ? token === actor.token : token.actorLink && token.actorId === actor.id,
  );
}

const isActiveGm = () => !!game.users?.activeGM?.isSelf;

function logFailure(error: unknown): void {
  logger.warn("Could not clean up what a spell effect held", undefined, error);
}

/**
 * Keep spell-held documents and their effects together, on the active GM's client: deleting a held
 * document ends its effect, deleting the actor, token or scene an effect was on deletes what it
 * held, and the GM's `ready` reconciles what changed while no GM could. On every client, a Region
 * or token copied from a held one (pasted, in a duplicated or imported scene) isn't held.
 */
export function initSpellAnchors(): void {
  const heldDeleted = (document: HeldDocument) => {
    if (isActiveGm() && heldByOf(document)) {
      endHolder(document).catch(logFailure);
    }
  };
  // What an effect on a deleted token, actor or scene held is left without it
  const holderDeleted = () => {
    if (isActiveGm()) {
      Promise.all([deleteOrphans(), endCasterless()]).catch(logFailure);
    }
  };
  Hooks.on("deleteRegion", (region) => heldDeleted(region));
  Hooks.on("deleteToken", (token) => {
    heldDeleted(token);
    holderDeleted();
  });
  Hooks.on("deleteActor", () => holderDeleted());
  Hooks.on("deleteScene", (scene) => {
    // A deleted scene sends no events for what was on it
    sceneDocuments(scene).forEach(heldDeleted);
    holderDeleted();
  });

  // createAnchored, undo and an Adventure import create a document with its own uuid, which its
  // effect holds; any other creation is a copy
  const dropCopiedHeldBy = (document: HeldDocument, options: { keepId?: boolean }) => {
    if (!options.keepId && heldByOf(document)) {
      document.updateSource({ flags: { [systemId]: { heldBy: "" } } });
    }
  };
  Hooks.on("preCreateRegion", (region, _data, options) => dropCopiedHeldBy(region, options));
  Hooks.on("preCreateToken", (token, _data, options) => dropCopiedHeldBy(token, options));
  // A new scene's Regions and tokens share its source, so clearing theirs clears the scene's
  Hooks.on("preCreateScene", (scene, _data, options) => {
    sceneDocuments(scene).forEach((document) => dropCopiedHeldBy(document, options));
  });

  Hooks.once("ready", () => {
    if (isActiveGm()) {
      reconcileSpellAnchors().catch(logFailure);
    }
  });
}

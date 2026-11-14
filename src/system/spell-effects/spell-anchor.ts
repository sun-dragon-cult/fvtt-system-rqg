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

/** The creation option that keeps `heldBy` on a created Region or token; any other copy drops it. */
export const anchoredCreation = { rqgAnchored: true } as const;

type AnchorEffect = ActiveEffect & { uuid: string };

export function holdsOf(effect: ActiveEffect): SpellHold[] {
  const holds = effect.getFlag?.(systemId, "holds") as SpellHold[] | undefined;
  return Array.isArray(holds) ? holds : [];
}

export function heldByOf(document: HeldDocument): string {
  // The union's getFlag overloads don't combine; both read the same SpellHeldFlags
  const heldBy = (document as RegionDocument).getFlag(systemId, "heldBy");
  return typeof heldBy === "string" ? heldBy : "";
}

/** Whether an effect keeps a spell area's Region alive: a caster's area anchor, not a spell on them. */
export function holdsRegion(effect: ActiveEffect): boolean {
  return holdsOf(effect).some((hold) => hold.uuid.split(".").at(-2) === "Region");
}

function existing<T = HeldDocument>(uuid: string): T | undefined {
  return ((uuid ? fromUuidSync(uuid, { strict: false }) : null) ?? undefined) as T | undefined;
}

/**
 * Delete documents, skipping those already gone (deleting one that's gone fails the batch), with
 * one request per scene and document type.
 */
async function deleteAll(documents: readonly HeldDocument[]): Promise<void> {
  const batches = new Map<string, { scene: Scene; type: "Region" | "Token"; ids: string[] }>();
  for (const document of documents) {
    const scene = document.parent;
    if (!scene || !existing(document.uuid ?? "")) {
      continue;
    }
    const type = document.documentName as "Region" | "Token";
    const key = `${scene.uuid}.${type}`;
    const batch = batches.get(key) ?? { scene, type, ids: [] };
    batch.ids.push(document.id ?? "");
    batches.set(key, batch);
  }
  for (const { scene, type, ids } of batches.values()) {
    await scene.deleteEmbeddedDocuments(type, [...new Set(ids)]);
  }
}

/**
 * Make documents a spell effect keeps alive, then the effect that holds them, on the document with
 * `effectParentUuid` (which `create` may make, e.g. a summoned token's actor). `create` gets the
 * effect's uuid to put in each document's `heldBy` flag, and creates them with `anchoredCreation`
 * among its options so the flag stays. When the effect can't be written, the
 * documents are deleted again, so none is left without an effect to end it.
 */
export async function createAnchored(params: {
  effectParentUuid: string;
  /** The effect's data, without flags. */
  effectData: Record<string, unknown>;
  create: (heldBy: string) => Promise<HeldDocument[]>;
}): Promise<{ effect: AnchorEffect; held: HeldDocument[] } | undefined> {
  const effectId = foundry.utils.randomID();
  const held = (await params.create(`${params.effectParentUuid}.ActiveEffect.${effectId}`)).filter(
    (d) => !!d,
  );
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

/** Every document on a scene that a spell effect keeps alive. */
function heldDocuments(): HeldDocument[] {
  return (game.scenes?.contents ?? []).flatMap((scene) =>
    [...scene.regions.contents, ...scene.tokens.contents].filter(
      (document: HeldDocument) => !!heldByOf(document),
    ),
  );
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

const holdsInDelta = (token: TokenDocument) =>
  !token.actorLink && deltaEffects(token).some(sourceHolds);

/**
 * Every actor whose effects can hold documents or come from an area: world actors, and the actors
 * of unlinked tokens with such an effect.
 */
function anchorActors(): Actor[] {
  const tokenActors = (game.scenes?.contents ?? []).flatMap((scene) =>
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

/**
 * Where the effects that went with a deleted actor, unlinked token or scene lived, as uuid
 * prefixes, when one of them held something. A deleted world actor takes its unlinked tokens'
 * actors with it too.
 */
function deletedHolders(document: Actor | TokenDocument | Scene): string[] {
  if (document instanceof Actor) {
    const own = document.effects.contents.some((effect) => holdsOf(effect).length > 0);
    const tokens = (game.scenes?.contents ?? []).flatMap((scene) =>
      scene.tokens.contents.filter((t) => t.actorId === document.id && holdsInDelta(t)),
    );
    return [...(own ? [document.uuid ?? ""] : []), ...tokens.map((t) => t.uuid ?? "")];
  }
  const tokens = document instanceof Scene ? document.tokens.contents : [document];
  return tokens.some(holdsInDelta) ? [document.uuid ?? ""] : [];
}

/** Delete the held documents whose effect lived under one of these uuids, e.g. a caster's token. */
async function releaseHeldWithin(uuids: readonly string[]): Promise<void> {
  const prefixes = uuids.filter((uuid) => !!uuid).map((uuid) => `${uuid}.`);
  if (prefixes.length) {
    await deleteAll(
      heldDocuments().filter((document) =>
        prefixes.some((prefix) => heldByOf(document).startsWith(prefix)),
      ),
    );
  }
}

/**
 * Bring spell-held state in line after something happened without the active GM's cleanup, e.g.
 * while no GM was logged in: delete held documents whose effect is gone, end effects one of whose
 * held documents is gone (as deleting it would have), and take an area's effect off a token whose
 * area is gone or that isn't in it any more.
 */
export async function reconcileSpellAnchors(): Promise<void> {
  await deleteAll(heldDocuments().filter((document) => !existing(heldByOf(document))));
  for (const actor of anchorActors()) {
    const ended = actor.effects.contents.filter((effect) =>
      holdsOf(effect).some((hold) => !heldDocument(effect.uuid ?? "", hold)),
    );
    const leftArea = actor.effects.contents.filter((effect) => !isInArea(actor, effect));
    const ids = [...new Set([...ended, ...leftArea].map((effect) => effect.id ?? ""))];
    try {
      // A deleted Region's exit events may take some of these off meanwhile
      const left = ids.filter((id) => actor.effects.has(id));
      if (left.length) {
        await actor.deleteEmbeddedDocuments("ActiveEffect", left);
      }
    } catch (error) {
      logger.warn("Could not reconcile an actor's spell effects", undefined, actor.uuid, error);
    }
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

type HeldSource = { flags?: Record<string, Record<string, unknown> | undefined> };

/** A copy of a held document's source that no longer claims to be held. */
function withoutHeldBy<T extends HeldSource>(source: T): T {
  const flags = source.flags?.[systemId];
  return flags?.["heldBy"]
    ? { ...source, flags: { ...source.flags, [systemId]: { ...flags, heldBy: "" } } }
    : source;
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
  const holderDeleted = (document: Actor | TokenDocument | Scene) => {
    const holders = isActiveGm() ? deletedHolders(document) : [];
    if (holders.length) {
      releaseHeldWithin(holders).catch(logFailure);
    }
  };
  Hooks.on("deleteRegion", (region) => heldDeleted(region as RegionDocument));
  Hooks.on("deleteToken", (token) => {
    heldDeleted(token as TokenDocument);
    holderDeleted(token as TokenDocument);
  });
  Hooks.on("deleteActor", (actor) => holderDeleted(actor as Actor));
  Hooks.on("deleteScene", (scene) => {
    holderDeleted(scene as Scene);
    // A deleted scene sends no events for what was on it
    for (const document of [...scene.regions.contents, ...scene.tokens.contents]) {
      heldDeleted(document as HeldDocument);
    }
  });

  const dropCopiedHeldBy = (document: HeldDocument, options: { rqgAnchored?: boolean }) => {
    if (!options.rqgAnchored && heldByOf(document)) {
      document.updateSource({ flags: { [systemId]: { heldBy: "" } } } as any);
    }
  };
  Hooks.on("preCreateRegion", (region, _data, options) =>
    dropCopiedHeldBy(region as RegionDocument, options as { rqgAnchored?: boolean }),
  );
  Hooks.on("preCreateToken", (token, _data, options) =>
    dropCopiedHeldBy(token as TokenDocument, options as { rqgAnchored?: boolean }),
  );
  Hooks.on("preCreateScene", (scene) => {
    const source = (scene as any)._source as { regions: HeldSource[]; tokens: HeldSource[] };
    if ([...source.regions, ...source.tokens].some((s) => sourceFlag(s, "heldBy"))) {
      scene.updateSource({
        regions: source.regions.map(withoutHeldBy),
        tokens: source.tokens.map(withoutHeldBy),
      } as any);
    }
  });

  Hooks.once("ready", () => {
    if (isActiveGm()) {
      reconcileSpellAnchors().catch(logFailure);
    }
  });
}

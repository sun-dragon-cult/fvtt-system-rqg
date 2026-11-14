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
type HeldDocument = ClientDocument & { uuid: string; delete(): Promise<unknown> };

type AnchorEffect = ActiveEffect & { uuid: string };

export function holdsOf(effect: ActiveEffect): SpellHold[] {
  const holds = effect.getFlag?.(systemId, "holds") as SpellHold[] | undefined;
  return Array.isArray(holds) ? holds : [];
}

export function heldByOf(document: ClientDocument): string {
  const heldBy = (document as any).getFlag?.(systemId, "heldBy");
  return typeof heldBy === "string" ? heldBy : "";
}

/** Whether an effect keeps a spell area's Region alive. */
export function holdsRegion(effect: ActiveEffect): boolean {
  return holdsOf(effect).some((hold) => hold.uuid.split(".").at(-2) === "Region");
}

function existing(uuid: string): HeldDocument | undefined {
  const document = uuid ? (fromUuidSync(uuid, { strict: false }) as HeldDocument | null) : null;
  return document ?? undefined;
}

/** Delete documents, skipping those already gone; deleting one that's gone fails. */
async function deleteAll(documents: readonly (HeldDocument | undefined)[]): Promise<void> {
  for (const document of documents) {
    if (document && existing(document.uuid)) {
      await document.delete();
    }
  }
}

/**
 * Make documents a spell effect keeps alive, then the effect that holds them, on the document with
 * `effectParentUuid` (which `create` may make, e.g. a summoned token's actor). `create` gets the
 * effect's uuid to put in each document's `heldBy` flag. When the effect can't be written, the
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
    const parent = existing(params.effectParentUuid) as unknown as Actor | undefined;
    const holds = held.map((d): SpellHold => ({ kind: "document", uuid: d.uuid }));
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
async function endHolder(document: ClientDocument & { uuid?: string | null }): Promise<void> {
  const effect = existing(heldByOf(document)) as unknown as AnchorEffect | undefined;
  if (effect && holdsOf(effect).some((hold) => hold.uuid === document.uuid)) {
    await effect.delete();
  }
}

/** Every document on a scene that a spell effect keeps alive. */
function heldDocuments(): HeldDocument[] {
  return (game.scenes?.contents ?? []).flatMap((scene) =>
    [...scene.regions.contents, ...scene.tokens.contents].filter(
      (document) => !!heldByOf(document as ClientDocument),
    ),
  ) as unknown as HeldDocument[];
}

type EffectSource = { flags?: { rqg?: { holds?: unknown[]; areaRegion?: string } } };

/** The source of the effects an unlinked token's delta adds, read without building its actor. */
function deltaEffects(token: TokenDocument): EffectSource[] {
  return ((token as any).delta?._source?.effects ?? []) as EffectSource[];
}

const sourceHolds = (effect: EffectSource) => !!effect.flags?.rqg?.holds?.length;

/**
 * Every actor whose effects can hold documents or come from an area: world actors, and the actors
 * of unlinked tokens with such an effect.
 */
function anchorActors(): Actor[] {
  const tokenActors = (game.scenes?.contents ?? []).flatMap((scene) =>
    scene.tokens.contents.flatMap((token) =>
      !token.actorLink &&
      deltaEffects(token).some((e) => sourceHolds(e) || !!e.flags?.rqg?.areaRegion) &&
      token.actor
        ? [token.actor]
        : [],
    ),
  );
  return [...(game.actors?.contents ?? []), ...tokenActors] as Actor[];
}

/** Whether an effect on a deleted actor, unlinked token or scene held documents. */
function heldSomething(document: ClientDocument): boolean {
  if (document instanceof Actor) {
    return document.effects.contents.some((effect) => holdsOf(effect).length > 0);
  }
  const tokens =
    document instanceof Scene ? document.tokens.contents : [document as unknown as TokenDocument];
  return tokens.some((token) => !token.actorLink && deltaEffects(token).some(sourceHolds));
}

/** Delete the held documents whose effect lived on what was deleted, e.g. a caster's token. */
async function releaseHeldWithin(uuid: string): Promise<void> {
  const prefix = `${uuid}.`;
  await deleteAll(heldDocuments().filter((document) => heldByOf(document).startsWith(prefix)));
}

/**
 * Bring spell-held state in line after something happened without the active GM's cleanup, e.g.
 * while no GM was logged in: delete held documents whose effect is gone, end effects whose held
 * documents are all gone, and take an area's effect off a token whose area is gone or that isn't
 * in it any more.
 */
export async function reconcileSpellAnchors(): Promise<void> {
  await deleteAll(heldDocuments().filter((document) => !existing(heldByOf(document))));
  for (const actor of anchorActors()) {
    const ended = actor.effects.contents.filter((effect) => {
      const holds = holdsOf(effect);
      return holds.length > 0 && holds.every((hold) => !heldDocument(effect.uuid ?? "", hold));
    });
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
  const region = existing(regionUuid) as unknown as RegionDocument | undefined;
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
 * held, and the GM's `ready` reconciles what changed while no GM could.
 */
export function initSpellAnchors(): void {
  const heldDeleted = (document: ClientDocument) => {
    if (isActiveGm() && heldByOf(document)) {
      endHolder(document).catch(logFailure);
    }
  };
  const holderDeleted = (document: ClientDocument & { uuid?: string | null }) => {
    if (isActiveGm() && document.uuid && heldSomething(document)) {
      releaseHeldWithin(document.uuid).catch(logFailure);
    }
  };
  Hooks.on("deleteRegion", (region) => heldDeleted(region as ClientDocument));
  Hooks.on("deleteToken", (token) => {
    heldDeleted(token as ClientDocument);
    holderDeleted(token as ClientDocument);
  });
  Hooks.on("deleteActor", (actor) => holderDeleted(actor as ClientDocument));
  Hooks.on("deleteScene", (scene) => {
    holderDeleted(scene as ClientDocument);
    // A deleted scene sends no events for what was on it
    for (const document of [...scene.regions.contents, ...scene.tokens.contents]) {
      heldDeleted(document as ClientDocument);
    }
  });
  Hooks.once("ready", () => {
    if (isActiveGm()) {
      reconcileSpellAnchors().catch(logFailure);
    }
  });
}

import { physicalItemTypes } from "@item-model/i-physical-item.ts";
import type { PhysicalItem } from "@item-model/item-types.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { isDocumentSubType, localize } from "./util";
import { magicPointStorageOrderFlag } from "../data-model/shared/rqg-document-flags";
import { systemId } from "./config";
import { ActorTypeEnum, type CharacterActor } from "../data-model/actor-data/rqg-actor-data";

/**
 * Where to draw Magic Points from when casting Spirit/Rune Magic (#956).
 * "self" - the caster's own pool (default, matches pre-#956 behavior).
 * "auto" - drain the actor's storage items (e.g. POW-storing crystals) in order first,
 *          falling back to the caster's own pool for any remainder.
 * "ally" - the caster's linked Allied Spirit bond partner's Magic Points (#957, either direction -
 *          see getAlliedBondActor). Also included as part of "auto": Core p.277 treats the bond's
 *          shared Magic Points the same as any other source, so "auto" drains storage items and
 *          self before falling back to the ally. Named to match ALLY_RUNE_POINT_SOURCE in
 *          rune-point-source.ts, which shares the same bond-partner concept.
 * Any other value is treated as the id of one of the actor's own storage items, and never
 * overflows to another source - the caster picked that source specifically.
 */
export type MagicPointSourceSelection = string;

export const SELF_MAGIC_POINT_SOURCE = "self";
export const AUTO_MAGIC_POINT_SOURCE = "auto";
export const ALLY_MAGIC_POINT_SOURCE = "ally";

/** Prefix for a bound-spirit source selection (#999, Binding Enchantment) - an item can hold
 *  several spirits, so the id names both the item and the spirit. */
const BOUND_SPIRIT_MAGIC_POINT_SOURCE_PREFIX = "boundSpirit:";

/** Selection id for `spiritActor`, one of possibly several spirits bound in `item`. Shaped
 *  "boundSpirit:<itemId>:<spiritUuid>" - safe to split on ":", never used by an id or uuid. */
export function boundSpiritSourceId(item: PhysicalItem, spiritActor: RqgActor): string {
  return `${BOUND_SPIRIT_MAGIC_POINT_SOURCE_PREFIX}${item.id}:${spiritActor.uuid}`;
}

function isBoundSpiritSourceId(selection: string): boolean {
  return selection.startsWith(BOUND_SPIRIT_MAGIC_POINT_SOURCE_PREFIX);
}

/**
 * The Character actor linked as `actor`'s Allied Spirit (#957), resolved via `fromUuidSync` (this
 * is called from synchronous render/context-prep paths, matching the pattern used elsewhere for
 * `DocumentUUIDField`s - see defence-dialog-v2.ts). Only returned when it's actually usable as a
 * Magic Point source for the *current* user: the linked uuid resolves to an Actor, and that user
 * has Owner permission on it. There's no separate "shown but not spendable" state - an ally the
 * current user can't act on is treated the same as no ally at all, both for the picker and for the
 * sheet display (see #957's design decision on this).
 */
export function getAlliedSpirit(actor: RqgActor): RqgActor | undefined {
  if (!isDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character)) {
    return undefined;
  }
  const uuid = actor.system.alliedSpiritActorUuid;
  if (!uuid) {
    return undefined;
  }
  const ally = fromUuidSync(uuid) as RqgActor | null;
  if (!(ally instanceof Actor) || !ally.isOwner) {
    return undefined;
  }
  return ally;
}

/**
 * The Character actor that has `actor` linked as *its* Allied Spirit (#957) - the reverse of
 * getAlliedSpirit. There's no second pointer field on the ally side; this is a live reverse
 * scan of game.actors for one whose alliedSpiritActorUuid resolves to `actor`. Cheap in practice:
 * game.actors.contents is already an in-memory client collection, and this is a single property
 * comparison per actor, not a lookup or fromUuid resolve per candidate.
 * Same "usable right now" gating as getAlliedSpirit (current user must own the priest actor too,
 * for the bond to be usable from the ally's side).
 */
export function getBondedPriest(actor: RqgActor): RqgActor | undefined {
  const priest = game.actors?.contents.find(
    (candidate) =>
      isDocumentSubType<CharacterActor>(
        candidate as unknown as RqgActor,
        ActorTypeEnum.Character,
      ) && (candidate as unknown as CharacterActor).system.alliedSpiritActorUuid === actor.uuid,
  ) as RqgActor | undefined;
  return priest?.isOwner ? priest : undefined;
}

/**
 * Either half of `actor`'s Allied Spirit bond (Core p.277), whichever side `actor` is on: the
 * linked ally if `actor` is the priest (see getAlliedSpirit), or the priest if `actor` is the
 * linked ally (see getBondedPriest). Core p.277: "An allied spirit is in continual mind-to-mind
 * communication with the priest. They can use each other's magical abilities, including spell
 * knowledge, magic points, and Rune points" - the bond is symmetric, so anywhere Magic/Rune Point
 * sharing is resolved should go through this rather than getAlliedSpirit directly, which only
 * ever looks the one direction (priest -> ally) needed for the sheet's own link-management UI.
 */
export function getAlliedBondActor(actor: RqgActor): RqgActor | undefined {
  return getAlliedSpirit(actor) ?? getBondedPriest(actor);
}

/**
 * Marker MIME type set on the dataTransfer of an in-popout Magic Point Sources drag (see
 * MagicPointSourcesApp.setupDragAndDrop). Never a valid document drop, so sheets can check
 * `event.dataTransfer.types` in dragover and ignore the drag entirely - including suppressing
 * their own drop-target highlighting - even if the cursor briefly strays outside the popout.
 */
export const MAGIC_POINT_SOURCE_DRAG_TYPE = "application/x-rqg-magic-point-source";

export type MagicPointDrawOrderEntry =
  | { type: "self" }
  | { type: "item"; item: PhysicalItem }
  | { type: "ally"; actor: RqgActor }
  | { type: "boundSpirit"; item: PhysicalItem; spiritActor: RqgActor };

export type BoundSpiritCandidate = { item: PhysicalItem; spiritActor: RqgActor };

/**
 * A physical item only counts as a usable Magic Point source once it's equipped (RAW's "physical
 * contact" requirement, Core p.263 Magic Point Enchantment) and its stored points have been
 * identified (e.g. via Analyze Magic - a found crystal shouldn't announce itself as a battery).
 * No attunement gate: that's a house-rule-shaped mistake from earlier design work on this
 * feature - RAW's attunement process (a week-long POW vs POW struggle) only applies to *Powered*
 * crystals, a different and separate item variant that amplifies/modifies spells rather than
 * storing raw Magic Points, and isn't implemented here. A plain MP-storage crystal just needs an
 * initial attunement attempt to identify it (which grants 1 stored MP) - not an ongoing gate on
 * every later use. `attunedTo` remains a pre-existing, unrelated flavor-text field.
 */
function getStorageItemCandidates(actor: RqgActor): PhysicalItem[] {
  return actor.items
    .filter((i) => isDocumentSubType<PhysicalItem>(i, physicalItemTypes))
    .filter((i) => (i.system.storedMagicPoints?.max ?? 0) > 0)
    .filter((i) => i.system.equippedStatus === "equipped")
    .filter((i) => i.system.storedMagicPoints?.identified === true);
}

/**
 * Resolve a single bound-spirit uuid to its Actor, via `fromUuidSync` - same synchronous/"usable
 * right now" gating as getAlliedSpirit (uuid resolves to an Actor, current user has Owner
 * permission on it).
 */
function resolveBoundSpiritActor(uuid: string | undefined | null): RqgActor | undefined {
  if (!uuid) {
    return undefined;
  }
  const spiritActor = fromUuidSync(uuid) as RqgActor | null;
  if (!(spiritActor instanceof Actor) || !spiritActor.isOwner) {
    return undefined;
  }
  return spiritActor;
}

/** Every spirit bound in `item` that's usable right now, in array order. */
export function getBoundSpiritActors(item: PhysicalItem): RqgActor[] {
  return (item.system.boundSpiritActorUuids ?? [])
    .map((uuid) => resolveBoundSpiritActor(uuid))
    .filter((actor): actor is RqgActor => actor !== undefined);
}

/** One specific spirit bound in `item`, by uuid. Undefined if not actually bound there. */
export function getBoundSpiritActorByUuid(
  item: PhysicalItem,
  spiritUuid: string,
): RqgActor | undefined {
  if (!(item.system.boundSpiritActorUuids ?? []).includes(spiritUuid)) {
    return undefined;
  }
  return resolveBoundSpiritActor(spiritUuid);
}

/**
 * An actor's bound-spirit items usable as a Magic Point source right now: equipped (Core p.249's
 * "physical contact" access - no identification/attunement gate) - one entry per spirit.
 *
 * Excludes a spirit that's also the actor's Allied Spirit bond partner (either direction) - the
 * same actor can't usefully fill both roles at once: it would be double-counted in totals, and
 * spendMagicPoints would fire two concurrent, independently-computed updates against the same
 * Actor document (one via the "ally" draw, one via the "boundSpirit" draw), each racing off a
 * stale pre-update read of its Magic Points - the loser's deduction is silently lost. The item
 * sheet's drop handler also refuses this pairing going forward (_onDropBoundSpirit), but this
 * exclusion is the actual correctness guarantee, independent of how the overlap arose.
 *
 * Accepts an already-resolved ally - see getMagicPointDrawOrder.
 */
export function getBoundSpiritItems(
  actor: RqgActor,
  ally: RqgActor | undefined = getAlliedBondActor(actor),
): BoundSpiritCandidate[] {
  return actor.items
    .filter((i) => isDocumentSubType<PhysicalItem>(i, physicalItemTypes))
    .filter((i) => i.system.equippedStatus === "equipped")
    .flatMap((i) =>
      getBoundSpiritActors(i as PhysicalItem)
        .filter((spiritActor) => spiritActor.uuid !== ally?.uuid)
        .map((spiritActor) => ({
          item: i as PhysicalItem,
          spiritActor,
        })),
    );
}

/**
 * Which of the two mutually-exclusive bond roles `candidate` already fills for `actor` (#957 +
 * #999), if any - shared by both drop handlers (RqgActorSheetV2._onDropAlliedSpirit,
 * RqgItemSheetV2._onDropBoundSpirit) so the exclusivity rule enforced by getBoundSpiritItems is
 * checked the same way wherever a new bond is about to be created.
 */
export function getBondRoleConflict(
  actor: RqgActor,
  candidate: RqgActor,
): "ally" | "boundSpirit" | undefined {
  if (getAlliedBondActor(actor)?.uuid === candidate.uuid) {
    return "ally";
  }
  if (getBoundSpiritItems(actor).some(({ spiritActor }) => spiritActor.uuid === candidate.uuid)) {
    return "boundSpirit";
  }
  return undefined;
}

/**
 * The actor's full Magic Point draw order - storage items, the caster's own pool ("self"), and a
 * linked Allied Spirit bond partner (#957, either direction - see getAlliedBondActor), interleaved
 * by priority. Entries listed in the actor's magicPointStorageOrder flag (item ids, plus the
 * literals "self"/"ally") come first in that order; anything missing (new storage items, "self" if
 * it was never placed, or a newly-linked ally) is appended - self before a not-yet-ordered ally, so
 * a fresh bond starts last by default, below self. This is both the "auto" draw order (Core p.277:
 * the bond lets each side use the other's Magic Points, same as any other source) and the row
 * order shown in the Magic Point Sources popout.
 *
 * Accepts an already-resolved ally (e.g. from a caller that also needs it for something else, like
 * sheet-header display) to avoid re-resolving the allied bond a second time - getBondedPriest's
 * reverse-lookup side in particular walks game.actors.contents.
 */
export function getMagicPointDrawOrder(
  actor: RqgActor,
  ally: RqgActor | undefined = getAlliedBondActor(actor),
): MagicPointDrawOrderEntry[] {
  const items = getStorageItemCandidates(actor);
  const boundSpirits = getBoundSpiritItems(actor, ally);
  const order = actor.getFlag(systemId, magicPointStorageOrderFlag);

  // The non-item sources, keyed by their order-flag id. A Map (rather than two separate
  // `*Placed` flags) makes "find or append, and don't duplicate" a single generic rule below,
  // shared between self and ally instead of one bespoke if-branch per source.
  const singletons = new Map<string, MagicPointDrawOrderEntry>([
    [SELF_MAGIC_POINT_SOURCE, { type: "self" }],
  ]);
  if (ally) {
    singletons.set(ALLY_MAGIC_POINT_SOURCE, { type: "ally", actor: ally });
  }

  const asBoundSpiritEntry = ({ item, spiritActor }: BoundSpiritCandidate) => ({
    type: "boundSpirit" as const,
    item,
    spiritActor,
  });

  if (!order || order.length === 0) {
    return [
      ...items.map((item) => ({ type: "item" as const, item })),
      ...boundSpirits.map(asBoundSpiritEntry),
      ...singletons.values(),
    ];
  }

  const itemsById = new Map(items.map((item) => [item.id, item]));
  const boundSpiritsById = new Map(
    boundSpirits.map((bs) => [boundSpiritSourceId(bs.item, bs.spiritActor), bs]),
  );
  const entries: MagicPointDrawOrderEntry[] = [];
  for (const id of order) {
    const singleton = singletons.get(id);
    if (singleton) {
      entries.push(singleton);
      singletons.delete(id);
      continue;
    }
    const item = itemsById.get(id);
    if (item) {
      entries.push({ type: "item", item });
      itemsById.delete(id);
      continue;
    }
    const boundSpirit = boundSpiritsById.get(id);
    if (boundSpirit) {
      entries.push(asBoundSpiritEntry(boundSpirit));
      boundSpiritsById.delete(id);
    }
  }

  // Anything not (yet) in the order flag keeps its natural relative order, inserted right
  // before self so newly acquired items/spirits don't silently jump ahead of it.
  const remainingItems = [...itemsById.values()];
  const remainingBoundSpirits = [...boundSpiritsById.values()];
  if (remainingItems.length > 0 || remainingBoundSpirits.length > 0) {
    const selfIndex = entries.findIndex((entry) => entry.type === "self");
    const insertAt = selfIndex === -1 ? entries.length : selfIndex;
    entries.splice(
      insertAt,
      0,
      ...remainingItems.map((item) => ({ type: "item" as const, item })),
      ...remainingBoundSpirits.map(asBoundSpiritEntry),
    );
  }
  // Any singleton never placed above (self and/or ally, e.g. the order flag predates the bond)
  // is appended at the end, self before ally (Maps preserve insertion order).
  entries.push(...singletons.values());
  return entries;
}

/**
 * Storage items in draw order (see getMagicPointDrawOrder), excluding "self". Accepts an
 * already-resolved ally - see getMagicPointDrawOrder.
 */
export function getStorageItems(
  actor: RqgActor,
  ally: RqgActor | undefined = getAlliedBondActor(actor),
): PhysicalItem[] {
  return getMagicPointDrawOrder(actor, ally)
    .filter((entry): entry is { type: "item"; item: PhysicalItem } => entry.type === "item")
    .map((entry) => entry.item);
}

/**
 * Sum of current and max Magic Points across all of the actor's storage items and, when linked, a
 * usable Allied Spirit bond partner (#957) - excludes self's own pool. Shown as a running total
 * next to the Magic Point Sources header icon, which is itself only shown when one of these
 * sources is present (see showMagicPointSourcesButton), so the total must include the ally too or
 * the badge misleadingly reads 0/0 for an ally-only actor.
 *
 * Accepts an already-computed storageItems list and/or ally (e.g. from a caller that also needs
 * them for something else, like a render-time item count) to avoid re-walking the actor's items
 * and re-resolving the allied bond a second time; both default to computing them when not given.
 */
export function getTotalStoredMagicPoints(
  actor: RqgActor,
  storageItems: PhysicalItem[] = getStorageItems(actor),
  ally: RqgActor | undefined = getAlliedBondActor(actor),
  boundSpirits: BoundSpiritCandidate[] = getBoundSpiritItems(actor, ally),
): { value: number; max: number } {
  const itemTotal = storageItems.reduce(
    (total, item) => ({
      value: total.value + (Number(item.system.storedMagicPoints?.value) || 0),
      max: total.max + (Number(item.system.storedMagicPoints?.max) || 0),
    }),
    { value: 0, max: 0 },
  );
  const boundSpiritTotal = boundSpirits.reduce(
    (total, { spiritActor }) => ({
      value: total.value + (Number(spiritActor.system.attributes.magicPoints.value) || 0),
      max: total.max + (Number(spiritActor.system.attributes.magicPoints.max) || 0),
    }),
    itemTotal,
  );
  if (!ally) {
    return boundSpiritTotal;
  }
  return {
    value: boundSpiritTotal.value + (Number(ally.system.attributes.magicPoints.value) || 0),
    max: boundSpiritTotal.max + (Number(ally.system.attributes.magicPoints.max) || 0),
  };
}

/**
 * Persist a full Magic Point draw order (item ids and the literal "self") to the actor's
 * magicPointStorageOrder flag, e.g. after drag-and-drop reordering in the popout.
 */
export async function setMagicPointDrawOrder(actor: RqgActor, order: string[]): Promise<void> {
  await actor.setFlag(systemId, magicPointStorageOrderFlag, order);
}

/**
 * Pure helper: move `id` to just before `beforeId` in an ordered list of ids, e.g. after
 * dropping a dragged row onto another row in the Magic Point Sources popout. Pass `null` for
 * `beforeId` to move `id` to the end of the list (dropping past the last row). No-op if `id`
 * isn't present, if `beforeId` is given but isn't present, or if they're the same id.
 */
export function moveSourceBefore(order: string[], id: string, beforeId: string | null): string[] {
  if (id === beforeId || !order.includes(id) || (beforeId !== null && !order.includes(beforeId))) {
    return order;
  }
  const withoutId = order.filter((entry) => entry !== id);
  const targetIndex = beforeId === null ? withoutId.length : withoutId.indexOf(beforeId);
  const reordered = [...withoutId];
  reordered.splice(targetIndex, 0, id);
  return reordered;
}

/**
 * Options for a magic-point-source picker, excluding "auto" - only populated (non-empty) when the
 * actor actually has one or more storage items or a usable Allied Spirit bond partner (#957),
 * since the dialog should only show a picker at all when there is more than one possible source.
 * "Self"/ally/storage-item options are listed in the same order as the Magic Point Source Order
 * popout (see getMagicPointDrawOrder) - "auto" is pinned first regardless, since it's a
 * meta-option ("let the system decide") rather than a specific source pick.
 */
export function getMagicPointSourceOptions(
  actor: RqgActor | null | undefined,
): SelectOptionData<string>[] {
  const drawOrder = actor ? getMagicPointDrawOrder(actor) : [];
  if (!drawOrder.some((entry) => entry.type !== "self")) {
    return [];
  }
  return [
    { value: AUTO_MAGIC_POINT_SOURCE, label: "RQG.Dialog.Common.MagicPointSourceOptions.Auto" },
    ...drawOrder.map((entry) => {
      switch (entry.type) {
        case "self":
          return {
            value: SELF_MAGIC_POINT_SOURCE,
            label: "RQG.Dialog.Common.MagicPointSourceOptions.Self",
          };
        case "ally":
          // Just the bond partner's name, not a templated "Allied Spirit (Name)" label: this
          // option shows up from either side of the bond (see getAlliedBondActor), and "Allied
          // Spirit" would read backwards when an ally casts using its bonded priest's Magic
          // Points.
          return { value: ALLY_MAGIC_POINT_SOURCE, label: entry.actor.name ?? "" };
        case "item":
          return { value: entry.item.id ?? "", label: entry.item.name ?? "" };
        case "boundSpirit":
          // The bound spirit's own name, like ally - see the "ally" case above.
          return {
            value: boundSpiritSourceId(entry.item, entry.spiritActor),
            label: entry.spiritActor.name ?? "",
          };
      }
    }),
  ];
}

/** The draw-order entry for the bound spirit matching `selection`, if any. */
function findBoundSpiritEntry(
  actor: RqgActor,
  selection: MagicPointSourceSelection,
): { type: "boundSpirit"; item: PhysicalItem; spiritActor: RqgActor } | undefined {
  if (!isBoundSpiritSourceId(selection)) {
    return undefined;
  }
  return getMagicPointDrawOrder(actor).find(
    (e): e is { type: "boundSpirit"; item: PhysicalItem; spiritActor: RqgActor } =>
      e.type === "boundSpirit" && boundSpiritSourceId(e.item, e.spiritActor) === selection,
  );
}

export function getAvailableMagicPoints(
  actor: RqgActor,
  selection: MagicPointSourceSelection = SELF_MAGIC_POINT_SOURCE,
): number {
  const selfAvailable = Number(actor.system.attributes.magicPoints.value) || 0;
  if (selection === SELF_MAGIC_POINT_SOURCE) {
    return selfAvailable;
  }

  if (selection === ALLY_MAGIC_POINT_SOURCE) {
    const ally = getAlliedBondActor(actor);
    return Number(ally?.system.attributes.magicPoints.value) || 0;
  }

  if (selection === AUTO_MAGIC_POINT_SOURCE) {
    // A single draw-order pass instead of getStorageItems(actor) + getAlliedBondActor(actor)
    // separately - both would otherwise resolve the allied bond a second time internally.
    const drawOrder = getMagicPointDrawOrder(actor);
    const { storedAvailable, boundSpiritAvailable } = drawOrder.reduce(
      (sums, entry) => {
        if (entry.type === "item") {
          sums.storedAvailable += Number(entry.item.system.storedMagicPoints?.value) || 0;
        } else if (entry.type === "boundSpirit") {
          sums.boundSpiritAvailable +=
            Number(entry.spiritActor.system.attributes.magicPoints.value) || 0;
        }
        return sums;
      },
      { storedAvailable: 0, boundSpiritAvailable: 0 },
    );
    const ally = drawOrder.find(
      (entry): entry is { type: "ally"; actor: RqgActor } => entry.type === "ally",
    )?.actor;
    const allyAvailable = Number(ally?.system.attributes.magicPoints.value) || 0;
    return storedAvailable + boundSpiritAvailable + selfAvailable + allyAvailable;
  }

  const boundSpiritEntry = findBoundSpiritEntry(actor, selection);
  if (boundSpiritEntry) {
    return Number(boundSpiritEntry.spiritActor.system.attributes.magicPoints.value) || 0;
  }

  const item = getStorageItems(actor).find((i) => i.id === selection);
  return Number(item?.system.storedMagicPoints?.value) || 0;
}

/**
 * Max points `item` could receive from `actor`'s own pool right now - whichever runs out first:
 * self's current points (minus 1 - self is never drained all the way to 0 by a manual feed, since
 * 0 Magic Points knocks the actor unconscious, see hit-location-damage-calculations.ts), or the
 * item's remaining storage capacity.
 */
export function getMaxTransferableToStorage(actor: RqgActor, item: PhysicalItem): number {
  const selfAvailable = Math.max(0, (Number(actor.system.attributes.magicPoints.value) || 0) - 1);
  const itemMax = Number(item.system.storedMagicPoints?.max) || 0;
  const itemValue = Number(item.system.storedMagicPoints?.value) || 0;
  return Math.max(0, Math.min(selfAvailable, itemMax - itemValue));
}

/**
 * Move as many points as possible from `actor`'s own pool into `item`'s storage (per #956's
 * design doc: anyone who can use the item can refill its storage from their own Magic Points).
 * One-directional only - there's no UI path back from storage to self; drawing from storage
 * happens only by spending it on a cast (see spendMagicPoints). RAW paces a manual refill at 1
 * MP/melee round, but that isn't enforced here: self's pool is planned to auto-replenish over
 * game time regardless, so it doesn't matter how many rounds this notionally took.
 */
export async function feedStorageFromSelf(actor: RqgActor, item: PhysicalItem): Promise<void> {
  const draw = getMaxTransferableToStorage(actor, item);
  if (draw <= 0) {
    return;
  }
  const selfValue = Number(actor.system.attributes.magicPoints.value) || 0;
  const itemValue = Number(item.system.storedMagicPoints?.value) || 0;
  await Promise.all([
    actor.update(
      foundry.utils.expandObject({ "system.attributes.magicPoints.value": selfValue - draw }),
    ),
    item.update({ system: { storedMagicPoints: { value: itemValue + draw } } }),
  ]);
}

type MagicPointDraw = { item: PhysicalItem; amount: number };
type MagicPointAllyDraw = { actor: RqgActor; amount: number };
type MagicPointBoundSpiritDraw = { item: PhysicalItem; spiritActor: RqgActor; amount: number };

/** How much of a bound spirit's current Magic Points can be drawn - all of it, or all but the
 *  last point if `avoidRelease` (#999, see resolveMagicPointDraws). */
function boundSpiritDrawable(spiritActor: RqgActor, avoidRelease: boolean): number {
  const available = Number(spiritActor.system.attributes.magicPoints.value) || 0;
  return avoidRelease ? Math.max(0, available - 1) : available;
}

/**
 * Resolve how a Magic Point spend of `amount` splits across sources, without writing anything -
 * shared by spendMagicPoints (which commits the result) and getBoundSpiritDrainWarnings (which
 * previews it to decide whether to warn before a cast, #999).
 *
 * `avoidRelease` (#999): when true, a bound spirit is never drawn down past 1 - the last point of
 * any would-be-draining amount is left in the spirit (keeping it bound) and, in AUTO mode, spills
 * over to whatever source comes next in the draw order instead, same as any other shortfall. Only
 * meaningful when the caller already knows (via getBoundSpiritDrainWarnings) that the default
 * (false) resolution would drain a bound spirit to 0 - the player chose this to keep it bound
 * rather than release it.
 */
function resolveMagicPointDraws(
  actor: RqgActor,
  amount: number,
  selection: MagicPointSourceSelection,
  avoidRelease: boolean = false,
): {
  selfAmount: number;
  itemDraws: MagicPointDraw[];
  allyDraw?: MagicPointAllyDraw;
  boundSpiritDraws: MagicPointBoundSpiritDraw[];
} {
  if (selection === SELF_MAGIC_POINT_SOURCE) {
    return { selfAmount: amount, itemDraws: [], boundSpiritDraws: [] };
  }

  if (selection === ALLY_MAGIC_POINT_SOURCE) {
    // An explicitly picked single source never overflows - the caster chose that source on
    // purpose (mirrors the single-storage-item case below).
    const ally = getAlliedBondActor(actor);
    const available = Number(ally?.system.attributes.magicPoints.value) || 0;
    const draw = Math.min(available, amount);
    return {
      selfAmount: 0,
      itemDraws: [],
      boundSpiritDraws: [],
      allyDraw: ally && draw > 0 ? { actor: ally, amount: draw } : undefined,
    };
  }

  if (selection === AUTO_MAGIC_POINT_SOURCE) {
    // Drain the actor's full draw order (storage items, self, bound spirits, and a linked ally,
    // interleaved by priority).
    const selfAvailable = Number(actor.system.attributes.magicPoints.value) || 0;
    let remaining = amount;
    const itemDraws: MagicPointDraw[] = [];
    const boundSpiritDraws: MagicPointBoundSpiritDraw[] = [];
    let selfAmount = 0;
    let allyDraw: MagicPointAllyDraw | undefined;
    for (const entry of getMagicPointDrawOrder(actor)) {
      if (remaining <= 0) {
        break;
      }
      if (entry.type === "self") {
        const draw = Math.min(selfAvailable, remaining);
        selfAmount = draw;
        remaining -= draw;
        continue;
      }
      if (entry.type === "ally") {
        const available = Number(entry.actor.system.attributes.magicPoints.value) || 0;
        const draw = Math.min(available, remaining);
        if (draw > 0) {
          allyDraw = { actor: entry.actor, amount: draw };
          remaining -= draw;
        }
        continue;
      }
      if (entry.type === "boundSpirit") {
        const drawable = boundSpiritDrawable(entry.spiritActor, avoidRelease);
        const draw = Math.min(drawable, remaining);
        if (draw > 0) {
          boundSpiritDraws.push({ item: entry.item, spiritActor: entry.spiritActor, amount: draw });
          remaining -= draw;
        }
        continue;
      }
      const available = Number(entry.item.system.storedMagicPoints?.value) || 0;
      const draw = Math.min(available, remaining);
      if (draw > 0) {
        itemDraws.push({ item: entry.item, amount: draw });
        remaining -= draw;
      }
    }
    return { selfAmount, itemDraws, allyDraw, boundSpiritDraws };
  }

  const boundSpiritEntry = findBoundSpiritEntry(actor, selection);
  if (boundSpiritEntry) {
    // An explicitly picked single source never overflows - the caster chose that source on
    // purpose. With no other source to spill onto, avoidRelease here just means the cast may
    // come up 1 MP short rather than releasing the spirit - same as any other shortfall.
    const drawable = boundSpiritDrawable(boundSpiritEntry.spiritActor, avoidRelease);
    const draw = Math.min(drawable, amount);
    return {
      selfAmount: 0,
      itemDraws: [],
      boundSpiritDraws:
        draw > 0
          ? [
              {
                item: boundSpiritEntry.item,
                spiritActor: boundSpiritEntry.spiritActor,
                amount: draw,
              },
            ]
          : [],
    };
  }

  // An explicitly picked single source never overflows - the caster chose that source on
  // purpose.
  const storageItems = getStorageItems(actor);
  const item = storageItems.find((i) => i.id === selection);
  if (!item) {
    return { selfAmount: 0, itemDraws: [], boundSpiritDraws: [] };
  }
  const available = Number(item.system.storedMagicPoints?.value) || 0;
  const draw = Math.min(available, amount);
  return {
    selfAmount: 0,
    itemDraws: draw > 0 ? [{ item, amount: draw }] : [],
    boundSpiritDraws: [],
  };
}

/** Bound spirits that a draw of `amount` via `selection` would drain to 0, releasing them from
 *  their binding (Well of Daliath errata correcting W&E p.120's "destroyed"). Pure preview. */
export function getBoundSpiritDrainWarnings(
  actor: RqgActor,
  amount: number,
  selection: MagicPointSourceSelection,
): MagicPointBoundSpiritDraw[] {
  if (amount <= 0) {
    return [];
  }
  const { boundSpiritDraws } = resolveMagicPointDraws(actor, amount, selection);
  return boundSpiritDraws.filter(
    ({ spiritActor, amount: draw }) =>
      (Number(spiritActor.system.attributes.magicPoints.value) || 0) - draw <= 0,
  );
}

/** What to do about a cast that would otherwise drain a bound spirit to 0 - see
 *  confirmBoundSpiritDrain. `avoidRelease` is meaningful only when `proceed` is true. */
export type BoundSpiritDrainDecision = { proceed: boolean; avoidRelease: boolean };

/** Confirm before a cast that would drain a bound spirit to 0 (an irreversible release, unlike
 *  every other draw). No-op (no dialog, `{proceed:true, avoidRelease:false}`) when nothing would
 *  be drained. Otherwise offers: keep the spirit bound (default - draws one point less and spills
 *  the rest onto the next source, see resolveMagicPointDraws' avoidRelease), release it (today's
 *  full drain), or cancel. Call before the roll, not after - backing out post-roll would be worse
 *  than asking first. */
export async function confirmBoundSpiritDrain(
  actor: RqgActor,
  amount: number,
  selection: MagicPointSourceSelection,
): Promise<BoundSpiritDrainDecision> {
  const draining = getBoundSpiritDrainWarnings(actor, amount, selection);
  if (draining.length === 0) {
    return { proceed: true, avoidRelease: false };
  }
  const spiritNames = draining.map(({ spiritActor }) => spiritActor.name ?? "").join(", ");
  const choice = await foundry.applications.api.DialogV2.wait({
    window: { title: localize("RQG.Item.Gear.BoundSpiritDrainConfirmTitle") },
    content: `<p>${localize("RQG.Item.Gear.BoundSpiritDrainConfirmContent", { spiritNames })}</p>`,
    position: { width: 480 }, // 30rem
    rejectClose: false,
    buttons: [
      {
        action: "keepBound",
        icon: "fas fa-hand",
        label: "RQG.Item.Gear.BoundSpiritDrainKeepBoundBtn",
        default: true,
        callback: () => "keepBound",
      },
      {
        action: "release",
        icon: "fas fa-unlink",
        label: "RQG.Item.Gear.BoundSpiritDrainReleaseBtn",
        callback: () => "release",
      },
      {
        action: "cancel",
        icon: "fas fa-times",
        label: "RQG.Dialog.Common.btnCancel",
        callback: () => "cancel",
      },
    ],
  });
  if (choice === "keepBound") {
    return { proceed: true, avoidRelease: true };
  }
  if (choice === "release") {
    return { proceed: true, avoidRelease: false };
  }
  return { proceed: false, avoidRelease: false };
}

/**
 * Deduct `amount` Magic Points from `actor`, drawn from the given source selection.
 * Validation (is there enough available) is expected to have already happened via
 * getAvailableMagicPoints() - by this point a shortfall is simply drawn as far as it goes.
 *
 * `avoidRelease` (#999) - see resolveMagicPointDraws - pass the `avoidRelease` from a prior
 * confirmBoundSpiritDrain() call so a "keep bound" choice is actually honored here.
 */
export async function spendMagicPoints(
  actor: RqgActor,
  amount: number,
  selection: MagicPointSourceSelection = SELF_MAGIC_POINT_SOURCE,
  avoidRelease: boolean = false,
): Promise<void> {
  if (amount <= 0) {
    return;
  }
  const { selfAmount, itemDraws, allyDraw, boundSpiritDraws } = resolveMagicPointDraws(
    actor,
    amount,
    selection,
    avoidRelease,
  );

  // Item draws, the self-pool draw, an ally draw, and bound-spirit draws all touch different
  // documents with no data dependency between them, so they can be written concurrently rather
  // than one awaited after the other.
  await Promise.all([
    itemDraws.length > 0
      ? actor.updateEmbeddedDocuments(
          "Item",
          itemDraws.map(({ item, amount: draw }) => ({
            _id: item.id,
            system: {
              storedMagicPoints: {
                value: (Number(item.system.storedMagicPoints?.value) || 0) - draw,
              },
            },
          })),
        )
      : undefined,
    allyDraw
      ? allyDraw.actor.update(
          foundry.utils.expandObject({
            "system.attributes.magicPoints.value":
              (Number(allyDraw.actor.system.attributes.magicPoints.value) || 0) - allyDraw.amount,
          }),
        )
      : undefined,
    selfAmount > 0
      ? actor.update(
          foundry.utils.expandObject({
            "system.attributes.magicPoints.value":
              (Number(actor.system.attributes.magicPoints.value) || 0) - selfAmount,
          }),
        )
      : undefined,
    ...boundSpiritDraws.map(({ item, spiritActor, amount: draw }) =>
      spendBoundSpiritMagicPoints(item, spiritActor, draw),
    ),
  ]);
}

/** Deduct `draw` from the spirit bound in `item`. Drained to 0 releases it (removes its uuid
 *  from boundSpiritActorUuids, leaving any other spirits in the item untouched) and notifies. */
async function spendBoundSpiritMagicPoints(
  item: PhysicalItem,
  spiritActor: RqgActor,
  draw: number,
): Promise<void> {
  const remaining = (Number(spiritActor.system.attributes.magicPoints.value) || 0) - draw;
  const spiritUpdate = spiritActor.update(
    foundry.utils.expandObject({ "system.attributes.magicPoints.value": Math.max(0, remaining) }),
  );
  if (remaining <= 0) {
    const remainingSpiritUuids = (item.system.boundSpiritActorUuids ?? []).filter(
      (uuid) => uuid !== spiritActor.uuid,
    );
    await Promise.all([
      spiritUpdate,
      item.update({ system: { boundSpiritActorUuids: remainingSpiritUuids } }),
    ]);
    ui.notifications?.info(
      localize("RQG.Item.Gear.BoundSpiritReleasedInfo", {
        spiritName: spiritActor.name ?? "",
        itemName: item.name ?? "",
      }),
    );
  } else {
    await spiritUpdate;
  }
}

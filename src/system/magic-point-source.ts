import { physicalItemTypes } from "@item-model/i-physical-item.ts";
import type { PhysicalItem } from "@item-model/item-types.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { isDocumentSubType } from "./util";
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
  { type: "self" } | { type: "item"; item: PhysicalItem } | { type: "ally"; actor: RqgActor };

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

  if (!order || order.length === 0) {
    return [...items.map((item) => ({ type: "item" as const, item })), ...singletons.values()];
  }

  const itemsById = new Map(items.map((item) => [item.id, item]));
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
    }
  }

  // Any storage items not (yet) in the order flag keep their natural relative order, inserted
  // right before self so newly acquired items don't silently jump ahead of it. itemsById only
  // still holds the ones not already placed above (placed ones were deleted from it), in their
  // original relative order (Maps preserve insertion order).
  const remainingItems = [...itemsById.values()];
  if (remainingItems.length > 0) {
    const selfIndex = entries.findIndex((entry) => entry.type === "self");
    const insertAt = selfIndex === -1 ? entries.length : selfIndex;
    entries.splice(insertAt, 0, ...remainingItems.map((item) => ({ type: "item" as const, item })));
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
): { value: number; max: number } {
  const itemTotal = storageItems.reduce(
    (total, item) => ({
      value: total.value + (Number(item.system.storedMagicPoints?.value) || 0),
      max: total.max + (Number(item.system.storedMagicPoints?.max) || 0),
    }),
    { value: 0, max: 0 },
  );
  if (!ally) {
    return itemTotal;
  }
  return {
    value: itemTotal.value + (Number(ally.system.attributes.magicPoints.value) || 0),
    max: itemTotal.max + (Number(ally.system.attributes.magicPoints.max) || 0),
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
      }
    }),
  ];
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
    const storedAvailable = drawOrder.reduce(
      (sum, entry) =>
        entry.type === "item"
          ? sum + (Number(entry.item.system.storedMagicPoints?.value) || 0)
          : sum,
      0,
    );
    const ally = drawOrder.find(
      (entry): entry is { type: "ally"; actor: RqgActor } => entry.type === "ally",
    )?.actor;
    const allyAvailable = Number(ally?.system.attributes.magicPoints.value) || 0;
    return storedAvailable + selfAvailable + allyAvailable;
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

function resolveMagicPointDraws(
  actor: RqgActor,
  amount: number,
  selection: MagicPointSourceSelection,
): { selfAmount: number; itemDraws: MagicPointDraw[]; allyDraw?: MagicPointAllyDraw } {
  if (selection === SELF_MAGIC_POINT_SOURCE) {
    return { selfAmount: amount, itemDraws: [] };
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
      allyDraw: ally && draw > 0 ? { actor: ally, amount: draw } : undefined,
    };
  }

  if (selection === AUTO_MAGIC_POINT_SOURCE) {
    // Drain the actor's full draw order (storage items, self, and a linked ally, interleaved by
    // priority).
    const selfAvailable = Number(actor.system.attributes.magicPoints.value) || 0;
    let remaining = amount;
    const itemDraws: MagicPointDraw[] = [];
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
      const available = Number(entry.item.system.storedMagicPoints?.value) || 0;
      const draw = Math.min(available, remaining);
      if (draw > 0) {
        itemDraws.push({ item: entry.item, amount: draw });
        remaining -= draw;
      }
    }
    return { selfAmount, itemDraws, allyDraw };
  }

  // An explicitly picked single source never overflows - the caster chose that source on
  // purpose.
  const storageItems = getStorageItems(actor);
  const item = storageItems.find((i) => i.id === selection);
  if (!item) {
    return { selfAmount: 0, itemDraws: [] };
  }
  const available = Number(item.system.storedMagicPoints?.value) || 0;
  const draw = Math.min(available, amount);
  return { selfAmount: 0, itemDraws: draw > 0 ? [{ item, amount: draw }] : [] };
}

/**
 * Deduct `amount` Magic Points from `actor`, drawn from the given source selection.
 * Validation (is there enough available) is expected to have already happened via
 * getAvailableMagicPoints() - by this point a shortfall is simply drawn as far as it goes.
 */
export async function spendMagicPoints(
  actor: RqgActor,
  amount: number,
  selection: MagicPointSourceSelection = SELF_MAGIC_POINT_SOURCE,
): Promise<void> {
  if (amount <= 0) {
    return;
  }
  const { selfAmount, itemDraws, allyDraw } = resolveMagicPointDraws(actor, amount, selection);

  // Item draws, the self-pool draw, and an ally draw all touch different documents with no data
  // dependency between them, so they can be written concurrently rather than one awaited after
  // the other.
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
  ]);
}

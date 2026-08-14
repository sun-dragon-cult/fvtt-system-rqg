import { physicalItemTypes } from "@item-model/i-physical-item.ts";
import type { PhysicalItem } from "@item-model/item-types.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { isDocumentSubType } from "./util";
import { magicPointStorageOrderFlag } from "../data-model/shared/rqg-document-flags";
import { systemId } from "./config";

/**
 * Where to draw Magic Points from when casting Spirit/Rune Magic (#956).
 * "self" - the caster's own pool (default, matches pre-#956 behavior).
 * "auto" - drain the actor's storage items (e.g. POW-storing crystals) in order first,
 *          falling back to the caster's own pool for any remainder.
 * Any other value is treated as the id of one of the actor's own storage items, and never
 * overflows to another source - the caster picked that source specifically.
 */
export type MagicPointSourceSelection = string;

export const SELF_MAGIC_POINT_SOURCE = "self";
export const AUTO_MAGIC_POINT_SOURCE = "auto";

/**
 * Marker MIME type set on the dataTransfer of an in-popout Magic Point Sources drag (see
 * MagicPointSourcesApp.setupDragAndDrop). Never a valid document drop, so sheets can check
 * `event.dataTransfer.types` in dragover and ignore the drag entirely - including suppressing
 * their own drop-target highlighting - even if the cursor briefly strays outside the popout.
 */
export const MAGIC_POINT_SOURCE_DRAG_TYPE = "application/x-rqg-magic-point-source";

export type MagicPointDrawOrderEntry = { type: "self" } | { type: "item"; item: PhysicalItem };

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
 * The actor's full Magic Point draw order - storage items and the caster's own pool ("self")
 * interleaved by priority. Entries listed in the actor's magicPointStorageOrder flag (item ids,
 * plus the literal "self") come first in that order; anything missing (new storage items, or
 * "self" if it was never placed) is appended, self last by default. This is both the "auto" draw
 * order and the row order shown in the Magic Point Sources popout.
 */
export function getMagicPointDrawOrder(actor: RqgActor): MagicPointDrawOrderEntry[] {
  const items = getStorageItemCandidates(actor);
  const order = actor.getFlag(systemId, magicPointStorageOrderFlag);

  if (!order || order.length === 0) {
    return [...items.map((item) => ({ type: "item" as const, item })), { type: "self" as const }];
  }

  const itemsById = new Map(items.map((item) => [item.id, item]));
  const entries: MagicPointDrawOrderEntry[] = [];
  let selfPlaced = false;
  for (const id of order) {
    if (id === SELF_MAGIC_POINT_SOURCE) {
      if (!selfPlaced) {
        entries.push({ type: "self" });
        selfPlaced = true;
      }
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
  if (!selfPlaced) {
    entries.push({ type: "self" });
  }
  return entries;
}

/**
 * Storage items in draw order (see getMagicPointDrawOrder), excluding "self".
 */
export function getStorageItems(actor: RqgActor): PhysicalItem[] {
  return getMagicPointDrawOrder(actor)
    .filter((entry): entry is { type: "item"; item: PhysicalItem } => entry.type === "item")
    .map((entry) => entry.item);
}

/**
 * Sum of current and max Magic Points across all of the actor's storage items - excludes self's
 * own pool. Shown as a running total next to the Magic Point Sources header icon.
 *
 * Accepts an already-computed storageItems list (e.g. from a caller that also needs it for
 * something else, like a render-time item count) to avoid re-walking the actor's items and
 * re-resolving the draw order a second time; defaults to computing it when not given.
 */
export function getTotalStoredMagicPoints(
  actor: RqgActor,
  storageItems: PhysicalItem[] = getStorageItems(actor),
): { value: number; max: number } {
  return storageItems.reduce(
    (total, item) => ({
      value: total.value + (Number(item.system.storedMagicPoints?.value) || 0),
      max: total.max + (Number(item.system.storedMagicPoints?.max) || 0),
    }),
    { value: 0, max: 0 },
  );
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
 * Options for a magic-point-source picker, excluding "auto"/"self" - only populated (non-empty)
 * when the actor actually has one or more storage items, since the dialog should only show a
 * picker at all when there is more than one possible source.
 */
export function getMagicPointSourceOptions(
  actor: RqgActor | null | undefined,
): SelectOptionData<string>[] {
  const storageItems = actor ? getStorageItems(actor) : [];
  if (storageItems.length === 0) {
    return [];
  }
  return [
    { value: AUTO_MAGIC_POINT_SOURCE, label: "RQG.Dialog.Common.MagicPointSourceOptions.Auto" },
    { value: SELF_MAGIC_POINT_SOURCE, label: "RQG.Dialog.Common.MagicPointSourceOptions.Self" },
    ...storageItems.map((item) => ({ value: item.id ?? "", label: item.name ?? "" })),
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

  const storageItems = getStorageItems(actor);
  if (selection === AUTO_MAGIC_POINT_SOURCE) {
    const storedAvailable = storageItems.reduce(
      (sum, item) => sum + (Number(item.system.storedMagicPoints?.value) || 0),
      0,
    );
    return storedAvailable + selfAvailable;
  }

  const item = storageItems.find((i) => i.id === selection);
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

function resolveMagicPointDraws(
  actor: RqgActor,
  amount: number,
  selection: MagicPointSourceSelection,
): { selfAmount: number; itemDraws: MagicPointDraw[] } {
  if (selection === SELF_MAGIC_POINT_SOURCE) {
    return { selfAmount: amount, itemDraws: [] };
  }

  if (selection === AUTO_MAGIC_POINT_SOURCE) {
    // Drain the actor's full draw order (storage items and self, interleaved by priority).
    const selfAvailable = Number(actor.system.attributes.magicPoints.value) || 0;
    let remaining = amount;
    const itemDraws: MagicPointDraw[] = [];
    let selfAmount = 0;
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
      const available = Number(entry.item.system.storedMagicPoints?.value) || 0;
      const draw = Math.min(available, remaining);
      if (draw > 0) {
        itemDraws.push({ item: entry.item, amount: draw });
        remaining -= draw;
      }
    }
    return { selfAmount, itemDraws };
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
  const { selfAmount, itemDraws } = resolveMagicPointDraws(actor, amount, selection);

  // The item draws and the self-pool draw touch different documents with no data dependency
  // between them, so they can be written concurrently rather than one awaited after the other.
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

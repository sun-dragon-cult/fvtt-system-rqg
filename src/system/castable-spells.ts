import type { RqgItem } from "@items/rqg-item.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { CultItem } from "@item-model/cult-data-model.ts";
import type { RuneMagicItem } from "@item-model/rune-magic-data-model.ts";
import type { SpiritMagicItem } from "@item-model/spirit-magic-data-model.ts";
import { boundSpiritSourceId, getAlliedBondActor, getBoundSpiritItems } from "./magic-point-source";
import {
  getBoundSpiritSpiritMagicItems,
  getExternalRuneMagicItems,
  getExternalSpiritMagicItems,
} from "./spell-source";
import { getMatrixSpellRows } from "./spell-matrix";
import type { RqgActor } from "../actors/rqg-actor";
import { systemId } from "./config";
import { documentRqidFlags } from "../data-model/shared/rqg-document-flags";

/** Where a castable spell comes from: the actor's own item, an Allied Spirit bond partner, a
 *  spirit bound in one of the actor's items, or a spell matrix. */
export type SpellSource = "own" | "allied" | "boundSpirit" | "matrix";

/**
 * A spell the actor can cast, from `actor.getCastableSpells()`.
 *
 * @public since 6.2.0
 */
export type CastableSpell = {
  type: "spiritMagic" | "runeMagic";
  name: string;
  img: string | null;
  points: number;
  /** Spirit magic only */
  isVariable: boolean;
  /** Rune magic only */
  isOneUse: boolean;
  /** Rune magic only: the caster's cult the spell is cast through */
  cultId: string | undefined;
  cultName: string | undefined;
  source: SpellSource;
  /** Name of the allied actor, bound spirit or matrix item */
  sourceName: string | undefined;
  /**
   * The same for every spell from one source: the caster's uuid for own spells, the ally's uuid,
   * `boundSpirit:<itemId>:<spiritUuid>` for a bound spirit, or the uuid of the matrix item
   */
  sourceId: string;
  /** Undefined when the spell has no rqid */
  rqid: string | undefined;
  /** Uuid of the actor whose list this is, the caster when the spell is cast without an actor */
  casterUuid: string;
  /** Uuid of the spell item, undefined for matrix spells */
  uuid: string | undefined;
  /** Matrix spells only: the item holding the matrix and the index of the spell in it */
  matrix: { itemId: string; entryIndex: number } | undefined;
};

/** Where a spell comes from and who casts it, shared by every spell from one source. */
type SpellOrigin = Pick<CastableSpell, "source" | "sourceId" | "sourceName" | "casterUuid">;

/** All spirit and rune magic the actor can cast, own spells first. */
export async function getCastableSpells(actor: RqgActor): Promise<CastableSpell[]> {
  const ally = getAlliedBondActor(actor);
  const ownItems = (actor.items.contents as RqgItem[]).sort((a, b) => a.sort - b.sort);
  const casterUuid = actor.uuid ?? "";
  const own: SpellOrigin = {
    source: "own",
    sourceId: casterUuid,
    sourceName: undefined,
    casterUuid,
  };
  const allied: SpellOrigin = {
    source: "allied",
    sourceId: ally?.uuid ?? "",
    sourceName: ally?.name ?? undefined,
    casterUuid,
  };

  const ownSpirit = ownItems
    .filter((i): i is SpiritMagicItem => i.type === ItemTypeEnum.SpiritMagic)
    .map((i) => spiritSpell(i, own));
  const alliedSpirit = getExternalSpiritMagicItems(actor, ally).map((i) => spiritSpell(i, allied));
  const boundSpirit = getBoundSpiritSpiritMagicItems(
    actor,
    getBoundSpiritItems(actor, ally),
  ).flatMap((source) => {
    const origin: SpellOrigin = {
      source: "boundSpirit",
      sourceId: boundSpiritSourceId(source.sourceItem, source.sourceActor),
      sourceName: source.sourceActor.name ?? undefined,
      casterUuid,
    };
    return source.items.map((i) => spiritSpell(i, origin));
  });
  // Quiet, since it's listed far more often than shown; the sheet warns about a broken entry
  const matrix = (await getMatrixSpellRows(actor, { quiet: true })).map((row): CastableSpell => {
    const origin: SpellOrigin = {
      source: "matrix",
      sourceId: row.sourceItem.uuid ?? "",
      sourceName: row.sourceItem.name ?? undefined,
      casterUuid,
    };
    return {
      ...spiritSpell(row.item, origin),
      img: row.sourceItem.img,
      uuid: undefined,
      matrix: { itemId: row.sourceItem.id ?? "", entryIndex: row.entryIndex },
    };
  });

  const ownRune = ownItems
    .filter((i): i is RuneMagicItem => i.type === ItemTypeEnum.RuneMagic)
    .map((i) => runeSpell(i, actor.items.get(i.system.cultId) as CultItem | undefined, own));
  const alliedRune = ownItems
    .filter((i): i is CultItem => i.type === ItemTypeEnum.Cult)
    .flatMap((cult) =>
      getExternalRuneMagicItems(actor, cult, ally).map((i) => runeSpell(i, cult, allied)),
    );

  return [...ownSpirit, ...alliedSpirit, ...boundSpirit, ...matrix, ...ownRune, ...alliedRune];
}

const itemRqid = (item: RqgItem): string | undefined =>
  item.getFlag(systemId, documentRqidFlags)?.id || undefined;

function spiritSpell(item: SpiritMagicItem, origin: SpellOrigin): CastableSpell {
  return {
    type: "spiritMagic",
    name: item.name ?? "",
    img: item.img,
    points: item.system.points,
    isVariable: item.system.isVariable,
    isOneUse: false,
    cultId: undefined,
    cultName: undefined,
    ...origin,
    rqid: itemRqid(item),
    uuid: item.uuid ?? undefined,
    matrix: undefined,
  };
}

function runeSpell(
  item: RuneMagicItem,
  cult: CultItem | undefined,
  origin: SpellOrigin,
): CastableSpell {
  return {
    type: "runeMagic",
    name: item.name ?? "",
    img: item.img,
    points: item.system.points,
    isVariable: false,
    isOneUse: item.system.isOneUse,
    cultId: cult?.id ?? undefined,
    cultName: cult?.name ?? undefined,
    ...origin,
    rqid: itemRqid(item),
    uuid: item.uuid ?? undefined,
    matrix: undefined,
  };
}

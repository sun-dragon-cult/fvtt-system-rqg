import type { RqgItem } from "@items/rqg-item.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { CultItem } from "@item-model/cult-data-model.ts";
import type { RuneMagicItem } from "@item-model/rune-magic-data-model.ts";
import type { SpiritMagicItem } from "@item-model/spirit-magic-data-model.ts";
import { getAlliedBondActor, getBoundSpiritItems } from "./magic-point-source";
import {
  getBoundSpiritSpiritMagicItems,
  getExternalRuneMagicItems,
  getExternalSpiritMagicItems,
} from "./spell-source";
import { getMatrixSpellSlots } from "./spell-matrix";
import type { RqgActor } from "../actors/rqg-actor";

/** Where a castable spell comes from: the actor's own item, an Allied Spirit bond partner, a
 *  spirit bound in one of the actor's items, or a spell matrix. */
export type SpellSource = "own" | "allied" | "boundSpirit" | "matrix";

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
  /** Uuid of the spell item, undefined for matrix spells */
  uuid: string | undefined;
  /** Matrix spells only: the item holding the matrix and the index of the spell in it */
  matrix: { itemId: string; entryIndex: number } | undefined;
};

/** All spirit and rune magic the actor can cast, own spells first. */
export function getCastableSpells(actor: RqgActor): CastableSpell[] {
  const ally = getAlliedBondActor(actor);
  const ownItems = (actor.items.contents as RqgItem[]).sort((a, b) => a.sort - b.sort);

  const ownSpirit = ownItems
    .filter((i): i is SpiritMagicItem => i.type === ItemTypeEnum.SpiritMagic)
    .map((i) => spiritSpell(i, "own", undefined));
  const alliedSpirit = getExternalSpiritMagicItems(actor, ally).map((i) =>
    spiritSpell(i, "allied", ally?.name ?? undefined),
  );
  const boundSpirit = getBoundSpiritSpiritMagicItems(
    actor,
    getBoundSpiritItems(actor, ally),
  ).flatMap((source) =>
    source.items.map((i) => spiritSpell(i, "boundSpirit", source.sourceActor.name ?? undefined)),
  );
  const matrix = getMatrixSpellSlots(actor).map((slot): CastableSpell => ({
    type: "spiritMagic",
    name: slot.name,
    img: slot.sourceItem.img,
    points: Number(slot.sourceItem.system.matrixSpells?.[slot.entryIndex]?.points) || 0,
    isVariable: false,
    isOneUse: false,
    cultId: undefined,
    cultName: undefined,
    source: "matrix",
    sourceName: slot.sourceItem.name ?? undefined,
    uuid: undefined,
    matrix: { itemId: slot.sourceItem.id ?? "", entryIndex: slot.entryIndex },
  }));

  const ownRune = ownItems
    .filter((i): i is RuneMagicItem => i.type === ItemTypeEnum.RuneMagic)
    .map((i) => runeSpell(i, actor.items.get(i.system.cultId) as CultItem | undefined, "own"));
  const alliedRune = ownItems
    .filter((i): i is CultItem => i.type === ItemTypeEnum.Cult)
    .flatMap((cult) =>
      getExternalRuneMagicItems(actor, cult, ally).map((i) =>
        runeSpell(i, cult, "allied", ally?.name ?? undefined),
      ),
    );

  return [...ownSpirit, ...alliedSpirit, ...boundSpirit, ...matrix, ...ownRune, ...alliedRune];
}

function spiritSpell(
  item: SpiritMagicItem,
  source: SpellSource,
  sourceName: string | undefined,
): CastableSpell {
  return {
    type: "spiritMagic",
    name: item.name ?? "",
    img: item.img,
    points: item.system.points,
    isVariable: item.system.isVariable,
    isOneUse: false,
    cultId: undefined,
    cultName: undefined,
    source,
    sourceName,
    uuid: item.uuid ?? undefined,
    matrix: undefined,
  };
}

function runeSpell(
  item: RuneMagicItem,
  cult: CultItem | undefined,
  source: SpellSource,
  sourceName?: string,
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
    source,
    sourceName,
    uuid: item.uuid ?? undefined,
    matrix: undefined,
  };
}

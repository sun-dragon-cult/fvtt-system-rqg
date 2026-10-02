import type { RqgItem } from "@items/rqg-item.ts";
import type { CultItem } from "@item-model/cult-data-model.ts";
import type { PassionItem } from "@item-model/passion-data-model.ts";
import type { RuneItem } from "@item-model/rune-data-model.ts";
import type { RuneMagicItem } from "@item-model/rune-magic-data-model.ts";
import type { SkillItem } from "@item-model/skill-data-model.ts";
import type { SkillCategoryEnum } from "@item-model/skill-enums.ts";
import type { SpiritMagicItem } from "@item-model/spirit-magic-data-model.ts";
import type { UsageType, WeaponItem } from "@item-model/weapon-data-model.ts";
import type { EquippedStatus } from "@item-model/i-physical-item.ts";
import { abilityItemTypes, ItemTypeEnum } from "@item-model/item-types.ts";
import type { Characteristics } from "../../data-model/actor-data/characteristics";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data";
import { weaponUsageTypes } from "../../data-model/shared/weapon-usage-choices";
import {
  getWeaponUsageChanceInfo,
  hasLinkedSkillReference,
} from "../../items/weapon-item/weapon-skill-links";
import { getAlliedBondActor, getBoundSpiritItems } from "../magic-point-source";
import {
  getBoundSpiritSpiritMagicItems,
  getExternalRuneMagicItems,
  getExternalSpiritMagicItems,
} from "../spell-source";
import { getMatrixSpellSlots } from "../spell-matrix";
import { assertDocumentSubType } from "../util";
import { type ActorRef, resolveActor } from "./api-resolve";

export type AbilityType = (typeof abilityItemTypes)[number];

export type AbilityInfo = {
  id: string;
  uuid: string;
  rqid: string | undefined;
  name: string;
  img: string | null;
  type: AbilityType;
  chance: number;
  /** Only for skills */
  category: SkillCategoryEnum | undefined;
  hasExperience: boolean;
};

/** Skills, runes and passions sorted by name. */
export function abilities(
  actorRef?: ActorRef,
  options: { types?: readonly AbilityType[] } = {},
): AbilityInfo[] {
  const { actor } = resolveActor(actorRef);
  const types: readonly string[] = options.types ?? abilityItemTypes;
  return (actor.items.contents as RqgItem[])
    .filter((i) => types.includes(i.type))
    .map((i) => {
      const item = i as SkillItem | RuneItem | PassionItem;
      return {
        id: item.id ?? "",
        uuid: item.uuid ?? "",
        rqid: item.getFlag("rqg", "documentRqidFlags")?.id,
        name: item.name ?? "",
        img: item.img,
        type: item.type as AbilityType,
        chance: Number(item.system.chance) || 0,
        category:
          item.type === ItemTypeEnum.Skill ? (item as SkillItem).system.category : undefined,
        hasExperience: !!item.system.hasExperience,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type CharacteristicName = keyof Characteristics;

export function characteristics(actorRef?: ActorRef): Record<CharacteristicName, number | null> {
  const { actor } = resolveActor(actorRef);
  const c = actor.system.characteristics;
  return {
    strength: c.strength.value,
    constitution: c.constitution.value,
    size: c.size.value,
    dexterity: c.dexterity.value,
    intelligence: c.intelligence.value,
    power: c.power.value,
    charisma: c.charisma.value,
  };
}

export type WeaponUsageInfo = {
  weaponId: string;
  weaponUuid: string;
  name: string;
  img: string | null;
  usage: UsageType;
  equippedStatus: EquippedStatus;
  skillId: string | undefined;
  skillName: string | undefined;
  /** Attack chance including weapon effect modifiers */
  chance: number;
  strikeRank: number | null;
  /** Under the STR/DEX minimums for this usage */
  unusable: boolean;
};

/** One entry per weapon usage that has a linked skill (the ones the attack dialog offers). */
export function weaponUsages(
  actorRef?: ActorRef,
  options: { includeUnequipped?: boolean } = {},
): WeaponUsageInfo[] {
  const { actor } = resolveActor(actorRef);
  const weapons = (actor.items.contents as RqgItem[])
    .filter((i): i is WeaponItem => i.type === ItemTypeEnum.Weapon)
    .filter((w) => options.includeUnequipped || w.system.equippedStatus === "equipped")
    .sort((a, b) => a.sort - b.sort);

  return weapons.flatMap((weapon) =>
    weaponUsageTypes
      .filter((usage) => hasLinkedSkillReference(weapon, usage))
      .map((usage) => {
        const info = getWeaponUsageChanceInfo(actor, weapon, usage);
        return {
          weaponId: weapon.id ?? "",
          weaponUuid: weapon.uuid ?? "",
          name: weapon.name ?? "",
          img: weapon.img,
          usage,
          equippedStatus: weapon.system.equippedStatus,
          skillId: info.skillItem?.id ?? undefined,
          skillName: info.skillItem?.name ?? undefined,
          chance: info.totalChance,
          strikeRank: weapon.system.usage[usage].strikeRank ?? null,
          unusable: info.unusable,
        };
      }),
  );
}

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
export function spells(actorRef?: ActorRef): CastableSpell[] {
  const { actor } = resolveActor(actorRef);
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

export type ActorAttributesInfo = {
  hitPoints: { value: number | null; max: number };
  magicPoints: { value: number | null; max: number };
  runePoints: { cultId: string; cultName: string; value: number | null; max: number | null }[];
  heroPoints: number;
  reputation: number;
  dexStrikeRank: number | null;
  sizStrikeRank: number | null;
  damageBonus: string;
  health: string;
};

export function attributes(actorRef?: ActorRef): ActorAttributesInfo {
  const { actor } = resolveActor(actorRef);
  assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);
  const a = actor.system.attributes;
  const cults = (actor.items.contents as RqgItem[]).filter(
    (i): i is CultItem => i.type === ItemTypeEnum.Cult,
  );
  return {
    hitPoints: { value: a.hitPoints.value, max: a.hitPoints.max },
    magicPoints: { value: a.magicPoints.value, max: a.magicPoints.max },
    runePoints: cults.map((cult) => ({
      cultId: cult.id ?? "",
      cultName: cult.name ?? "",
      value: cult.system.runePoints.value,
      max: cult.system.runePoints.max,
    })),
    heroPoints: a.heroPoints,
    reputation: actor.system.background.reputation ?? 0,
    dexStrikeRank: a.dexStrikeRank ?? null,
    sizStrikeRank: a.sizStrikeRank ?? null,
    damageBonus: a.damageBonus ?? "",
    health: a.health,
  };
}

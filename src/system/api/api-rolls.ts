import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import type { PhysicalItem } from "@item-model/item-types.ts";
import { abilityItemTypes, ItemTypeEnum } from "@item-model/item-types.ts";
import type { RuneMagicItem } from "@item-model/rune-magic-data-model.ts";
import type { SpiritMagicItem } from "@item-model/spirit-magic-data-model.ts";
import type { UsageType, WeaponItem } from "@item-model/weapon-data-model.ts";
import type { AbilityRoll } from "../../rolls/ability-roll/ability-roll";
import type { Modifier } from "../../rolls/ability-roll/ability-roll.types";
import type { CharacteristicRoll } from "../../rolls/characteristic-roll/characteristic-roll";
import type { RuneMagicRoll } from "../../rolls/rune-magic-roll/rune-magic-roll";
import type { SpiritMagicRoll } from "../../rolls/spirit-magic-roll/spirit-magic-roll";
import type { SpellCastOptions } from "../../rolls/roll-method-options";
import { AUTO_MAGIC_POINT_SOURCE } from "../magic-point-source";
import { resolveMatrixSpellItem } from "../spell-matrix";
import { RqgLogger } from "../logging/rqg-logger";
import { type ActorRef, findItem, type ItemRef, resolveActor, resolveItem } from "./api-resolve";
import type { Characteristics } from "../../data-model/actor-data/characteristics";
import type { CastableSpell } from "../castable-spells";

const logger = new RqgLogger("Api");

export type CharacteristicName = keyof Characteristics;

export type RollOptions = {
  /** Who rolls. Only needed when the item is given by name/id/rqid, or to pick the speaking token. */
  actor?: ActorRef;
  /** Roll at once without opening the roll dialog. The roll is then returned. */
  skipDialog?: boolean;
  modifiers?: Modifier[];
  rollMode?: foundry.dice.Roll.Mode;
};

/** Roll a skill, rune or passion. Returns the roll when `skipDialog` is set. */
export async function ability(
  ref: ItemRef,
  options: RollOptions = {},
): Promise<AbilityRoll | undefined> {
  const { item, token } = resolveItemAndActor(ref, options.actor, abilityItemTypes);
  return await item.roll({
    skipDialog: options.skipDialog,
    token,
    modifiers: options.modifiers,
    rollMode: options.rollMode,
  });
}

/** Roll a characteristic, by default ×5. Returns the roll when `skipDialog` is set. */
export async function characteristic(
  name: CharacteristicName,
  options: RollOptions & { difficulty?: number } = {},
): Promise<CharacteristicRoll | undefined> {
  const { actor, token } = resolveActor(options.actor);
  if (!(name in actor.system.characteristics)) {
    return logger.throw(`"${name}" is not a characteristic`);
  }
  return await actor.rollCharacteristic(name, {
    skipDialog: options.skipDialog,
    token,
    difficulty: options.difficulty,
    modifiers: options.modifiers,
    rollMode: options.rollMode,
  });
}

/** Roll the actor's Reputation. Returns the roll when `skipDialog` is set. */
export async function reputation(options: RollOptions = {}): Promise<AbilityRoll | undefined> {
  const { actor, token } = resolveActor(options.actor);
  return await actor.rollReputation({
    skipDialog: options.skipDialog,
    token,
    modifiers: options.modifiers,
    rollMode: options.rollMode,
  });
}

/**
 * Open the attack dialog for a weapon. `usage` preselects how the weapon is used and is
 * remembered on the weapon, the same way as when it's changed in the dialog.
 */
export async function attack(
  ref: ItemRef,
  options: { actor?: ActorRef; usage?: UsageType } = {},
): Promise<void> {
  const { item } = resolveItemAndActor<WeaponItem>(ref, options.actor, [ItemTypeEnum.Weapon]);
  await item.attack({ usage: options.usage });
}

export type SpellRollOptions = RollOptions & {
  /** Points to cast with, defaults to the spell's points */
  levelUsed?: number;
  magicPointBoost?: number;
  /**
   * Where magic points are drawn from: `"auto"` (the default) follows the caster's draw order;
   * `"self"`, `"ally"`, the id of a magic point storage item or a bound spirit's `sourceId` draws
   * only from that source
   */
  magicPointSource?: string;
};

/**
 * Cast a spirit magic spell. The spell can be given as one of the `CastableSpell`s from
 * `actor.getCastableSpells()`, which also covers spells from Allied Spirits, bound spirits and matrices,
 * and is cast by that actor.
 * Returns the roll when `skipDialog` is set and the spell was cast.
 */
export async function spiritMagic(
  ref: ItemRef | CastableSpell,
  options: SpellRollOptions = {},
): Promise<SpiritMagicRoll | undefined> {
  const { actor, token } = resolveCaster(ref, options.actor);
  checkMagicPointSource(actor, options.magicPointSource);
  const item = await resolveSpell<SpiritMagicItem>(actor, ref, ItemTypeEnum.SpiritMagic);
  return (await actor.castSpell(item, castOptions(options, token))) as SpiritMagicRoll | undefined;
}

/**
 * Cast a rune magic spell, see `spiritMagic`. Returns the roll when `skipDialog` is set and the
 * spell was cast.
 */
export async function runeMagic(
  ref: ItemRef | CastableSpell,
  options: SpellRollOptions = {},
): Promise<RuneMagicRoll | undefined> {
  const { actor, token } = resolveCaster(ref, options.actor);
  checkMagicPointSource(actor, options.magicPointSource);
  const item = await resolveSpell<RuneMagicItem>(actor, ref, ItemTypeEnum.RuneMagic);
  return (await actor.castSpell(item, castOptions(options, token))) as RuneMagicRoll | undefined;
}

/** A wrong source would otherwise just look like too few magic points. */
function checkMagicPointSource(caster: RqgActor, source: string | undefined): void {
  if (
    source != null &&
    source !== AUTO_MAGIC_POINT_SOURCE &&
    !caster.getMagicPointSources().some((s) => s.id === source)
  ) {
    logger.throw(`"${source}" is not one of the magic point sources of "${caster.name}"`);
  }
}

function castOptions(options: SpellRollOptions, token: TokenDocument | null): SpellCastOptions {
  return {
    skipDialog: options.skipDialog,
    token,
    levelUsed: options.levelUsed,
    magicPointBoost: options.magicPointBoost,
    magicPointSource: options.magicPointSource,
    modifiers: options.modifiers,
    rollMode: options.rollMode,
  };
}

function resolveItemAndActor<T extends RqgItem>(
  ref: ItemRef,
  actorRef: ActorRef | undefined,
  types: readonly string[],
): { item: T; actor: RqgActor; token: TokenDocument | null } {
  if (typeof ref !== "string" && actorRef == null) {
    const actor = ref.actor as RqgActor | null;
    if (!actor) {
      return logger.throw(`"${ref.name}" is not owned by an actor`);
    }
    return { item: resolveItem<T>(actor, ref, types), actor, token: actor.token ?? null };
  }
  const { actor, token } = resolveActor(actorRef);
  return { item: resolveItem<T>(actor, ref, types), actor, token };
}

function isCastableSpell(ref: ItemRef | CastableSpell): ref is CastableSpell {
  return typeof ref === "object" && "source" in ref && !("documentName" in ref);
}

/**
 * The caster defaults to the owner of a given spell item, or the actor a `CastableSpell` was listed
 * for, else the selected token.
 */
function resolveCaster(
  ref: ItemRef | CastableSpell,
  actorRef: ActorRef | undefined,
): { actor: RqgActor; token: TokenDocument | null } {
  if (ref == null) {
    return logger.throw("No spell given");
  }
  checkSpellRef(ref);
  if (actorRef == null && typeof ref !== "string") {
    if (isCastableSpell(ref)) {
      return resolveActor(ref.casterUuid || undefined);
    }
    if (ref.actor) {
      const actor = ref.actor as RqgActor;
      return { actor, token: actor.token ?? null };
    }
  }
  return resolveActor(actorRef);
}

/** Common mistakes otherwise fail later with a message about an item of type undefined. */
function checkSpellRef(ref: unknown): void {
  if (typeof ref === "string" || isCastableSpell(ref as CastableSpell)) {
    return;
  }
  if (typeof (ref as { then?: unknown }).then === "function") {
    logger.throw("The spell is a Promise, use `await actor.getCastableSpells()`");
  }
  if (Array.isArray(ref)) {
    logger.throw("Give one spell, not a list of spells");
  }
  if (typeof (ref as { type?: unknown }).type !== "string") {
    logger.throw("Give a spell item, its name, or one entry of `await actor.getCastableSpells()`");
  }
}

async function resolveSpell<T extends SpiritMagicItem | RuneMagicItem>(
  caster: RqgActor,
  ref: ItemRef | CastableSpell,
  type: string,
): Promise<T> {
  // A listed spell is cast by the actor it was listed for
  if (isCastableSpell(ref) && ref.casterUuid && caster.uuid !== ref.casterUuid) {
    return logger.throw(
      `"${ref.name}" is from the castable spells of ${ref.casterUuid}, not of "${caster.name}"`,
    );
  }
  if (typeof ref !== "string" && !isCastableSpell(ref)) {
    return resolveItem<T>(ref.actor as RqgActor, ref, [type]);
  }
  const ownMatch = typeof ref === "string" ? findItem(caster, ref, [type]) : undefined;
  if (ownMatch?.type === type) {
    return ownMatch as T;
  }
  const spell = isCastableSpell(ref) ? ref : await findCastableSpellByName(caster, ref, type);
  if (!spell || spell.type !== type) {
    return logger.throw(`No ${type} spell "${isCastableSpell(ref) ? ref.name : ref}" found`);
  }
  if (spell.matrix) {
    const matrixItem = caster.items.get(spell.matrix.itemId) as PhysicalItem | undefined;
    // A kept list can be stale: the matrix unequipped, or its entries changed since
    const entry = matrixItem?.system.matrixSpells?.[spell.matrix.entryIndex];
    if (
      matrixItem?.system.equippedStatus !== "equipped" ||
      (entry?.spellRqidLink?.rqid || undefined) !== spell.rqid
    ) {
      return logger.throw(`"${spell.name}" is no longer in an equipped matrix`);
    }
    const item = await resolveMatrixSpellItem(matrixItem, spell.matrix.entryIndex);
    if (!item) {
      return logger.throw(`Could not resolve matrix spell "${spell.name}"`);
    }
    return item as T;
  }
  const item = spell.uuid ? (fromUuidSync(spell.uuid) as RqgItem | null) : null;
  if (!item) {
    return logger.throw(`Spell "${spell.name}" no longer exists`);
  }
  return item as T;
}

async function findCastableSpellByName(
  caster: RqgActor,
  name: string,
  type: string,
): Promise<CastableSpell | undefined> {
  const candidates = (await caster.getCastableSpells()).filter((s) => s.type === type);
  const lowerName = name.toLowerCase();
  return (
    candidates.find((s) => s.name === name) ??
    candidates.find((s) => s.name.toLowerCase() === lowerName)
  );
}

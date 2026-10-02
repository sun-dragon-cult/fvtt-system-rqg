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
import { hasLinkedSkillReference } from "../../items/weapon-item/weapon-skill-links";
import { resolveMatrixSpellItem } from "../spell-matrix";
import { RqgLogger } from "../logging/rqg-logger";
import { type ActorRef, findItem, type ItemRef, resolveActor, resolveItem } from "./api-resolve";
import { type CastableSpell, type CharacteristicName, spells } from "./api-query";

const logger = new RqgLogger("Api");

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
  const rollOptions = { modifiers: options.modifiers, rollMode: options.rollMode };
  if (options.skipDialog) {
    return await item.abilityRollImmediate(rollOptions, token);
  }
  await item.abilityRoll(token, rollOptions);
  return undefined;
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
  if (options.skipDialog) {
    return await actor.characteristicRollImmediate(name, token, {
      difficulty: options.difficulty,
      modifiers: options.modifiers,
      rollMode: options.rollMode,
    });
  }
  await actor.characteristicRoll(name, token);
  return undefined;
}

/** Roll the actor's Reputation. Returns the roll when `skipDialog` is set. */
export async function reputation(options: RollOptions = {}): Promise<AbilityRoll | undefined> {
  const { actor, token } = resolveActor(options.actor);
  if (options.skipDialog) {
    return await actor.reputationRollImmediate(token, {
      modifiers: options.modifiers,
      rollMode: options.rollMode,
    });
  }
  await actor.reputationRoll(token);
  return undefined;
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
  if (options.usage && options.usage !== item.system.defaultUsage) {
    if (!hasLinkedSkillReference(item, options.usage)) {
      return logger.throw(`"${item.name}" can't be used as ${options.usage}`);
    }
    await item.update({ system: { defaultUsage: options.usage } });
  }
  await item.attack();
}

export type SpellRollOptions = RollOptions & {
  /** Points to cast with, defaults to the spell's points */
  levelUsed?: number;
  magicPointBoost?: number;
};

/**
 * Cast a spirit magic spell. The spell can be given as one of the `CastableSpell`s from
 * `query.spells`, which also covers spells from Allied Spirits, bound spirits and matrices.
 * Returns the roll when `skipDialog` is set and the spell was cast.
 */
export async function spiritMagic(
  ref: ItemRef | CastableSpell,
  options: SpellRollOptions = {},
): Promise<SpiritMagicRoll | undefined> {
  const { actor, token } = resolveCaster(ref, options.actor);
  const item = await resolveSpell<SpiritMagicItem>(actor, ref, ItemTypeEnum.SpiritMagic);
  if (options.skipDialog) {
    return await item.spiritMagicRollImmediate(
      {
        levelUsed: options.levelUsed ?? item.system.points,
        magicPointBoost: options.magicPointBoost,
        modifiers: options.modifiers,
        rollMode: options.rollMode,
      },
      token,
      actor,
    );
  }
  await item.spiritMagicRoll(token, actor);
  return undefined;
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
  const item = await resolveSpell<RuneMagicItem>(actor, ref, ItemTypeEnum.RuneMagic);
  if (options.skipDialog) {
    return await item.runeMagicRollImmediate(
      {
        levelUsed: options.levelUsed,
        magicPointBoost: options.magicPointBoost,
        modifiers: options.modifiers,
        rollMode: options.rollMode,
      },
      token,
      actor,
    );
  }
  await item.runeMagicRoll(token, actor);
  return undefined;
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

/** The caster defaults to the owner of a given spell item, else the selected token. */
function resolveCaster(
  ref: ItemRef | CastableSpell,
  actorRef: ActorRef | undefined,
): { actor: RqgActor; token: TokenDocument | null } {
  if (actorRef == null && typeof ref !== "string" && !isCastableSpell(ref) && ref.actor) {
    const actor = ref.actor as RqgActor;
    return { actor, token: actor.token ?? null };
  }
  return resolveActor(actorRef);
}

async function resolveSpell<T extends SpiritMagicItem | RuneMagicItem>(
  caster: RqgActor,
  ref: ItemRef | CastableSpell,
  type: string,
): Promise<T> {
  if (typeof ref !== "string" && !isCastableSpell(ref)) {
    return resolveItem<T>(ref.actor as RqgActor, ref, [type]);
  }
  const ownMatch = typeof ref === "string" ? findItem(caster, ref, [type]) : undefined;
  if (ownMatch?.type === type) {
    return ownMatch as T;
  }
  const spell = isCastableSpell(ref) ? ref : findCastableSpellByName(caster, ref, type);
  if (!spell || spell.type !== type) {
    return logger.throw(`No ${type} spell "${isCastableSpell(ref) ? ref.name : ref}" found`);
  }
  if (spell.matrix) {
    const matrixItem = caster.items.get(spell.matrix.itemId) as PhysicalItem | undefined;
    const item = matrixItem && (await resolveMatrixSpellItem(matrixItem, spell.matrix.entryIndex));
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

function findCastableSpellByName(
  caster: RqgActor,
  name: string,
  type: string,
): CastableSpell | undefined {
  const candidates = spells(caster).filter((s) => s.type === type);
  const lowerName = name.toLowerCase();
  return (
    candidates.find((s) => s.name === name) ??
    candidates.find((s) => s.name.toLowerCase() === lowerName)
  );
}

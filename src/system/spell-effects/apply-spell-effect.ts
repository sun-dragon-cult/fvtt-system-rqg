import { isDocumentSubType, localize } from "../util";
import { Rqid } from "../api/rqid-api";
import { RQG_CONFIG, systemId } from "../config";
import { resolveSpellEffectRqid } from "./resolve-spell-effect-rqid";
import { spellEffectName } from "./spell-effect-name";
import {
  chooseSpellTargetItem,
  findSpellTargetCandidates,
  type SpellTargetRule,
} from "./select-spell-effect-target";
import {
  decideSpellEffectStacking,
  type ExistingSpellEffect,
  type SpellEffectStacking,
} from "./spell-effect-stacking";
import type { SpellEffectBlockedReason } from "../../active-effect/data-model/spell-effect.defs";
import { SpellDurationEnum } from "../../data-model/item-data/spell";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import type { WeaponItem } from "@item-model/weapon-data-model.ts";
import { projectileLabel, splitOffProjectile } from "@items/weapon-item/spelled-projectile";
import { runSpellApply } from "./run-spell-apply";
import { spellBehaviourOf } from "./spell-behaviour";
import { interceptIncomingSpell } from "./incoming-spell";

export type SpellEffectCast = {
  casterUuid: string;
  castMessageId: string;
  level: number;
  magicPointsSpent: number;
  runePointsSpent: number;
  casterSuccessLevel: number | undefined;
};

/** What Apply did - undefined from applySpellEffect when it did nothing and can be retried. */
export type SpellEffectApplied =
  | { outcome: "applied"; effectUuids: string[] }
  | { outcome: "blocked"; reason: SpellEffectBlockedReason }
  | { outcome: "resolved" };

/**
 * The scope a spell behaviour's `apply` runs with - part of the public API. It runs on the client
 * of whoever clicked Apply (the target's owner), or the active GM's when the behaviour is
 * `runAsGm`, and returns a SpellEffectApplied; "resolved" means it did its work without leaving an
 * effect.
 */
export type SpellApplyScope = {
  spell: RqgItem;
  targetActor: RqgActor;
  targetName: string;
  cast: SpellEffectCast;
  /** What Apply gives the effect of a Temporal spell, undefined for other durations. */
  duration: SpellEffectDuration | undefined;
};

export type SpellEffectDuration = { value: number; units: string };

export function spellApplyScope(
  spell: RqgItem,
  targetActor: RqgActor,
  targetName: string,
  cast: SpellEffectCast,
): SpellApplyScope {
  return { spell, targetActor, targetName, cast, duration: temporalDuration(spell) };
}

/** What a spell effect records about the cast that made it, as `system.spell`. */
export function spellProvenance(spell: RqgItem, cast: SpellEffectCast) {
  return {
    spellRqid: spell.flags?.rqg?.documentRqidFlags?.id ?? "",
    spellName: spell.name ?? "",
    spellUuid: spell.uuid,
    ...cast,
    casterSuccessLevel: cast.casterSuccessLevel ?? null,
  };
}

function linkedRqids(links: readonly { rqid?: string }[] | undefined): string[] {
  return (links ?? []).map((link) => link.rqid ?? "").filter((rqid) => !!rqid);
}

function existingSpellEffects(parent: RqgActor | RqgItem): ExistingSpellEffect[] {
  return parent.effects.contents.flatMap((effect: any) => {
    const spell = effect.system?.spell;
    return spell
      ? [
          {
            id: effect.id ?? "",
            name: effect.name ?? "",
            spellRqid: spell.spellRqid ?? "",
            level: spell.level ?? 0,
            incompatibleSpellRqids: linkedRqids(effect.system.incompatibleSpellRqidLinks),
            cancelsSpellRqids: linkedRqids(effect.system.cancelsSpellRqidLinks),
            expired: !!effect.duration?.expired,
          },
        ]
      : [];
  });
}

function pickerLabel(item: RqgItem, stacking: SpellEffectStacking): string {
  const itemName =
    isDocumentSubType<WeaponItem>(item, ItemTypeEnum.Weapon) && item.system.isProjectile
      ? projectileLabel(item)
      : (item.name ?? "");
  if (stacking.outcome === "cancel") {
    return localize("RQG.ChatMessage.SpellCast.TargetOption.cancelledActive", {
      itemName: itemName,
      effectName: stacking.cancelled.map((effect) => effect.name).join(", "),
    });
  }
  if (stacking.outcome === "blocked") {
    return localize(`RQG.ChatMessage.SpellCast.TargetOption.${stacking.reason}`, {
      itemName: itemName,
      effectName: stacking.by.name,
    });
  }
  const replaced = stacking.displaced.find((effect) => !effect.expired);
  return replaced
    ? localize("RQG.ChatMessage.SpellCast.TargetOption.replaces", {
        itemName: itemName,
        effectName: replaced.name,
      })
    : itemName;
}

function temporalDuration(spell: RqgItem): SpellEffectDuration | undefined {
  if ((spell.system as { duration?: string }).duration !== SpellDurationEnum.Temporal) {
    return undefined;
  }
  return spell.type === ItemTypeEnum.RuneMagic
    ? RQG_CONFIG.spellEffectDuration.runeMagicTemporal
    : RQG_CONFIG.spellEffectDuration.spiritMagicTemporal;
}

/**
 * Attach a copy of a spell's Active Effect template to the target - the only thing that creates a
 * spell effect, so every one carries its provenance. A spell whose behaviour has `apply` (the macro
 * tier) runs that instead and returns what it returns. Warns and returns undefined when the spell has
 * no template or the target has nothing it can attach to, and returns "blocked" when the same or an
 * incompatible spell already there keeps it from taking effect, or when it cancels one. Run on a client that owns the target.
 */
export async function applySpellEffect(
  spell: RqgItem,
  targetActor: RqgActor,
  targetName: string,
  cast: SpellEffectCast,
): Promise<SpellEffectApplied | undefined> {
  const spellName = spell.name ?? "";
  const scope = spellApplyScope(spell, targetActor, targetName, cast);
  const behaviour = spellBehaviourOf(spell);
  if (behaviour?.apply) {
    return (await interceptIncomingSpell(scope)) ?? runSpellApply(behaviour, scope);
  }
  const effectRqid = resolveSpellEffectRqid(spell as any);
  const template = effectRqid ? await Rqid.fromRqid(effectRqid) : undefined;
  const rule = (template as any)?.system?.spellTarget as SpellTargetRule | null | undefined;
  if (!(template instanceof ActiveEffect) || !rule) {
    ui.notifications?.warn(localize("RQG.ChatMessage.SpellCast.NoSpellEffect", { spellName }));
    return undefined;
  }

  const castStacking = {
    spellRqid: spell.flags?.rqg?.documentRqidFlags?.id ?? "",
    level: cast.level,
    incompatibleSpellRqids: linkedRqids((template.system as any).incompatibleSpellRqidLinks),
    cancelsSpellRqids: linkedRqids((template.system as any).cancelsSpellRqidLinks),
  };
  const stackingRule = game.settings?.get(systemId, "spellStackingRule") ?? "strongestTakesEffect";
  const stackingOn = (doc: RqgActor | RqgItem) =>
    decideSpellEffectStacking(castStacking, existingSpellEffects(doc), stackingRule);

  let parent: RqgActor | RqgItem | undefined = targetActor;
  if (rule.documentType) {
    const candidates = findSpellTargetCandidates(targetActor.items.contents, rule);
    if (!candidates.length) {
      ui.notifications?.warn(
        localize("RQG.ChatMessage.SpellCast.NoSpellEffectTarget", {
          spellName: spellName,
          targetName: targetName,
        }),
      );
      return undefined;
    }
    parent = await chooseSpellTargetItem(candidates as RqgItem[], spellName, (item) =>
      pickerLabel(item, stackingOn(item)),
    );
    if (!parent) {
      return undefined;
    }
  }
  // Only once Apply can no longer back out, since a protective spell may use up its effects
  const intercepted = await interceptIncomingSpell(scope);
  if (intercepted) {
    return intercepted;
  }
  if (isDocumentSubType<WeaponItem>(parent, ItemTypeEnum.Weapon)) {
    parent = await splitOffProjectile(parent);
  }

  const stacking = stackingOn(parent);
  if (stacking.outcome === "cancel") {
    await (parent as RqgItem).deleteEmbeddedDocuments(
      "ActiveEffect",
      stacking.cancelled.map((effect) => effect.id),
    );
    ui.notifications?.info(
      localize("RQG.ChatMessage.SpellCast.NotAppliedDetail.cancelledActive", {
        spellName: spellName,
        effectName: stacking.cancelled.map((effect) => effect.name).join(", "),
        parentName: parent.name ?? "",
      }),
    );
    return { outcome: "blocked", reason: "cancelledActive" };
  }
  if (stacking.outcome === "blocked") {
    ui.notifications?.warn(
      localize(`RQG.ChatMessage.SpellCast.NotAppliedDetail.${stacking.reason}`, {
        spellName: spellName,
        effectName: stacking.by.name,
        parentName: parent.name ?? "",
      }),
    );
    return { outcome: "blocked", reason: stacking.reason };
  }

  const data = template.toObject() as any;
  delete data._id;
  delete data.flags?.rqg?.documentRqidFlags;
  data.name = spellEffectName(spellName, cast.level);
  data.origin = spell.uuid;
  data.transfer = true;
  data.disabled = false;
  // core only stamps a start on effects parented to an actor, and without one it never expires
  data.start = { time: game.time?.worldTime ?? 0 };
  data.duration = { ...data.duration, ...scope.duration };
  data.system.spellTarget = null;
  data.system.matchSuspensionToEquippedStatus = true;
  data.system.spell = spellProvenance(spell, cast);

  if (stacking.displaced.length) {
    await (parent as RqgItem).deleteEmbeddedDocuments(
      "ActiveEffect",
      stacking.displaced.map((effect) => effect.id),
    );
  }
  const created = (await (parent as RqgItem).createEmbeddedDocuments("ActiveEffect", [data])) ?? [];
  return { outcome: "applied", effectUuids: created.map((effect) => effect.uuid) };
}

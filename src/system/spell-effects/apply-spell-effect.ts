import { localize } from "../util";
import { Rqid } from "../api/rqid-api";
import { RQG_CONFIG } from "../config";
import { resolveSpellEffectRqid } from "./resolve-spell-effect-rqid";
import {
  chooseSpellTargetItem,
  findSpellTargetCandidates,
  type SpellTargetRule,
} from "./select-spell-effect-target";
import { SpellDurationEnum } from "../../data-model/item-data/spell";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";

export type SpellEffectCast = {
  casterUuid: string;
  castMessageId: string;
  level: number;
  magicPointsSpent: number;
  runePointsSpent: number;
  casterSuccessLevel: number | undefined;
};

function temporalDuration(spell: RqgItem): { value: number; units: string } | undefined {
  if ((spell.system as { duration?: string }).duration !== SpellDurationEnum.Temporal) {
    return undefined;
  }
  return spell.type === ItemTypeEnum.RuneMagic
    ? RQG_CONFIG.spellEffectDuration.runeMagicTemporal
    : RQG_CONFIG.spellEffectDuration.spiritMagicTemporal;
}

/**
 * Attach a copy of a spell's Active Effect template to the target - the only thing that creates a
 * spell effect, so every one carries its provenance. Warns and returns undefined when the spell has
 * no template or the target has nothing it can attach to. Run on a client that owns the target.
 */
export async function applySpellEffect(
  spell: RqgItem,
  targetActor: RqgActor,
  cast: SpellEffectCast,
): Promise<string[] | undefined> {
  const spellName = spell.name ?? "";
  const effectRqid = resolveSpellEffectRqid(spell as any);
  const template = effectRqid ? await Rqid.fromRqid(effectRqid) : undefined;
  const rule = (template as any)?.system?.spellTarget as SpellTargetRule | null | undefined;
  if (!(template instanceof ActiveEffect) || !rule) {
    ui.notifications?.warn(localize("RQG.ChatMessage.SpellCast.NoSpellEffect", { spellName }));
    return undefined;
  }

  let parent: RqgActor | RqgItem | undefined = targetActor;
  if (rule.documentType) {
    const candidates = findSpellTargetCandidates(targetActor.items.contents, rule);
    if (!candidates.length) {
      ui.notifications?.warn(
        localize("RQG.ChatMessage.SpellCast.NoSpellEffectTarget", {
          spellName: spellName,
          targetName: targetActor.name ?? "",
        }),
      );
      return undefined;
    }
    parent = await chooseSpellTargetItem(candidates as RqgItem[], spellName);
    if (!parent) {
      return undefined;
    }
  }

  const data = template.toObject() as any;
  delete data._id;
  delete data.flags?.rqg?.documentRqidFlags;
  data.name = `${spellName} (${cast.level})`;
  data.origin = spell.uuid;
  data.transfer = true;
  data.disabled = false;
  // core only stamps a start on effects parented to an actor, and without one it never expires
  data.start = { time: game.time?.worldTime ?? 0 };
  data.duration = { ...data.duration, ...temporalDuration(spell) };
  data.system.spellTarget = null;
  data.system.matchSuspensionToEquippedStatus = true;
  data.system.spell = {
    spellRqid: spell.flags?.rqg?.documentRqidFlags?.id ?? "",
    spellName: spellName,
    spellUuid: spell.uuid,
    ...cast,
    casterSuccessLevel: cast.casterSuccessLevel ?? null,
  };

  const created = (await (parent as RqgItem).createEmbeddedDocuments("ActiveEffect", [data])) ?? [];
  return created.map((effect) => effect.uuid);
}

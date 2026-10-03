import { localize } from "../util";
import { systemId } from "../config";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import type { SpellEffectApplied, SpellEffectCast, SpellMacroScope } from "./apply-spell-effect";

/** What a player's client sends the GM to run a spell macro flagged runAsGm. */
export type RunSpellMacroQueryData = {
  macroUuid: string;
  spellUuid: string;
  targetActorUuid: string;
  targetName: string;
  cast: SpellEffectCast;
};

const spellEffectOutcomes: readonly string[] = ["applied", "blocked", "resolved"];

async function executeSpellMacro(
  macro: Macro,
  scope: SpellMacroScope,
): Promise<SpellEffectApplied | undefined> {
  const result = (await macro.execute(scope as any)) as SpellEffectApplied | undefined;
  return spellEffectOutcomes.includes((result as { outcome?: string } | undefined)?.outcome ?? "")
    ? result
    : undefined;
}

/**
 * Run a spell's macro. One flagged `flags.rqg.runAsGm` (e.g. one that creates tokens, which players
 * may not do) is run on the active GM's client when a player clicks Apply.
 */
export async function runSpellMacro(
  macro: Macro,
  scope: SpellMacroScope,
): Promise<SpellEffectApplied | undefined> {
  if (!macro.getFlag(systemId, "runAsGm") || game.user?.isGM) {
    return executeSpellMacro(macro, scope);
  }
  const gm = game.users?.activeGM;
  if (!gm) {
    ui.notifications?.warn(
      localize("RQG.ChatMessage.SpellCast.NeedsActiveGm", { spellName: scope.spell.name ?? "" }),
    );
    return undefined;
  }
  const queryData: RunSpellMacroQueryData = {
    macroUuid: macro.uuid ?? "",
    spellUuid: scope.spell.uuid ?? "",
    targetActorUuid: scope.targetActor.uuid ?? "",
    targetName: scope.targetName,
    cast: scope.cast,
  };
  return (await gm.query("rqg.runSpellMacro", queryData)) as SpellEffectApplied | undefined;
}

async function handleRunSpellMacroQuery(
  data: RunSpellMacroQueryData,
): Promise<SpellEffectApplied | undefined> {
  const [macro, spell, targetActor] = await Promise.all([
    fromUuid(data.macroUuid),
    fromUuid(data.spellUuid),
    fromUuid(data.targetActorUuid),
  ]);
  if (!(macro instanceof Macro) || !macro.getFlag(systemId, "runAsGm") || !spell || !targetActor) {
    return undefined;
  }
  return executeSpellMacro(macro, {
    spell: spell as RqgItem,
    targetActor: targetActor as RqgActor,
    targetName: data.targetName,
    cast: data.cast,
  });
}

export function initRunSpellMacroQuery(): void {
  CONFIG.queries["rqg.runSpellMacro"] = handleRunSpellMacroQuery;
}

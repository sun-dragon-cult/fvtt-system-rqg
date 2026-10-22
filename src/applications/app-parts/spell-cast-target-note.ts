import { getTargetedTokenNames, getTokenFromActor, localize } from "../../system/util";
import { spellBehaviorOf } from "../../system/spell-effects/spell-behavior";
import { metersToPixels } from "../../system/spell-effects/scene-distance";
import type { RqgItem } from "@items/rqg-item.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { isSpiritCombatGate, SpellResistedByEnum } from "../../data-model/item-data/spell";

export type SpellCastTargetNote = {
  /** Comma-joined target names, or the "nothing targeted" label. */
  targetName: string;
  /** Explains an unusual target count; "" when there is exactly one, or the spell doesn't care. */
  targetNote: string;
  /** "warning" when the cast is blocked, "hint" when it merely differs, "" otherwise. */
  targetNoteClass: string;
  /** More targets than the spell can resolve, so casting is refused before anything is spent. */
  tooManyTargets: boolean;
};

/**
 * What the cast dialog says about the current targets. Only a spell resolved by resistance rolls or
 * gated on spirit combat constrains them - everything else is free to be cast at any number of
 * tokens, or none.
 */
export function buildSpellCastTargetNote(resistedBy: SpellResistedByEnum): SpellCastTargetNote {
  const targetNames = getTargetedTokenNames();
  const targetCount = game.user?.targets.size ?? 0;
  const spiritCombat = isSpiritCombatGate(resistedBy);
  const perTarget = resistedBy === SpellResistedByEnum.ResistanceRollPerTarget;
  const constrained = resistedBy === SpellResistedByEnum.ResistanceRoll || spiritCombat;

  const tooManyTargets = constrained && targetCount > 1;
  let targetNote = "";
  let targetNoteClass = "";
  if (tooManyTargets) {
    targetNote = localize("RQG.Dialog.SpellCast.SingleTargetOnly");
    targetNoteClass = "warning";
  } else if (resistedBy === SpellResistedByEnum.ResistanceRollArea && targetCount === 0) {
    targetNote = localize("RQG.Dialog.SpellCast.AreaUntargeted");
    targetNoteClass = "hint";
  } else if (spiritCombat && targetCount === 0) {
    targetNote = localize("RQG.Dialog.SpellCast.SpiritCombatUntargeted");
    targetNoteClass = "hint";
  } else if ((constrained || perTarget) && targetCount === 0) {
    targetNote = localize("RQG.Dialog.SpellCast.WillAskToCastOnSelf");
    targetNoteClass = "hint";
  }

  return {
    targetName: targetNames || localize("RQG.Dialog.Common.NoTarget"),
    targetNote: targetNote,
    targetNoteClass: targetNoteClass,
    tooManyTargets: tooManyTargets,
  };
}

/** Keep a rendered cast dialog's target row and Roll button in step with the canvas. */
export function applySpellCastTargetNote(element: HTMLElement, note: SpellCastTargetNote): void {
  const nameElement = element.querySelector<HTMLElement>("[data-target-names]");
  if (nameElement) {
    nameElement.textContent = note.targetName;
  }

  const noteElement = element.querySelector<HTMLElement>("[data-target-note]");
  if (noteElement) {
    noteElement.textContent = note.targetNote;
    noteElement.className = note.targetNoteClass;
    noteElement.hidden = !note.targetNote;
  }

  const rollButton = element.querySelector<HTMLButtonElement>("button[data-ability-roll]");
  if (rollButton) {
    rollButton.disabled = note.tooManyTargets;
  }
}

/** How far around the caster an area spell cast at `level` reaches, from its behavior; 0 if none. */
export function spellAreaRadius(spell: RqgItem, level: number): number {
  return spellBehaviorOf(spell)?.areaRadius?.(level) ?? 0;
}

/**
 * The cast dialogs' "Target everyone in range": target every token on the caster's scene within
 * the area spell's radius at the level the dialog is set to, the caster included.
 */
export function targetSpellArea(
  dialog: HTMLElement,
  spell: RqgItem,
  token: TokenDocument | null | undefined,
  casterActor: RqgActor,
): void {
  const level = Number(dialog.querySelector<HTMLInputElement>('input[name="levelUsed"]')?.value);
  const casterToken = token ?? (getTokenFromActor(casterActor) as TokenDocument | undefined);
  const caster = casterToken?.object;
  if (!caster || !canvas?.ready || !canvas.scene || casterToken.parent !== canvas.scene) {
    ui.notifications?.warn(localize("RQG.Dialog.SpellCast.NoCasterTokenOnScene"));
    return;
  }
  const radius = metersToPixels(spellAreaRadius(spell, level || 0), canvas.scene.grid);
  // Straight-line distance between token centers
  const inRange = (canvas.tokens?.placeables ?? []).filter(
    (token) =>
      token.visible &&
      Math.hypot(token.center.x - caster.center.x, token.center.y - caster.center.y) <= radius,
  );
  canvas.tokens?.setTargets(
    inRange.flatMap((token) => (token.id ? [token.id] : [])),
    { mode: "replace" },
  );
}

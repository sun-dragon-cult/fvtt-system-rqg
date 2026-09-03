import { getTargetedTokenNames, localize } from "../../system/util";
import { SpellResistedByEnum } from "../../data-model/item-data/spell";

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
 * What the cast dialog says about the current targets. Only a spell resolved by a resistance roll
 * constrains them - everything else is free to be cast at any number of tokens, or none.
 */
export function buildSpellCastTargetNote(resistedBy: SpellResistedByEnum): SpellCastTargetNote {
  const targetNames = getTargetedTokenNames();
  const targetCount = game.user?.targets.size ?? 0;
  const constrained = resistedBy === SpellResistedByEnum.ResistanceRoll;

  const tooManyTargets = constrained && targetCount > 1;
  let targetNote = "";
  let targetNoteClass = "";
  if (tooManyTargets) {
    targetNote = localize("RQG.Dialog.SpellCast.SingleTargetOnly");
    targetNoteClass = "warning";
  } else if (constrained && targetCount === 0) {
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

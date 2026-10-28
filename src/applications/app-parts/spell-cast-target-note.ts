import { getTargetedTokenNames, localize } from "../../system/util";
import {
  casterTokenOnScene,
  spellAreaRadius,
  spellMaxTargets,
} from "../../system/spell-effects/spell-area-targets";
import type { RqgItem } from "@items/rqg-item.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { SpellItem } from "@item-model/spell.ts";
import { previewSpellArea, type SpellAreaPreview } from "./spell-area-preview";
import {
  isSingleTargetGate,
  isSpiritCombatGate,
  SpellResistedByEnum,
} from "../../data-model/item-data/spell";
import { applyTargetTokenSelect, buildTargetTokenSelect } from "./target-token-select";

export type SpellCastTargetNote = {
  /** Comma-joined target names, or the "nothing targeted" label. */
  targetName: string;
  /** Explains an unusual target count; "" when there is exactly one, or the spell doesn't care. */
  targetNote: string;
  /** "warning" when the cast is blocked, "hint" when it merely differs, "" otherwise. */
  targetNoteClass: string;
  /** More targets than the spell can resolve, so casting is refused before anything is spent. */
  tooManyTargets: boolean;
  /** A single-target spell picks its target from these; empty for spells that take any number. */
  targetOptions: SelectOptionData<string>[];
  selectedTarget: string;
};

/**
 * What the cast dialog says about the current targets. Only a spell resolved by resistance rolls or
 * gated on spirit combat, or one that reaches only `maxTargets` at its level, constrains them -
 * everything else is free to be cast at any number of tokens, or none.
 */
export function buildSpellCastTargetNote(
  resistedBy: SpellResistedByEnum,
  casterToken: foundry.canvas.placeables.Token | undefined,
  maxTargets: number = Infinity,
): SpellCastTargetNote {
  const targetNames = getTargetedTokenNames();
  const targetCount = game.user?.targets.size ?? 0;
  const spiritCombat = isSpiritCombatGate(resistedBy);
  const perTarget = resistedBy === SpellResistedByEnum.ResistanceRollPerTarget;
  const constrained = isSingleTargetGate(resistedBy);

  const singleTargetOnly = constrained && targetCount > 1;
  const tooManyTargets = singleTargetOnly || targetCount > maxTargets;
  let targetNote = "";
  let targetNoteClass = "";
  if (singleTargetOnly) {
    targetNote = localize("RQG.Dialog.SpellCast.SingleTargetOnly");
    targetNoteClass = "warning";
  } else if (tooManyTargets) {
    targetNote = localize("RQG.Dialog.SpellCast.TooManyTargets", { count: String(maxTargets) });
    targetNoteClass = "warning";
  } else if (resistedBy === SpellResistedByEnum.ResistanceRollArea && targetCount === 0) {
    targetNote = localize("RQG.Dialog.SpellCast.AreaUntargeted");
    targetNoteClass = "hint";
  } else if (spiritCombat && targetCount === 0) {
    targetNote = localize("RQG.Dialog.SpellCast.SpiritCombatUntargeted");
    targetNoteClass = "hint";
  } else if ((constrained || perTarget) && targetCount === 0) {
    targetNote = localize("RQG.Dialog.SpellCast.Untargeted");
    targetNoteClass = "hint";
  }

  const targetSelect = constrained ? buildTargetTokenSelect(casterToken) : undefined;

  return {
    targetName: targetNames || localize("RQG.Dialog.Common.NoTarget"),
    targetNote: targetNote,
    targetNoteClass: targetNoteClass,
    tooManyTargets: tooManyTargets,
    targetOptions: targetSelect?.options ?? [],
    selectedTarget: targetSelect?.selected ?? "",
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

  applyTargetTokenSelect(element, { options: note.targetOptions, selected: note.selectedTarget });

  const rollButton = element.querySelector<HTMLButtonElement>("button[data-ability-roll]");
  if (rollButton) {
    rollButton.disabled = note.tooManyTargets;
  }
}

/** What a spell centered on its caster reaches at `level`, which the cast targets; "" otherwise. */
export function spellAreaTargetsLabel(
  spell: RqgItem,
  level: number,
  casterToken: foundry.canvas.placeables.Token | undefined,
): string {
  const meters = spellAreaRadius(spell, level);
  if (meters <= 0) {
    return "";
  }
  return localize(
    casterToken
      ? "RQG.Dialog.SpellCast.EveryoneInRange"
      : "RQG.Dialog.SpellCast.EveryoneInRangeNoToken",
    { meters: String(meters) },
  );
}

/**
 * A cast dialog's targets at the level it is set to: the Target row's note, and for a spell centered
 * on its caster the area's preview on the canvas and its label.
 */
export class SpellCastTargets {
  private preview: SpellAreaPreview | undefined;
  private level = 0;

  constructor(
    private readonly spell: SpellItem,
    private readonly token: TokenDocument | null | undefined,
    private readonly casterActor: RqgActor,
  ) {}

  casterToken(): foundry.canvas.placeables.Token | undefined {
    return casterTokenOnScene(this.token, this.casterActor);
  }

  note(level: number): SpellCastTargetNote {
    this.level = level;
    return buildSpellCastTargetNote(
      this.spell.system.resistedBy,
      this.casterToken(),
      spellMaxTargets(this.spell, level),
    );
  }

  areaLabel(level: number): string {
    return spellAreaTargetsLabel(this.spell, level, this.casterToken());
  }

  /** Call from the dialog's _onRender; the preview is made once and kept across re-renders. */
  open(level: number): void {
    this.preview ??= previewSpellArea(this.spell, this.token, this.casterActor, level);
  }

  /** The dialog's level changed. */
  update(element: HTMLElement, level: number): void {
    this.preview?.update(level);
    const labelElement = element.querySelector<HTMLElement>("[data-area-targets]");
    if (labelElement) {
      labelElement.textContent = this.areaLabel(level);
    }
    applySpellCastTargetNote(element, this.note(level));
  }

  /** The user's targets changed. */
  targetsChanged(element: HTMLElement): void {
    applySpellCastTargetNote(element, this.note(this.level));
  }

  close(): void {
    this.preview?.destroy();
    this.preview = undefined;
  }
}

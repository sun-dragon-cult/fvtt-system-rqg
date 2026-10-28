import {
  casterTokenOnScene,
  spellAreaRadius,
  tokensInSpellArea,
} from "../../system/spell-effects/spell-area-targets";
import { coveragePreview } from "../../system/spell-effects/place-spell-area";
import { metersToPixels } from "../../system/spell-effects/scene-distance";
import { spellAreaTargetsLabel } from "./spell-cast-target-note";
import type { RqgItem } from "@items/rqg-item.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";

export type SpellAreaPreview = { update: (level: number) => void; destroy: () => void };

/** A cast dialog's spell area around its caster: the canvas preview and the Target row's label. */
export class SpellCastArea {
  private preview: SpellAreaPreview | undefined;

  constructor(
    private readonly spell: RqgItem,
    private readonly token: TokenDocument | null | undefined,
    private readonly casterActor: RqgActor,
  ) {}

  casterToken(): foundry.canvas.placeables.Token | undefined {
    return casterTokenOnScene(this.token, this.casterActor);
  }

  label(level: number): string {
    return spellAreaTargetsLabel(this.spell, level, this.casterToken());
  }

  /** Call from the dialog's _onRender; the preview is made once and kept across re-renders. */
  open(level: number): void {
    this.preview ??= previewSpellArea(this.spell, this.token, this.casterActor, level);
  }

  update(element: HTMLElement, level: number): void {
    this.preview?.update(level);
    const labelElement = element.querySelector<HTMLElement>("[data-area-targets]");
    if (labelElement) {
      labelElement.textContent = this.label(level);
    }
  }

  close(): void {
    this.preview?.destroy();
    this.preview = undefined;
  }
}

/**
 * While a cast dialog is open, highlight the grid spaces a spell centered on its caster covers at
 * the dialog's level, and make the tokens there the user's targets. Undefined when the spell has
 * no such area or the caster has no token on the viewed scene.
 */
export function previewSpellArea(
  spell: RqgItem,
  token: TokenDocument | null | undefined,
  casterActor: RqgActor,
  level: number,
): SpellAreaPreview | undefined {
  const caster = casterTokenOnScene(token, casterActor);
  if (!caster || !canvas?.scene || spellAreaRadius(spell, level) <= 0) {
    return undefined;
  }
  const grid = canvas.scene.grid;
  const preview = coveragePreview(spell.name ?? "");
  let shownLevel: number | undefined;
  const update = (newLevel: number) => {
    if (newLevel === shownLevel) {
      return;
    }
    shownLevel = newLevel;
    const radius = metersToPixels(spellAreaRadius(spell, newLevel), grid);
    const { x, y } = caster.center;
    preview.showShapes(radius > 0 ? [{ type: "circle", x, y, radius, gridBased: false }] : []);
    targetTokens(tokensInSpellArea(spell, newLevel, token, casterActor) ?? []);
  };
  update(level);
  return { update, destroy: preview.destroy };
}

/** Replace the user's targets, unless they already are these - every change is broadcast. */
function targetTokens(tokens: foundry.canvas.placeables.Token[]): void {
  const ids = tokens.flatMap((t) => (t.id ? [t.id] : []));
  const current = game.user?.targets;
  if (current?.size === ids.length && ids.every((id) => current.some((t) => t.id === id))) {
    return;
  }
  canvas?.tokens?.setTargets(ids, { mode: "replace" });
}

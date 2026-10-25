import { casterTokenOnScene, spellAreaRadius } from "../../system/spell-effects/spell-area-targets";
import { coveragePreview } from "../../system/spell-effects/place-spell-area";
import { metersToPixels } from "../../system/spell-effects/scene-distance";
import type { RqgItem } from "@items/rqg-item.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";

export type SpellAreaPreview = { update: (level: number) => void; destroy: () => void };

/**
 * While a cast dialog is open, highlight the grid spaces a spell centered on its caster covers at
 * the dialog's level - the tokens there are the ones it targets. Undefined when the spell has no
 * such area or the caster has no token on the viewed scene.
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
  const update = (newLevel: number) => {
    const radius = metersToPixels(spellAreaRadius(spell, newLevel), grid);
    const { x, y } = caster.center;
    preview.showShapes(radius > 0 ? [{ type: "circle", x, y, radius, gridBased: false }] : []);
  };
  update(level);
  return { update, destroy: preview.destroy };
}

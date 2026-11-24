import { PowAuraFilter } from "./pow-aura-filter";

const { DetectionMode, DetectionModeAll } = foundry.canvas.perception;
const { Token } = foundry.canvas.placeables;

/** Id of the detection mode, for effects like `token.detectionModes.powAura.enabled`. */
export const powAuraDetectionModeId = "powAura";

/** Does the token's actor have a POW aura: a living or POW-holding being, not undead (RBM p.118)? */
export function hasPowAura(token: TokenDocument | undefined): boolean {
  const pow = token?.actor?.system.characteristics.power.value;
  return typeof pow === "number" && pow > 0;
}

/** Discorporate beings are in the Spirit World, which Second Sight doesn't show (RBM p.118). */
const discorporateStatusId = "discorporate";

/**
 * Sees the POW aura of beings that have POW, in the dark too, but not through walls: Second Sight
 * and Soul Sight.
 */
export class PowAuraDetectionMode extends DetectionModeAll {
  static init(): void {
    CONFIG.Canvas.detectionModes[powAuraDetectionModeId] = new PowAuraDetectionMode({
      id: powAuraDetectionModeId,
      label: "RQG.TokenEffects.DetectionPowAura",
      type: DetectionMode.DETECTION_TYPES.SIGHT,
    } as any);
  }

  static override getDetectionFilter() {
    // Core takes any filter here; fvtt-types narrows DetectionModeAll's to its outline filter
    return (this._detectionFilter ??=
      PowAuraFilter.create() as unknown as foundry.canvas.rendering.filters.OutlineOverlayFilter);
  }

  // Invisible beings are deliberately not excluded: their POW still shows (Bestiary, Selene)
  protected override _canDetect(
    ...args: Parameters<foundry.canvas.perception.DetectionModeAll["_canDetect"]>
  ): boolean {
    const target = args[1];
    return (
      target instanceof Token &&
      hasPowAura(target.document) &&
      !target.document.hasStatusEffect(discorporateStatusId) &&
      super._canDetect(...args)
    );
  }
}

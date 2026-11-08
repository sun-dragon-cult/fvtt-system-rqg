import { localize } from "../../system/util";

/** Validation error for the points and Magic Point boost a spell is cast with, if any. */
export function getSpellPointsError(
  pointsUsed: number,
  boost: number,
  minPoints: number,
  maxPoints: number,
): string | undefined {
  if (!Number.isInteger(pointsUsed) || !Number.isInteger(boost)) {
    return localize("RQG.Item.Spell.PointsNotWholeNumber");
  }
  if (pointsUsed < minPoints) {
    return localize("RQG.Item.Spell.CantCastBelowPoints", { points: String(minPoints) });
  }
  if (pointsUsed > maxPoints) {
    return localize("RQG.Item.SpiritMagic.CantCastSpellAboveLearnedLevel");
  }
  if (boost < 0) {
    return localize("RQG.Item.Spell.NegativeBoost");
  }
  return undefined;
}

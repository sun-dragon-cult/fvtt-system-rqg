import type { CultItem } from "./cult-data-model";
import { CultRankEnum } from "./cult-enums";

const cultRankOrder: Record<CultRankEnum, number> = {
  [CultRankEnum.HighPriest]: 7,
  [CultRankEnum.ChiefPriest]: 6,
  [CultRankEnum.RuneLord]: 5,
  [CultRankEnum.RunePriest]: 4,
  [CultRankEnum.GodTalker]: 3,
  [CultRankEnum.Initiate]: 2,
  [CultRankEnum.LayMember]: 1,
} as const;

export function compareCultsByPriority(a: CultItem, b: CultItem): number {
  const bestRankA = Math.max(
    0,
    ...(a.system.joinedCults?.map((c) => cultRankOrder[c.rank] ?? 0) ?? []),
  );
  const bestRankB = Math.max(
    0,
    ...(b.system.joinedCults?.map((c) => cultRankOrder[c.rank] ?? 0) ?? []),
  );
  if (bestRankB !== bestRankA) {
    return bestRankB - bestRankA;
  }

  const rpDiff = (b.system.runePoints?.max ?? 0) - (a.system.runePoints?.max ?? 0);
  if (rpDiff !== 0) {
    return rpDiff;
  }

  return (a.system.deity ?? "").localeCompare(b.system.deity ?? "");
}

export function hasGodTalkerOrHigherNonRuneLord(cult: CultItem): boolean {
  return (
    cult.system.joinedCults?.some(
      (c) =>
        cultRankOrder[c.rank] >= cultRankOrder[CultRankEnum.GodTalker] &&
        c.rank !== CultRankEnum.RuneLord,
    ) ?? false
  );
}

/**
 * Returns true if any joined sub-cult has a rank above Lay Member,
 * granting access to rune magic.
 */
export function hasAccessToRuneMagic(cult: CultItem): boolean {
  return cult.system.joinedCults?.some((c) => c.rank !== CultRankEnum.LayMember) ?? false;
}

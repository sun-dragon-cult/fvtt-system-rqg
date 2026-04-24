const legacyWeaponSkillRefPattern = /^i\.skill\.\[(?<skillOrigin>.*)] \/ \[(?<itemId>.*)]$/;
export const legacySkillOriginField = "_legacySkillOrigin";
export const legacySkillIdField = "_legacySkillId";
export const legacyWeaponSkillRefsFlag = "_legacyWeaponSkillRefs";

export type LegacyWeaponSkillRef = {
  skillOrigin?: string;
  skillId?: string;
};

export function isLegacyWeaponSkillReferenceRqid(value: unknown): value is string {
  return typeof value === "string" && legacyWeaponSkillRefPattern.test(value);
}

export function parseLegacyWeaponSkillReference(value: unknown): LegacyWeaponSkillRef | undefined {
  if (!isLegacyWeaponSkillReferenceRqid(value)) {
    return undefined;
  }

  const match = value.match(legacyWeaponSkillRefPattern);
  if (!match?.groups) {
    return undefined;
  }

  return {
    skillOrigin: match.groups["skillOrigin"],
    skillId: match.groups["itemId"],
  };
}

export function getLegacyWeaponSkillReference(
  usage: Record<string, unknown>,
): LegacyWeaponSkillRef | undefined {
  const skillOrigin = usage[legacySkillOriginField] as string | undefined;
  const skillId = usage[legacySkillIdField] as string | undefined;

  if (skillOrigin || skillId) {
    return { skillOrigin, skillId };
  }

  const rawSkillOrigin = usage["skillOrigin"] as string | undefined;
  const rawSkillId = usage["skillId"] as string | undefined;
  if (rawSkillOrigin || rawSkillId) {
    return { skillOrigin: rawSkillOrigin, skillId: rawSkillId };
  }

  const legacyEncodedRqid = (usage["skillRqidLink"] as { rqid?: unknown } | undefined)?.rqid;
  return parseLegacyWeaponSkillReference(legacyEncodedRqid);
}

export function getLegacyWeaponSkillReferenceForUsage(
  itemData: { flags?: unknown; system?: unknown },
  usageType: string,
): LegacyWeaponSkillRef | undefined {
  const legacyFromFlags = (
    (itemData.flags as Record<string, unknown> | undefined)?.["rqg"] as
      | Record<string, unknown>
      | undefined
  )?.[legacyWeaponSkillRefsFlag] as Record<string, LegacyWeaponSkillRef> | undefined;

  const flaggedLegacyRef = legacyFromFlags?.[usageType];
  if (flaggedLegacyRef?.skillOrigin || flaggedLegacyRef?.skillId) {
    return flaggedLegacyRef;
  }

  const usage = (
    (itemData.system as Record<string, unknown> | undefined)?.["usage"] as
      | Record<string, Record<string, unknown>>
      | undefined
  )?.[usageType];

  if (!usage) {
    return undefined;
  }

  return getLegacyWeaponSkillReference(usage);
}

export function preserveLegacyWeaponSkillReference(
  usage: Record<string, unknown>,
): LegacyWeaponSkillRef | undefined {
  const legacyRef = getLegacyWeaponSkillReference(usage);
  if (!legacyRef?.skillOrigin && !legacyRef?.skillId) {
    return undefined;
  }

  const skillRqidLink = usage["skillRqidLink"] as Record<string, unknown> | undefined;
  if (skillRqidLink && isLegacyWeaponSkillReferenceRqid(skillRqidLink["rqid"])) {
    skillRqidLink["rqid"] = "";
    skillRqidLink["name"] = "";
  }

  return {
    skillOrigin: legacyRef.skillOrigin ?? "",
    skillId: legacyRef.skillId ?? "",
  };
}

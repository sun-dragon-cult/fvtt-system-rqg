const legacyWeaponSkillRefPattern = /^i\.skill\.\[(?<skillOrigin>.*)] \/ \[(?<itemId>.*)]$/;
export const legacySkillOriginField = "_legacySkillOrigin";
export const legacySkillIdField = "_legacySkillId";

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
  itemData: { system?: unknown },
  usageType: string,
): LegacyWeaponSkillRef | undefined {
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

/**
 * Encode legacy weapon skill references into the `skillRqidLink.rqid` field
 * as a sentinel string `i.skill.[skillOrigin] / [skillId]`.
 * This keeps legacy data inside the schema so it survives Foundry's schema cleaning.
 */
export function encodeLegacyWeaponSkillReferenceInRqid(usage: Record<string, unknown>): void {
  const legacyRef = getLegacyWeaponSkillReference(usage);
  if (!legacyRef?.skillOrigin && !legacyRef?.skillId) {
    return;
  }

  const skillRqidLink = usage["skillRqidLink"] as Record<string, unknown> | undefined;
  if (!skillRqidLink) {
    return;
  }

  const currentRqid = skillRqidLink["rqid"];
  if (currentRqid && !isLegacyWeaponSkillReferenceRqid(currentRqid) && currentRqid !== "") {
    return; // Already has a valid rqid — don't overwrite
  }

  skillRqidLink["rqid"] = `i.skill.[${legacyRef.skillOrigin ?? ""}] / [${legacyRef.skillId ?? ""}]`;
  skillRqidLink["name"] = skillRqidLink["name"] || "";
}

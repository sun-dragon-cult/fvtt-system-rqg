import type { RqgActor } from "@actors/rqg-actor.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { SkillItem } from "@item-model/skill-data-model.ts";
import type { Usage, UsageType, WeaponItem } from "@item-model/weapon-data-model.ts";
import { Rqid } from "../../system/api/rqid-api";
import { toRqidString } from "../../system/api/rqid-validation";
import { isDocumentSubType, localize, logMisconfiguration } from "../../system/util";

export type WeaponChanceMode = "attack" | "parry";

export function toEmbeddedSkillCreateData(
  skill: SkillItem,
): Omit<ReturnType<SkillItem["toObject"]>, "_id"> {
  const { _id, ...embeddedSkillData } = skill.toObject() as ReturnType<SkillItem["toObject"]> & {
    _id?: string;
  };
  void _id;
  return embeddedSkillData;
}

/**
 * Checks if the specified skill is already owned by the actor.
 * If not it embeds the referenced skill.
 * Returns false if the linked skill could not be found.
 */
export async function embedLinkedSkill(
  skillRqid: string | undefined,
  actor: RqgActor,
): Promise<boolean> {
  const normalizedSkillRqid = toRqidString(skillRqid);
  if (!normalizedSkillRqid) {
    return true; // No rqid (no linked skill) so count this as a success.
  }
  const embeddedSkill = actor.getBestEmbeddedDocumentByRqid(normalizedSkillRqid);

  if (!embeddedSkill) {
    const skill = await Rqid.fromRqid(normalizedSkillRqid);
    if (!skill) {
      logMisconfiguration(
        localize("RQG.Item.Notification.CantFindWeaponSkillWarning"),
        true,
        normalizedSkillRqid,
      );
      return false;
    }
    await actor.createEmbeddedDocuments("Item", [toEmbeddedSkillCreateData(skill as SkillItem)]);
  }
  return true;
}

export function hasLinkedSkillReference(weaponItem: WeaponItem, usageType: UsageType): boolean {
  return !!toRqidString(weaponItem.system.usage[usageType].skillRqidLink?.rqid);
}

export function resolveLinkedSkill(
  weaponItem: WeaponItem,
  usageType: UsageType,
): SkillItem | undefined {
  const usage = weaponItem.system.usage[usageType] as Usage;
  const skillRqid = toRqidString(usage.skillRqidLink?.rqid);
  if (!skillRqid) {
    return undefined;
  }

  const embeddedByRqid = weaponItem.actor?.getBestEmbeddedDocumentByRqid(skillRqid);

  if (isDocumentSubType<SkillItem>(embeddedByRqid, ItemTypeEnum.Skill)) {
    return embeddedByRqid;
  }

  return undefined;
}

function getWeaponEffectGroup(usageType: UsageType): "melee" | "missile" {
  return usageType === "missile" ? "missile" : "melee";
}

export function getWeaponEffectModifier(
  weaponItem: WeaponItem,
  usageType: UsageType,
  mode: WeaponChanceMode,
): number {
  const effectGroup = getWeaponEffectGroup(usageType);
  return Number(weaponItem.system.effect?.add?.[effectGroup]?.[mode] ?? 0);
}

export function resolveLinkedSkillChanceData(
  weaponItem: WeaponItem,
  usageType: UsageType,
  mode: WeaponChanceMode,
): {
  skillItem: SkillItem | undefined;
  skillChance: number;
  weaponEffectModifier: number;
} {
  const skillItem = resolveLinkedSkill(weaponItem, usageType);
  const weaponEffectModifier = skillItem ? getWeaponEffectModifier(weaponItem, usageType, mode) : 0;
  return {
    skillItem,
    skillChance: Number(skillItem?.system.chance ?? 0),
    weaponEffectModifier,
  };
}

export type WeaponUsageChanceInfo = {
  skillItem: SkillItem | undefined;
  skillChance: number;
  weaponEffectModifier: number;
  totalChance: number;
  underMinSTR: boolean;
  underMinDEX: boolean;
  unusable: boolean;
};

/** Attack chance and STR/DEX requirement status for one usage of a weapon wielded by `actor`. */
export function getWeaponUsageChanceInfo(
  actor: RqgActor,
  weaponItem: WeaponItem,
  usageType: UsageType,
): WeaponUsageChanceInfo {
  const usage = weaponItem.system.usage[usageType] as Usage;
  const actorStr = actor.system.characteristics.strength.value ?? 0;
  const actorDex = actor.system.characteristics.dexterity.value ?? 0;
  const skillRqid = toRqidString(usage.skillRqidLink?.rqid);
  const skillItem = skillRqid
    ? (actor.getBestEmbeddedDocumentByRqid(skillRqid) as SkillItem | undefined)
    : undefined;
  const skillChance = Number(skillItem?.system?.chance ?? 0);
  const weaponEffectModifier = skillItem
    ? getWeaponEffectModifier(weaponItem, usageType, "attack")
    : 0;
  const underMinSTR = actorStr < usage.minStrength;
  const underMinDEX = actorDex < usage.minDexterity;
  let unusable = underMinSTR;
  if (underMinDEX) {
    // STR can compensate for being under DEX min on 2 for 1 basis
    const deficiency = usage.minDexterity - actorDex;
    const strOver = Math.floor((actorStr - usage.minStrength) / 2);
    unusable = usage.minStrength == null || deficiency > strOver;
  }
  return {
    skillItem,
    skillChance,
    weaponEffectModifier,
    totalChance: Math.max(0, skillChance + weaponEffectModifier),
    underMinSTR,
    underMinDEX,
    unusable,
  };
}

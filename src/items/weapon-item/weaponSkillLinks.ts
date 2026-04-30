import type { RqgActor } from "@actors/rqgActor.ts";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import type { SkillItem } from "@item-model/skillDataModel.ts";
import type { Usage, UsageType, WeaponItem } from "@item-model/weaponDataModel.ts";
import { Rqid } from "../../system/api/rqidApi";
import { toRqidString } from "../../system/api/rqidValidation";
import { isDocumentSubType, localize, logMisconfiguration } from "../../system/util";

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
    await actor.createEmbeddedDocuments("Item", [skill as any]);
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

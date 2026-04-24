import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { RqidLink } from "../../../data-model/shared/rqidLink";
import type { UsageType, WeaponItem } from "@item-model/weaponDataModel.ts";
import { ActorTypeEnum, type CharacterActor } from "../../../data-model/actor-data/rqgActorData.ts";
import type { RqgItem } from "@items/rqgItem.ts";
import { isDocumentSubType } from "../../util.ts";
import type { RqgActor } from "@actors/rqgActor.ts";
import {
  getLegacyWeaponSkillReferenceForUsage,
  legacyWeaponSkillRefsFlag,
  type LegacyWeaponSkillRef,
} from "../../../data-model/item-data/weaponSkillLink.ts";

// Migrate weapon item usage from skillOrigin & skillId to skillRqidLink
export async function migrateWeaponSkillLinks(
  itemData: RqgItem,
  owningActorData?: RqgActor,
): Promise<Item.UpdateData> {
  let updateData: Item.UpdateData = {};
  if (
    isDocumentSubType<WeaponItem>(itemData, ItemTypeEnum.Weapon) &&
    isDocumentSubType<CharacterActor>(owningActorData, ActorTypeEnum.Character)
  ) {
    const usageTypes: UsageType[] = ["oneHand", "offHand", "twoHand", "missile"];
    const usageUpdates: Record<string, unknown> = {};
    const clearLegacyFlags: Record<string, null> = {};

    for (const usageType of usageTypes) {
      const usageUpdate = await getUsageMigrationUpdate(itemData, owningActorData, usageType);
      usageUpdates[usageType] = usageUpdate.usageUpdate;
      if (usageUpdate.clearLegacyFlag) {
        clearLegacyFlags[`-=${usageType}`] = null;
      }
    }

    updateData = {
      system: {
        usage: usageUpdates,
      },
    } as any; // Migration uses Foundry's `-=field` delete syntax which doesn't exist in DataModel types

    if (Object.keys(clearLegacyFlags).length > 0) {
      (updateData as any).flags = {
        rqg: {
          [legacyWeaponSkillRefsFlag]: clearLegacyFlags,
        },
      };
    }
  }
  return updateData;
}

async function getUsageMigrationUpdate(
  itemData: WeaponItem,
  owningActorData: CharacterActor | undefined,
  usageType: UsageType,
): Promise<{ usageUpdate: Record<string, unknown>; clearLegacyFlag: boolean }> {
  const legacySkillRef = getLegacyWeaponSkillReferenceForUsage(itemData, usageType);
  if (!legacySkillRef?.skillOrigin && !legacySkillRef?.skillId) {
    return { usageUpdate: {}, clearLegacyFlag: false };
  }

  const currentSkillItem = await findSkillItem(
    itemData,
    owningActorData,
    usageType,
    legacySkillRef,
  );
  const currentRqid = currentSkillItem?.flags?.rqg?.documentRqidFlags?.id;

  if (!currentRqid) {
    const msg = owningActorData
      ? `Weapon item [${itemData.name}] carried by [${owningActorData?.name}] still has an unresolved legacy linked skill for ${usageType} use. Old link was [${legacySkillRef.skillOrigin ?? ""}]`
      : `World weapon item [${itemData.name}] still has an unresolved legacy linked skill for ${usageType} use. Old link was [${legacySkillRef.skillOrigin ?? ""}]`;
    ui.notifications?.warn(msg, { console: false });
    console.warn("RQG |", msg);
    return {
      usageUpdate: {
        [`-=skillOrigin`]: null,
        [`-=skillId`]: null,
      },
      clearLegacyFlag: false,
    };
  }

  return {
    usageUpdate: {
      [`-=skillOrigin`]: null,
      [`-=skillId`]: null,
      skillRqidLink: new RqidLink(currentRqid, currentSkillItem.name ?? ""),
    },
    clearLegacyFlag: true,
  };
}

async function findSkillItem(
  itemData: WeaponItem,
  owningActorData: CharacterActor | undefined,
  usageType: UsageType,
  legacySkillRef: LegacyWeaponSkillRef | undefined,
): Promise<any | undefined> {
  if (itemData.type !== ItemTypeEnum.Weapon.toString()) {
    return;
  }

  const skillOriginUuid = legacySkillRef?.skillOrigin;
  const skillEmbeddedItemId = legacySkillRef?.skillId;

  const skillOriginItem = await fromUuid(skillOriginUuid ?? "");
  if (skillOriginItem) {
    return skillOriginItem;
  }
  const embeddedSkillData = owningActorData?.items.find((i) => i._id === skillEmbeddedItemId);

  if (embeddedSkillData && owningActorData) {
    return owningActorData.items.find((i) => i._id === embeddedSkillData._id);
  }

  return undefined;
}

import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import type { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";
import { RqidLink } from "../../../data-model/shared/rqidLink";
import type { ActorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";
import { UsageType } from "../../../data-model/item-data/weaponData";

// Migrate weapon item usage from skillOrigin & skillId to skillRqidLink
export async function migrateWeaponSkillLinks(
  itemData: ItemData,
  owningActorData?: ActorData
): Promise<ItemUpdate> {
  let updateData = {};
  if (itemData.type === ItemTypeEnum.Weapon) {
    const oneHandSkillRqidLink = await getSkillRqidLink(itemData, owningActorData, "oneHand");
    const offHandSkillRqidLink = await getSkillRqidLink(itemData, owningActorData, "offHand");
    const twoHandSkillRqidLink = await getSkillRqidLink(itemData, owningActorData, "twoHand");
    const missileSkillRqidLink = await getSkillRqidLink(itemData, owningActorData, "missile");

    updateData = {
      system: {
        usage: {
          oneHand: {
            [`-=skillOrigin`]: null,
            [`-=skillId`]: null,
            skillRqidLink: oneHandSkillRqidLink,
          },
          offHand: {
            [`-=skillOrigin`]: null,
            [`-=skillId`]: null,
            skillRqidLink: offHandSkillRqidLink,
          },
          twoHand: {
            [`-=skillOrigin`]: null,
            [`-=skillId`]: null,
            skillRqidLink: twoHandSkillRqidLink,
          },
          missile: {
            [`-=skillOrigin`]: null,
            [`-=skillId`]: null,
            skillRqidLink: missileSkillRqidLink,
          },
        },
      },
    };
  }
  return updateData;
}

async function getSkillRqidLink(
  itemData: ItemData,
  owningActorData: ActorData | undefined,
  usageType: UsageType
): Promise<RqidLink | undefined> {
  if (
    itemData.type !== ItemTypeEnum.Weapon ||
    // @ts-expect-error foundry.utils.isEmpty & skillOrigin
    foundry.utils.isEmpty(itemData.system.usage[usageType].skillOrigin)
  ) {
    return;
  }

  const currentSkillItem = await findSkillItem(itemData, owningActorData, usageType);
  if (!currentSkillItem && !(itemData.system as any).usage[usageType].skillOrigin) {
    return;
  }
  const currentRqid = currentSkillItem?.flags?.rqg?.documentRqidFlags?.id;
  if (!currentRqid) {
    const msg = owningActorData
      ? `Weapon item [${itemData.name}] carried by [${
          owningActorData?.name
        }] has a linked skill item for ${usageType} use that does not have a rqid. Old link was [${
          (itemData.system as any).usage[usageType].skillOrigin
        }]`
      : `World weapon item [${
          itemData.name
        }] has a linked skill item for ${usageType} use that does not have a rqid. Old link was [${
          (itemData.system as any).usage[usageType].skillOrigin
        }]`;
    ui.notifications?.warn(msg);
    console.warn("RQG |", msg);
  }
  return currentRqid ? new RqidLink(currentRqid, currentSkillItem.name ?? "") : undefined;
}

async function findSkillItem(
  itemData: ItemData,
  owningActorData: ActorData | undefined,
  usageType: UsageType
): Promise<any | undefined> {
  if (itemData.type !== ItemTypeEnum.Weapon) {
    return;
  }
  const skillOriginItem = await fromUuid(
    (itemData.system.usage[usageType] as any).skillOrigin ?? ""
  );
  if (skillOriginItem) {
    return skillOriginItem;
  }
  const embeddedSkillData = owningActorData?.items.find(
    (i: any) => i._id === (itemData.system.usage[usageType] as any).skillId
  );

  if (embeddedSkillData && owningActorData) {
    return owningActorData.items.find((i) => i._id === embeddedSkillData._id);
  }

  return undefined;
}

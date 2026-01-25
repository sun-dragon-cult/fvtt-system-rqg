import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { RqidLink } from "../../../data-model/shared/rqidLink";
import type { UsageType, WeaponItem } from "@item-model/weaponData.ts";
import { ActorTypeEnum, type CharacterActor } from "../../../data-model/actor-data/rqgActorData.ts";
import type { RqgItem } from "@items/rqgItem.ts";
import { isDocumentSubType } from "../../util.ts";
import type { RqgActor } from "@actors/rqgActor.ts";

const notFoundString = "NOT-FOUND";
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
  itemData: WeaponItem,
  owningActorData: CharacterActor | undefined,
  usageType: UsageType,
): Promise<RqidLink | undefined> {
  if (
    itemData.type !== ItemTypeEnum.Weapon.toString() ||
    (foundry.utils.isEmpty((itemData.system.usage[usageType] as any).skillOrigin) &&
      itemData.system.usage[usageType].skillRqidLink?.name !== notFoundString)
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
      ? `Weapon item [${
          itemData.name
        }] carried by [${owningActorData?.name}] has a linked skill item for ${usageType} use that does not have a rqid. Old link was [${
          (itemData.system as any).usage[usageType].skillOrigin
        }]`
      : `World weapon item [${
          itemData.name
        }] has a linked skill item for ${usageType} use that does not have a rqid. Old link was [${
          (itemData.system as any).usage[usageType].skillOrigin
        }]`;
    ui.notifications?.warn(msg, { console: false });
    console.warn("RQG |", msg);
  }
  return currentRqid
    ? new RqidLink(currentRqid, currentSkillItem.name ?? "")
    : new RqidLink(
        `i.skill.[${(itemData.system as any).usage[usageType].skillOrigin}] / [${
          (itemData.system as any).usage[usageType].skillId
        }]`,
        notFoundString,
      );
}

async function findSkillItem(
  itemData: WeaponItem,
  owningActorData: CharacterActor | undefined,
  usageType: UsageType,
): Promise<any | undefined> {
  if (itemData.type !== ItemTypeEnum.Weapon.toString()) {
    return;
  }

  let skillOriginUuid = (itemData.system.usage[usageType] as any).skillOrigin;
  let skillEmbeddedItemId = (itemData.system.usage[usageType] as any).skillId;

  if (
    !skillOriginUuid &&
    (itemData.system.usage[usageType] as any)?.skillRqidLink?.name === notFoundString
  ) {
    const notFoundMatch = (itemData.system.usage[usageType] as any)?.skillRqidLink?.rqid.match(
      /^i\.skill\.\[(?<skillOrigin>.*)] \/ \[(?<itemId>.*)]$/,
    );

    if (notFoundMatch) {
      const { skillOrigin, itemId } = notFoundMatch.groups;
      skillOriginUuid = skillOrigin;
      skillEmbeddedItemId = itemId;
    }
  }

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

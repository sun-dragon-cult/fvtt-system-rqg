import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { RqidLink } from "../../../data-model/shared/rqidLink";
import type { UsageType, WeaponItem } from "@item-model/weaponDataModel.ts";
import { ActorTypeEnum, type CharacterActor } from "../../../data-model/actor-data/rqgActorData.ts";
import type { RqgItem } from "@items/rqgItem.ts";
import { isDocumentSubType } from "../../util.ts";
import type { RqgActor } from "@actors/rqgActor.ts";
import type { MigrationDocumentLink } from "../applyMigrations";
import type { MigrationLogger } from "../../logging/migrationLogger.ts";
import {
  getLegacyWeaponSkillReferenceForUsage,
  type LegacyWeaponSkillRef,
} from "../../../data-model/item-data/weaponSkillLink.ts";

// Migrate weapon item usage from skillOrigin & skillId to skillRqidLink
export async function migrateWeaponSkillLinks(
  itemData: RqgItem,
  owningActorData?: RqgActor,
  migrationLogger?: MigrationLogger,
): Promise<Item.UpdateData> {
  if (
    isDocumentSubType<WeaponItem>(itemData, ItemTypeEnum.Weapon) &&
    isDocumentSubType<CharacterActor>(owningActorData, ActorTypeEnum.Character)
  ) {
    const usageTypes: UsageType[] = ["oneHand", "offHand", "twoHand", "missile"];
    const usageUpdates: Record<string, unknown> = {};

    for (const usageType of usageTypes) {
      const usageUpdate = await getUsageMigrationUpdate(
        itemData,
        owningActorData,
        usageType,
        migrationLogger,
      );
      if (!foundry.utils.isEmpty(usageUpdate)) {
        usageUpdates[usageType] = usageUpdate;
      }
    }

    if (foundry.utils.isEmpty(usageUpdates)) {
      return {};
    }

    return {
      system: {
        usage: usageUpdates,
      },
    } as Item.UpdateData;
  }

  return {};
}

async function getUsageMigrationUpdate(
  itemData: WeaponItem,
  owningActorData: CharacterActor | undefined,
  usageType: UsageType,
  migrationLogger?: MigrationLogger,
): Promise<Record<string, unknown>> {
  const legacySkillRef = getLegacyWeaponSkillReferenceForUsage(itemData, usageType);
  if (!legacySkillRef?.skillOrigin && !legacySkillRef?.skillId) {
    return {};
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

    const documents: MigrationDocumentLink[] = [
      {
        kind: "Item",
        uuid: itemData.uuid ?? "",
        label: itemData.name ?? "Weapon item",
      },
    ];
    if (owningActorData?.uuid) {
      documents.unshift({
        kind: "Actor",
        uuid: owningActorData.uuid,
        label: owningActorData.name ?? "Actor",
      });
    }

    migrationLogger?.warn(msg, { notify: false, documents });

    return {
      skillOrigin: _del,
      skillId: _del,
    };
  }

  return {
    skillOrigin: _del,
    skillId: _del,
    skillRqidLink: new RqidLink(currentRqid, currentSkillItem.name ?? ""),
  };
}

async function findSkillItem(
  itemData: WeaponItem,
  owningActorData: CharacterActor | undefined,
  usageType: UsageType,
  legacySkillRef: LegacyWeaponSkillRef | undefined,
): Promise<Item | undefined> {
  if (itemData.type !== ItemTypeEnum.Weapon.toString()) {
    return;
  }

  const skillOriginUuid = legacySkillRef?.skillOrigin;
  const skillEmbeddedItemId = legacySkillRef?.skillId;

  const skillOriginItem = await fromUuid(skillOriginUuid ?? "");
  if (isItemLike(skillOriginItem)) {
    return skillOriginItem;
  }
  const embeddedSkillData = owningActorData?.items.find((i) => i._id === skillEmbeddedItemId);

  if (embeddedSkillData && owningActorData) {
    return owningActorData.items.find((i) => i._id === embeddedSkillData._id);
  }

  return undefined;
}

function isItemLike(value: unknown): value is Item {
  return !!value && typeof value === "object" && "type" in value && "_id" in value;
}

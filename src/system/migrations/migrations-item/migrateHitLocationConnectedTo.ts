import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";
import { ActorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";
import { cacheAvailableHitLocations, getAvailableHitLocations } from "../../util";

// Migrate HitLocation connectedTo from name of hit location to rqid
export async function migrateHitLocationConnectedTo(
  itemData: ItemData,
  owningActorData?: ActorData,
): Promise<ItemUpdate> {
  let updateData: any = {};
  if (
    itemData.type === ItemTypeEnum.HitLocation &&
    itemData.system.connectedTo &&
    !itemData.system.connectedTo.startsWith("i.hit-location.")
  ) {
    if (owningActorData) {
      // First try with embedded item
      const connectedHitLocation = owningActorData.items.find(
        (i) => i.name === itemData.system.connectedTo,
      );
      const connectedHitLocationRqid = connectedHitLocation?.flags?.rqg?.documentRqidFlags?.id;

      if (connectedHitLocationRqid) {
        updateData = {
          system: {
            connectedTo: connectedHitLocationRqid,
          },
        };
      }
    }

    if (!updateData?.system?.connectedTo) {
      // Then try with cached hit locations
      let availableHitLocations = getAvailableHitLocations(true);
      if (!availableHitLocations.length) {
        await cacheAvailableHitLocations();
        availableHitLocations = getAvailableHitLocations();
      }
      const matchingHitLocationName = availableHitLocations.find(
        (hl) => hl.name === itemData.system.connectedTo,
      );
      const matchingHitLocationRqid = matchingHitLocationName?.rqid;
      if (matchingHitLocationRqid) {
        updateData = {
          system: {
            connectedTo: matchingHitLocationRqid,
          },
        };
      }
    }
  }
  return updateData;
}

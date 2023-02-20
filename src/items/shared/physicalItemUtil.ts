import { RqgActor } from "../../actors/rqgActor";
import { RqgItem } from "../rqgItem";
import { getOtherItemIdsInSameLocationTree } from "./locationNode";
import { localize, requireValue } from "../../system/util";

export function getSameLocationUpdates(
  actor: RqgActor,
  physicalItem: RqgItem,
  updates: object[]
): any[] {
  if ("isNatural" in physicalItem.system && physicalItem.system.isNatural) {
    return []; // natural weapons don't have location and are excluded from the LocationTree
  }
  const actorEmbeddedItems = actor.items.contents;

  const newLocationUpdate = updates.find((u: any) => u["system.location"] != null) as any;
  if (newLocationUpdate) {
    // Change location of the item that is sent to getOtherItemIdsInSameLocationTree
    const item = actorEmbeddedItems.find((i: any) => i._id === newLocationUpdate._id);
    requireValue(
      item,
      localize("RQG.Item.Notification.LocationDidntFindItem"),
      actorEmbeddedItems,
      newLocationUpdate
    );
    item.system.location = newLocationUpdate["system.location"];
  }

  const sameLocationItemIds = getOtherItemIdsInSameLocationTree(
    physicalItem.name ?? "",
    actorEmbeddedItems
  );

  const equippedStatusUpdate: any = updates.find((u: any) => u["system.equippedStatus"]);
  const equippedStatusOfOtherWithSameLocation = sameLocationItemIds.length
    ? actor.items.get(sameLocationItemIds[0])!.system.equippedStatus
    : undefined;
  const newEquippedStatus = equippedStatusUpdate
    ? equippedStatusUpdate["system.equippedStatus"] // Change equippedStatus of all in same location group
    : equippedStatusOfOtherWithSameLocation; // Set item equippedStatus of newly changes location item to same as the locations group has
  return sameLocationItemIds.reduce((acc: any[], id: string) => {
    if (newEquippedStatus) {
      acc.push({
        _id: id,
        "system.equippedStatus": newEquippedStatus,
      });
    }
    return acc;
  }, []);
}

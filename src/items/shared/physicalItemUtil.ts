import { RqgActor } from "../../actors/rqgActor";
import { RqgItem } from "../rqgItem";
import { getOtherItemIdsInSameLocationTree } from "./locationNode";
import { localize, requireValue } from "../../system/util";

export function getSameLocationUpdates(
  actor: RqgActor,
  physicalItem: RqgItem,
  updates: object[]
): any[] {
  if ("isNatural" in physicalItem.data.data && physicalItem.data.data.isNatural) {
    return []; // natural weapons don't have location and are excluded from the LocationTree
  }
  const actorObject = actor.toObject();
  const actorOwnedItems = actorObject.items;

  const newLocationUpdate = updates.find((u: any) => u["data.location"] != null) as any;
  if (newLocationUpdate) {
    // Change location of the item that is sent to getOtherItemIdsInSameLocationTree
    const item = actorOwnedItems.find((i: any) => i._id === newLocationUpdate._id);
    requireValue(
      item,
      localize("RQG.Item.Notification.LocationDidntFindItem"),
      actorOwnedItems,
      newLocationUpdate
    );
    // @ts-ignore physicalItem location
    item.data.location = newLocationUpdate["data.location"];
  }

  const sameLocationItemIds = getOtherItemIdsInSameLocationTree(
    physicalItem.name ?? "",
    actorOwnedItems
  );

  const equippedStatusUpdate: any = updates.find((u: any) => u["data.equippedStatus"]);
  const equippedStatusOfOtherWithSameLocation = sameLocationItemIds.length
    ? // @ts-ignore equippedStatus does exist
      actor.items.get(sameLocationItemIds[0])!.data.data.equippedStatus
    : undefined;
  const newEquippedStatus = equippedStatusUpdate
    ? equippedStatusUpdate["data.equippedStatus"] // Change equippedStatus of all in same location group
    : equippedStatusOfOtherWithSameLocation; // Set item equippedStatus of newly changes location item to same as the locations group has
  return sameLocationItemIds.reduce((acc: any[], id: string) => {
    if (newEquippedStatus) {
      acc.push({
        _id: id,
        "data.equippedStatus": newEquippedStatus,
      });
    }
    return acc;
  }, []);
}

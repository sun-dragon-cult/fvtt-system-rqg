import { RqgActor } from "../../rqgActor";
import { RqgItem } from "../../../items/rqgItem";
import { getOtherItemIdsInSameLocationTree } from "./locationNode";

export function getSameLocationUpdates(
  actor: RqgActor,
  physicalItem: RqgItem,
  updates: object[]
): any[] {
  // @ts-ignore 0.8
  const physicalItemDataObject = physicalItem.data.toObject(false);
  // @ts-ignore 0.8
  const actorObject = actor.toObject(false);
  const actorOwnedItems = actorObject.items;

  const newLocationUpdate = updates.find((u: any) => u["data.location"] != null) as any;
  if (newLocationUpdate) {
    // Change location of the item that is sent to getOtherItemIdsInSameLocationTree
    const item = actorOwnedItems.find((i: any) => i._id === newLocationUpdate._id);
    item.data.location = newLocationUpdate["data.location"];
  }

  // @ts-ignore 0.8
  const sameLocationItemIds = getOtherItemIdsInSameLocationTree(
    physicalItemDataObject.name,
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

import { localize, localizeItemType } from "../system/util";
import { RqgItem } from "./rqgItem";

/**
 * returns error messages if not allowed item type
 */
export async function droppableJournalDescription(item: RqgItem, event: DragEvent): Promise<void> {
  // Try to extract the data

  let droppedItemData;
  try {
    droppedItemData = JSON.parse(event.dataTransfer!.getData("text/plain"));
  } catch (err) {
    ui.notifications?.error(localize("RQG.Item.Notification.ErrorParsingItemData"));
    return;
  }
  if (droppedItemData.type !== "JournalEntry") {
    ui.notifications?.warn(
      localize("RQG.Item.Notification.CanOnlyDropJournalEntryWarning", {
        itemType: localizeItemType(item.data.type),
      })
    );
  }
  const pack = droppedItemData.pack ? droppedItemData.pack : "";

  if (item.isEmbedded) {
    await item.actor?.updateEmbeddedDocuments("Item", [
      {
        _id: item.id,
        "data.journalId": droppedItemData.id,
        "data.journalPack": pack,
      },
    ]);
  } else {
    await item.update({ "data.journalId": droppedItemData.id, "data.journalPack": pack });
  }
}

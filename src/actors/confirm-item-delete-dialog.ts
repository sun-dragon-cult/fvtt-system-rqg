import type { CultItem } from "@item-model/cultDataModel.ts";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import type { RuneMagicItem } from "@item-model/runeMagicDataModel.ts";
import type { RqgItem } from "@items/rqgItem.ts";
import type { RqgActor } from "./rqgActor";
import { isDocumentSubType, localize, localizeItemType, requireValue } from "../system/util";

export async function confirmActorItemDelete(actor: RqgActor, itemId: string): Promise<void> {
  const item = actor.items.get(itemId) as RqgItem | undefined;
  requireValue(item, `No itemId [${itemId}] on actor ${actor.name} to show delete item dialog`);

  const itemTypeLoc = localizeItemType(item.type);
  const title = localize("RQG.Dialog.confirmItemDeleteDialog.title", {
    itemType: itemTypeLoc,
    itemName: item.name,
  });

  const content = isDocumentSubType<CultItem>(item, ItemTypeEnum.Cult)
    ? localize("RQG.Dialog.confirmItemDeleteDialog.contentCult", {
        itemType: itemTypeLoc,
        itemName: item.name,
        runeMagicSpell: localizeItemType(ItemTypeEnum.RuneMagic),
      })
    : localize("RQG.Dialog.confirmItemDeleteDialog.content", {
        itemType: itemTypeLoc,
        itemName: item.name,
      });

  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title },
    content,
    yes: {
      action: "confirm",
      label: localize("RQG.Dialog.Common.btnConfirm"),
      icon: "fas fa-check",
    },
    no: {
      action: "cancel",
      label: localize("RQG.Dialog.Common.btnCancel"),
      icon: "fas fa-times",
      default: true,
    },
  });

  if (!confirmed) {
    return;
  }

  const idsToDelete: string[] = [];
  if (isDocumentSubType<CultItem>(item, ItemTypeEnum.Cult)) {
    const cultId = item.id;
    const runeMagicSpells = actor.items.filter(
      (i) =>
        isDocumentSubType<RuneMagicItem>(i, ItemTypeEnum.RuneMagic) && i.system.cultId === cultId,
    ) as RuneMagicItem[];

    for (const spell of runeMagicSpells) {
      if (spell.id) {
        idsToDelete.push(spell.id);
      }
    }
  }

  idsToDelete.push(itemId);
  await actor.deleteEmbeddedDocuments("Item", idsToDelete);
}

import { assertHtmlElement, getDomDataset, localize } from "../system/util";
import { Document } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/module.mjs";
import { systemId } from "../system/config";
import { documentRqidFlags } from "../data-model/shared/rqgDocumentFlags";
import { RqidLink } from "../data-model/shared/rqidLink";

export function onDragEnter(event: DragEvent): void {
  const dropZone = event.currentTarget; // Target the event handler was attached to
  const relatedTarget = event.relatedTarget; // EventTarget the pointer exited from
  assertHtmlElement(dropZone);
  assertHtmlElement(relatedTarget);

  if (
    dropZone &&
    (dropZone === relatedTarget ||
      relatedTarget?.contains(dropZone) ||
      dropZone?.contains(relatedTarget))
  ) {
    event.preventDefault(); // Allow the drag to be dropped
    dropZone.classList.add("drag-hover");
  }
}

export function onDragLeave(event: DragEvent): void {
  const dropZone = event.currentTarget; // Target the event handler was attached to
  const relatedTarget = event.relatedTarget; // EventTarget the pointer exited from
  assertHtmlElement(dropZone);
  assertHtmlElement(relatedTarget);

  // Workaround for Chrome bug https://bugs.chromium.org/p/chromium/issues/detail?id=68629
  const sameShadowDom = dropZone?.getRootNode() === relatedTarget?.getRootNode();
  if (sameShadowDom && !dropZone?.contains(relatedTarget)) {
    dropZone && dropZone.classList.remove("drag-hover");
  }
}

export function isAllowedDocumentName(
  documentName: string | undefined,
  allowedDocumentName: string | undefined
): boolean {
  if (allowedDocumentName && allowedDocumentName !== documentName) {
    const msg = localize("RQG.Item.Notification.DroppedWrongDocumentName", {
      // TODO check content
      allowedDocumentName: allowedDocumentName, // TODO translation of document names how to do it?
      documentName: documentName,
    });
    // @ts-expect-error console
    ui.notifications?.warn(msg, { console: false });
    console.warn(`RQG | ${msg}`);
    return false;
  }
  return true;
}

export function isAllowedDocumentType(
  document: Document<any, any>,
  allowedDocumentTypes: string[] | undefined
): boolean {
  if (allowedDocumentTypes?.length && !allowedDocumentTypes.includes((document as any)?.type)) {
    const msg = localize("RQG.Item.Notification.DroppedWrongDocumentType", {
      allowedDropTypes: allowedDocumentTypes.join(", "),
      type: (document as any)?.type,
    });
    // @ts-expect-error console
    ui.notifications?.warn(msg, { console: false });
    console.warn(`RQG | ${msg}`);
    return false;
  }
  return true;
}

export function hasRqid(document: Document<any, any> | undefined): boolean {
  const droppedItemRqid = document?.getFlag(systemId, documentRqidFlags)?.id;

  if (!droppedItemRqid) {
    const msg = localize("RQG.Item.Notification.DroppedDocumentDoesNotHaveRqid", {
      type: (document as any).type,
      name: document?.name,
      uuid: (document as any).uuid,
    });
    // @ts-expect-error console
    ui.notifications?.warn(msg, { console: false });
    console.warn(`RQG | ${msg}`);
    return false;
  }
  return true;
}

/**
 * Update the targetDocument property called what targetPropertyName contains
 * with a RqidLink to the droppedDocument.
 */
export async function updateRqidLink(
  targetDocument: Document<any, any>,
  targetPropertyName: string | undefined,
  droppedDocument: Document<any, any>
): Promise<void> {
  const droppedItemRqid = droppedDocument?.getFlag(systemId, documentRqidFlags)?.id;
  // @ts-expect-error system
  const targetProperty = getProperty(targetDocument?.system, targetPropertyName ?? "");

  // Should really check if this.item has a property like targetPropertyName,
  // but !hasOwnProperty(this.item.system, targetPropertyName) won't work if the default value is undefined.
  if (!targetPropertyName) {
    console.error(
      `RQG | Programming error – empty targetPropertyName (data-dropzone)`,
      targetPropertyName,
      targetDocument
    );
    return;
  }

  const newLink = new RqidLink(droppedItemRqid, droppedDocument.name ?? "");

  if (Array.isArray(targetProperty)) {
    const targetPropertyRqidLinkArray = targetProperty as RqidLink[];
    if (!targetPropertyRqidLinkArray.map((j) => j.rqid).includes(newLink.rqid)) {
      targetPropertyRqidLinkArray.push(newLink);
      targetPropertyRqidLinkArray.sort((a, b) => a.name.localeCompare(b.name));
      if (targetDocument.isEmbedded) {
        await targetDocument.parent?.updateEmbeddedDocuments(targetDocument.documentName, [
          {
            _id: targetDocument.id,
            system: { [targetPropertyName]: targetPropertyRqidLinkArray },
          },
        ]);
      } else {
        await targetDocument.update({
          system: { [targetPropertyName]: targetPropertyRqidLinkArray },
        });
      }
    }
  } else {
    // Property is a single RqidLink, not an array
    if (targetDocument.isEmbedded) {
      await targetDocument.parent?.updateEmbeddedDocuments("Item", [
        { _id: targetDocument.id, system: { [targetPropertyName]: newLink } },
      ]);
    } else {
      await targetDocument.update({
        system: { [targetPropertyName]: newLink },
      });
    }
  }
}

export function getAllowedDropDocumentTypes(event: DragEvent) {
  return (
    getDomDataset(event, "dropzone-document-types")
      ?.split(",")
      .filter((t) => t !== "") ?? []
  );
}

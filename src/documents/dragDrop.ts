import {
  assertHtmlElement,
  formatListByUserLanguage,
  getDomDataset,
  getGame,
  hasOwnProperty,
  localize,
  localizeDocumentName,
  localizeItemType,
} from "../system/util";
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

export function isAllowedDocumentNames(
  documentName: string | undefined,
  allowedDocumentNames: string[] | undefined
): boolean {
  if (
    !documentName ||
    (allowedDocumentNames?.length && !allowedDocumentNames.includes(documentName))
  ) {
    const translatedDocumentName = localizeDocumentName(documentName);
    const translatedAllowedDocumentNames = allowedDocumentNames
      ? allowedDocumentNames.map((d: any) => localizeDocumentName(d))
      : [];
    const allowedDocumentNamesString = formatListByUserLanguage(
      translatedAllowedDocumentNames,
      "disjunction"
    );

    const msg = localize("RQG.Item.Notification.DroppedWrongDocumentName", {
      allowedDocumentNames: allowedDocumentNamesString,
      documentName: translatedDocumentName,
    });
    // @ts-expect-error console
    ui.notifications?.warn(msg, { console: false });
    console.warn(`RQG | ${msg}`);
    return false;
  }
  return true;
}

export function isAllowedDocumentType(
  document: Document<any, any> | undefined,
  allowedDocumentTypes: string[] | undefined
): boolean {
  if (
    allowedDocumentTypes?.length && // Is anything required
    hasOwnProperty(document, "type") && // Does this Document have a type
    !allowedDocumentTypes.includes(document?.type as string) // Does the type match
  ) {
    const translatedAllowedDocumentTypes = allowedDocumentTypes.map(
      (d: any) => localizeItemType(d) // TODO assumes the document in a Item. Ok for now?
    );

    const allowedDocumentTypesString = formatListByUserLanguage(
      translatedAllowedDocumentTypes,
      "disjunction"
    );
    const msg = localize("RQG.Item.Notification.DroppedWrongDocumentType", {
      allowedDropTypes: allowedDocumentTypesString,
      type: localizeItemType(document?.type as any),
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
 * TODO always construct an embedded rqid?
 */
export async function updateRqidLink(
  targetDocument: Document<any, any>,
  targetPropertyName: string | undefined,
  droppedDocument: Document<any, any>
): Promise<void> {
  const droppedDocumentRqid = droppedDocument?.getFlag(systemId, documentRqidFlags)?.id ?? "";
  const parentDocumentRqid = droppedDocument.isEmbedded
    ? droppedDocument.parent.getFlag(systemId, documentRqidFlags)?.id ?? ""
    : "";
  const fullDocumentRqid =
    (parentDocumentRqid ? parentDocumentRqid + "." : "") + droppedDocumentRqid;

  // @ts-expect-error system
  const targetProperty = getProperty(targetDocument?.system, targetPropertyName ?? "");

  // TODO Should really check if this.item has a property like targetPropertyName,
  // but !hasOwnProperty(this.item.system, targetPropertyName) won't work if the default value is undefined.
  if (!targetPropertyName) {
    console.error(
      `RQG | Programming error – empty targetPropertyName (data-dropzone)`,
      targetPropertyName,
      targetDocument
    );
    return;
  }

  const newLink = new RqidLink(fullDocumentRqid, droppedDocument.name ?? "");

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
  return convertStringToArray(getDomDataset(event, "dropzone-document-types"));
}

export function getAllowedDropDocumentNames(event: DragEvent) {
  return convertStringToArray(getDomDataset(event, "dropzone-document-names"));
}

export async function extractDropInfo<T extends Document<any, any>>(
  event: DragEvent,
  data: { type: string; uuid: string }
): Promise<{
  droppedDocument: T; // Can be undefined, but then isAllowedToDrop is false
  dropZoneData: string | undefined;
  isAllowedToDrop: boolean;
}> {
  const allowedDropDocumentTypes = getAllowedDropDocumentTypes(event);
  const cls = getDocumentClass(data.type) as Document<any, any> | undefined;
  // @ts-expect-error fromDropData
  const droppedDocument = await cls?.implementation.fromDropData(data as any);
  const dropZoneData = getDomDataset(event, "dropzone");
  const isAllowedDropDocumentType = isAllowedDocumentType(
    droppedDocument,
    allowedDropDocumentTypes
  );
  return {
    droppedDocument: droppedDocument,
    dropZoneData: dropZoneData,
    isAllowedToDrop: droppedDocument && isAllowedDropDocumentType,
  };
}

function convertStringToArray(commaSeparatedString: string | undefined): string[] {
  return (
    commaSeparatedString
      ?.split(",")
      .map((s) => s.trim())
      .filter((s) => s) ?? []
  );
}

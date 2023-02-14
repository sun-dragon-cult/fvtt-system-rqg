import { RqidLink } from "../data-model/shared/rqidLink";
import { systemId } from "../system/config";
import {
  getDomDataset,
  getGame,
  getRequiredDomDataset,
  localize,
  localizeItemType,
} from "../system/util";
import { documentRqidFlags } from "../data-model/shared/rqgDocumentFlags";
import { addRqidSheetHeaderButton } from "../documents/rqidSheetButton";
import { Document } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/module.mjs";
import { RqgItem } from "./rqgItem";

export class RqgItemSheet<
  Options extends ItemSheet.Options,
  Data extends object = ItemSheet.Data<Options>
> extends ItemSheet<Options, Data> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      width: 960,
      height: 800,
      dragDrop: [
        {
          dragSelector: ".item",
          dropSelector: "[data-dropzone]",
        },
      ],
    });
  }

  get title(): string {
    return `${localizeItemType(this.object.type)}: ${this.object.name}`;
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Foundry doesn't provide dragenter & dragleave in its DragDrop handling
    html[0].querySelectorAll<HTMLElement>("[data-dropzone]").forEach((elem) => {
      elem.addEventListener("dragenter", this._onDragEnter);
      elem.addEventListener("dragleave", this._onDragLeave);
    });

    // Edit Item Active Effect
    $(this.form!)
      .find("[data-item-effect-edit]")
      .each((i: number, el: HTMLElement) => {
        const effectId = getRequiredDomDataset($(el), "effect-id");
        const itemId = getRequiredDomDataset($(el), "item-id");
        const item = getGame().items?.get(itemId);
        if (!item) {
          return; // The item is not in the world (ie it's in a compendium)
        }
        el.addEventListener("click", () => {
          const effect = item?.effects.get(effectId);
          if (effect) {
            new ActiveEffectConfig(effect).render(true);
          }
        });
      });

    // Add Item Active Effect
    $(this.form!)
      .find("[data-item-effect-add]")
      .each((i: number, el: HTMLElement) => {
        const itemId = getRequiredDomDataset($(el), "item-id");
        const item = getGame().items?.get(itemId);
        if (!item) {
          return; // The item is not in the world (ie it's in a compendium)
        }
        el.addEventListener("click", async () => {
          const effect = new ActiveEffect(
            {
              icon: "icons/svg/aura.svg",
              changes: [],
              label: localize("RQG.Foundry.ActiveEffect.NewActiveEffectName"),
              transfer: true,
              disabled: false,
            },
            item as any // TODO Type bailout - fixme!
          );

          const e = await item
            .createEmbeddedDocuments("ActiveEffect", [effect.toObject()])
            .catch((reason: any) => {
              ui.notifications?.error(
                localize("RQG.Item.Notification.CantCreateActiveEffect", {
                  itemType: localizeItemType(item.type),
                })
              );
              throw reason;
            });
          e[0].id && new ActiveEffectConfig(item.effects.get(e[0].id)!).render(true);
        });
      });

    // Delete Item Active Effect
    this.form?.querySelectorAll<HTMLElement>("[data-item-effect-delete]").forEach((el) => {
      const effectId = getRequiredDomDataset(el, "effect-id");
      el.addEventListener("click", () => {
        this.item.getEmbeddedDocument("ActiveEffect", effectId)?.delete();
      });
    });

    // Handle rqid links
    RqidLink.addRqidLinkClickHandlers($(this.form!));

    // Handle deleting RqidLinks from RqidLink Array Properties
    $(this.form!)
      .find("[data-delete-from-property]")
      .each((i: number, el: HTMLElement) => {
        const deleteRqid = getRequiredDomDataset($(el), "delete-rqid");
        const deleteFromPropertyName = getRequiredDomDataset($(el), "delete-from-property");
        el.addEventListener("click", async () => {
          let deleteFromProperty = getProperty(this.item.system, deleteFromPropertyName);
          if (Array.isArray(deleteFromProperty)) {
            const newValueArray = (deleteFromProperty as RqidLink[]).filter(
              (r) => r.rqid !== deleteRqid
            );
            // @ts-expect-error isEmbedded
            if (this.isEmbedded) {
              await this.actor?.updateEmbeddedDocuments("Item", [
                { _id: this.item.id, system: { [deleteFromPropertyName]: newValueArray } },
              ]);
            } else {
              await this.item.update({ system: { [deleteFromPropertyName]: newValueArray } });
            }
          } else {
            // @ts-expect-error isEmbedded
            if (this.isEmbedded) {
              await this.actor?.updateEmbeddedDocuments("Item", [
                { _id: this.item.id, system: { [deleteFromPropertyName]: "" } },
              ]);
            } else {
              await this.item.update({ system: { [deleteFromPropertyName]: "" } });
            }
          }
        });
      });

    $(this.form!)
      .find("[data-edit-bonus-property-name]")
      .each((i: number, el: HTMLElement) => {
        const editRqid = getRequiredDomDataset($(el), "rqid");
        const editPropertyName = getRequiredDomDataset($(el), "edit-bonus-property-name");
        el.addEventListener("change", async () => {
          let updateProperty = getProperty(this.item.system, editPropertyName);
          if (Array.isArray(updateProperty)) {
            const updateRqidLink = (updateProperty as RqidLink[]).find(
              (rqidLink) => rqidLink.rqid === editRqid
            );
            if (updateRqidLink) {
              updateRqidLink.bonus = Number((el as HTMLInputElement).value);
            }
            if (this.item.isEmbedded) {
              await this.item.actor?.updateEmbeddedDocuments("Item", [
                { _id: this.item.id, system: { [editPropertyName]: updateProperty } },
              ]);
            } else {
              await this.item.update({ system: { [editPropertyName]: updateProperty } });
            }
          } else {
            (updateProperty as RqidLink).bonus = Number((el as HTMLInputElement).value);
            if (this.item.isEmbedded) {
              await this.actor?.updateEmbeddedDocuments("Item", [
                { _id: this.item.id, system: { [editPropertyName]: updateProperty } },
              ]);
            } else {
              await this.item.update({ system: { [editPropertyName]: updateProperty } });
            }
          }
        });
      });
  }

  _onDragEnter(event: DragEvent): void {
    const dropZone = event.currentTarget as Element | null; // Target the event handler was attached to
    const relatedTarget = event.relatedTarget as Element | null; // EventTarget the pointer exited from
    if (dropZone && (dropZone === relatedTarget || relatedTarget?.contains(dropZone))) {
      event.preventDefault(); // Allow the drag to be dropped
      dropZone.classList.add("drag-hover");
    }
  }

  _onDragLeave(event: DragEvent): void {
    const dropZone = event.currentTarget as Element | null; // Target the event handler was attached to
    const relatedTarget = event.relatedTarget as Element | null; // EventTarget the pointer exited from
    // Workaround for Chrome bug https://bugs.chromium.org/p/chromium/issues/detail?id=68629
    const sameShadowDom = dropZone?.getRootNode() === relatedTarget?.getRootNode();
    if (sameShadowDom && !dropZone?.contains(relatedTarget)) {
      // event.preventDefault(); // Allow the drag to be dropped
      dropZone && dropZone.classList.remove("drag-hover");
    }
  }

  protected async _onDrop(event: DragEvent): Promise<void> {
    const dropZone = event.currentTarget as Element | null;
    if (dropZone) {
      event.preventDefault(); // Allow the drag to be dropped
      dropZone.classList.remove("drag-hover");
    }

    // @ts-expect-error getDragEventData
    const droppedDocumentData = TextEditor.getDragEventData(event);
    const allowedDropDocumentTypes =
      getDomDataset(event, "dropzone-document-types")
        ?.split(",")
        .filter((t) => t !== "") ?? [];
    const allowedDropDocumentName = getDomDataset(event, "dropzone-document-name");
    const dropzoneData = getDomDataset(event, "dropzone");

    if (!this.isCorrectDocumentName(droppedDocumentData.type, allowedDropDocumentName)) {
      return;
    }

    switch (
      droppedDocumentData.type // type is actually documentName
    ) {
      case "Item": {
        // @ts-expect-error implementation
        const droppedDocument = await Item.implementation.fromDropData(droppedDocumentData);

        // TODO inserted rqid check ??? always demand rqid ???
        if (
          this.isCorrectDocumentType(droppedDocument, allowedDropDocumentTypes) &&
          this.hasRqid(droppedDocument)
        ) {
          await this._onDropItem(droppedDocument as RqgItem, dropzoneData);
        }
        return;
      }
      case "JournalEntry": {
        // @ts-expect-error implementation
        const droppedDocument = await JournalEntry.implementation.fromDropData(droppedDocumentData);

        if (
          this.isCorrectDocumentType(droppedDocument, allowedDropDocumentTypes) &&
          this.hasRqid(droppedDocument)
        ) {
          await this._onDropJournalEntry(droppedDocument as JournalEntry, dropzoneData);
        }
        return;
      }

      default:
        // This will warn about not supported Document Name
        this.isCorrectDocumentName(droppedDocumentData.type, "Item, JournalEntry");
    }
  }

  private isCorrectDocumentName(
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

  private isCorrectDocumentType(
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

  private hasRqid(document: Document<any, any> | undefined): boolean {
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

  async _onDropItem(droppedItem: RqgItem, targetPropertyName: string | undefined): Promise<void> {
    await this.addRqidLink(droppedItem, targetPropertyName);
  }

  async _onDropJournalEntry(
    droppedJournal: JournalEntry,
    targetPropertyName: string | undefined
  ): Promise<void> {
    await this.addRqidLink(droppedJournal, targetPropertyName);
  }

  /**
   * Update the targetPropertyName of this item with a RqidLink to the droppedDocument.
   * */
  private async addRqidLink(
    droppedDocument: Document<any, any>,
    targetPropertyName: string | undefined
  ): Promise<void> {
    const droppedItemRqid = droppedDocument?.getFlag(systemId, documentRqidFlags)?.id;
    const targetProperty = getProperty(this.item.system, targetPropertyName ?? "");

    // Should really check if this.item has a property like targetPropertyName,
    // but !hasOwnProperty(this.item.system, targetPropertyName) won't work if the default value is undefined.
    if (!targetPropertyName) {
      console.error(
        `RQG | Programming error – empty targetPropertyName (data-dropzone)`,
        targetPropertyName,
        this.item
      );
      return;
    }

    const newLink = new RqidLink(droppedItemRqid, droppedDocument.name ?? "");

    if (Array.isArray(targetProperty)) {
      const targetPropertyRqidLinkArray = targetProperty as RqidLink[];
      if (!targetPropertyRqidLinkArray.map((j) => j.rqid).includes(newLink.rqid)) {
        targetPropertyRqidLinkArray.push(newLink);
        targetPropertyRqidLinkArray.sort((a, b) => a.name.localeCompare(b.name));
        if (this.item.isEmbedded) {
          await this.item.actor?.updateEmbeddedDocuments("Item", [
            {
              _id: this.item.id,
              system: { [targetPropertyName]: targetPropertyRqidLinkArray },
            },
          ]);
        } else {
          await this.item.update({
            system: { [targetPropertyName]: targetPropertyRqidLinkArray },
          });
        }
      }
    } else {
      // Property is a single RqidLink, not an array
      if (this.item.isEmbedded) {
        await this.actor?.updateEmbeddedDocuments("Item", [
          { _id: this.item.id, system: { [targetPropertyName]: newLink } },
        ]);
      } else {
        await this.item.update({
          system: { [targetPropertyName]: newLink },
        });
      }
    }
  }

  protected _getHeaderButtons(): Application.HeaderButton[] {
    const systemHeaderButtons = super._getHeaderButtons();
    addRqidSheetHeaderButton(systemHeaderButtons, this);
    return systemHeaderButtons;
  }
}

export class RqidLinkDragEvent extends DragEvent {
  RqidLinkDropResult: any;
  TargetPropertyName: string = "";
}

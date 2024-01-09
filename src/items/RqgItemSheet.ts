import { RqidLink } from "../data-model/shared/rqidLink";
import { getDomDataset, getRequiredDomDataset, localize, localizeItemType } from "../system/util";
import { addRqidLinkToSheetHtml } from "../documents/rqidSheetButton";
import { RqgItem } from "./rqgItem";
import {
  extractDropInfo,
  getAllowedDropDocumentNames,
  hasRqid,
  isAllowedDocumentNames,
  onDragEnter,
  onDragLeave,
  updateRqidLink,
} from "../documents/dragDrop";

export class RqgItemSheet<
  Options extends ItemSheet.Options,
  Data extends object = ItemSheet.Data<Options>,
> extends ItemSheet<Options, Data> {
  static get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
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
    const parentName = this.object?.parent?.name;
    const parentAddition = parentName ? ` @ ${parentName}` : "";
    return `${localizeItemType(this.object.type)}: ${this.object.name}${parentAddition}`;
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Foundry doesn't provide dragenter & dragleave in its DragDrop handling
    html[0].querySelectorAll<HTMLElement>("[data-dropzone]").forEach((elem) => {
      elem.addEventListener("dragenter", this._onDragEnter);
      elem.addEventListener("dragleave", this._onDragLeave);
    });

    // Handle adding rqidLink via dropdown to an array of links
    html[0]
      .querySelectorAll<HTMLElement>("[data-add-to-rqid-array-link]")
      .forEach((elem: HTMLElement) => {
        const targetProperty = getDomDataset(elem, "dropzone");

        if (targetProperty) {
          elem.addEventListener("change", async (event) => {
            const selectElem = event.currentTarget as HTMLSelectElement;
            const allowDuplicates = getDomDataset(elem, "allow-duplicates");
            const newRqid = selectElem?.value;
            if (
              allowDuplicates ||
              !this.document.system[targetProperty].some((l: RqidLink) => l.rqid === newRqid)
            ) {
              const newName = selectElem?.selectedOptions[0]?.innerText;
              const newHitLocationRqidLink = new RqidLink(newRqid, newName);
              const updatedLinks = [
                ...this.document.system[targetProperty],
                newHitLocationRqidLink,
              ];
              await this.document.update({ [`system.${targetProperty}`]: updatedLinks });
            }
          });
        }
      });

    // Handle setting a single rqidLink via dropdown
    html[0]
      .querySelectorAll<HTMLElement>("[data-replace-rqid-link]")
      .forEach((elem: HTMLElement) => {
        const targetProperty = getDomDataset(elem, "dropzone");

        if (targetProperty) {
          elem.addEventListener("change", async (event) => {
            const selectElem = event.currentTarget as HTMLSelectElement;
            const newRqid = selectElem?.value;
            if (this.document.system[targetProperty].rqid !== newRqid) {
              const newName = selectElem?.selectedOptions[0]?.innerText;
              const newHitLocationRqidLink = new RqidLink(newRqid, newName);
              await this.document.update({ [`system.${targetProperty}`]: newHitLocationRqidLink });
            }
          });
        }
      });

    // Edit Item Active Effect
    $(this.form!)
      .find("[data-item-effect-edit]")
      .each((i: number, el: HTMLElement) => {
        const effectUuid = getRequiredDomDataset($(el), "effect-uuid");
        el.addEventListener("click", () => {
          // @ts-expect-error fromUuidSync
          const effect = fromUuidSync(effectUuid);
          if (effect) {
            new ActiveEffectConfig(effect).render(true);
          }
        });
      });

    // Add Item Active Effect
    $(this.form!)
      .find("[data-item-effect-add]")
      .each((i: number, el: HTMLElement) => {
        const itemUuid = getRequiredDomDataset($(el), "item-uuid");
        // @ts-expect-error fromUuidSync
        const item = fromUuidSync(itemUuid);
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
            item,
          );

          const e = await item
            .createEmbeddedDocuments("ActiveEffect", [effect.toObject()])
            .catch((reason: any) => {
              ui.notifications?.error(
                localize("RQG.Item.Notification.CantCreateActiveEffect", {
                  itemType: localizeItemType(item.type),
                }),
              );
              throw reason;
            });
          e[0].id && new ActiveEffectConfig(item.effects.get(e[0].id)!).render(true);
        });
      });

    // Delete Item Active Effect
    this.form?.querySelectorAll<HTMLElement>("[data-item-effect-delete]").forEach((el) => {
      const effectUuid = getRequiredDomDataset(el, "effect-uuid");
      el.addEventListener("click", () => {
        // @ts-expect-error fromUuidSync
        fromUuidSync(effectUuid)?.delete();
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
          const deleteFromProperty = getProperty(this.item.system, deleteFromPropertyName);
          if (Array.isArray(deleteFromProperty)) {
            const newValueArray = (deleteFromProperty as RqidLink[]).filter(
              (r) => r.rqid !== deleteRqid,
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
          const updateProperty = getProperty(this.item.system, editPropertyName);
          if (Array.isArray(updateProperty)) {
            const updateRqidLink = (updateProperty as RqidLink[]).find(
              (rqidLink) => rqidLink.rqid === editRqid,
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
    onDragEnter(event);
  }

  _onDragLeave(event: DragEvent): void {
    onDragLeave(event);
  }

  protected async _onDrop(event: DragEvent): Promise<unknown> {
    event.preventDefault(); // Allow the drag to be dropped
    this.render(true); // Get rid of any remaining drag-hover classes

    // @ts-expect-error getDragEventData
    const droppedDocumentData = TextEditor.getDragEventData(event);
    const allowedDropDocumentNames = getAllowedDropDocumentNames(event);

    if (!isAllowedDocumentNames(droppedDocumentData.type, allowedDropDocumentNames)) {
      return;
    }

    switch (
      droppedDocumentData.type // type is actually documentName
    ) {
      case "Item":
        return await this._onDropItem(event, droppedDocumentData);
      case "JournalEntry":
        return await this._onDropJournalEntry(event, droppedDocumentData);
      case "JournalEntryPage":
        return await this._onDropJournalEntryPage(event, droppedDocumentData);
      default:
        // This will warn about not supported Document Name
        isAllowedDocumentNames(droppedDocumentData.type, [
          "Item",
          "JournalEntry",
          "JournalEntryPage",
        ]);
    }
  }

  async _onDropItem(
    event: DragEvent,
    data: { type: string; uuid: string },
  ): Promise<boolean | RqgItem[]> {
    const {
      droppedDocument: droppedItem,
      dropZoneData: targetPropertyName,
      isAllowedToDrop,
      allowDuplicates,
    } = await extractDropInfo<RqgItem>(event, data);

    if (isAllowedToDrop && hasRqid(droppedItem)) {
      await updateRqidLink(this.item, targetPropertyName, droppedItem, allowDuplicates);
      return [this.item];
    }
    return false;
  }

  async _onDropJournalEntry(
    event: DragEvent,
    data: { type: string; uuid: string },
  ): Promise<boolean | RqgItem[]> {
    const {
      droppedDocument: droppedJournal,
      dropZoneData: targetPropertyName,
      isAllowedToDrop,
    } = await extractDropInfo<JournalEntry>(event, data);

    if (isAllowedToDrop && hasRqid(droppedJournal)) {
      await updateRqidLink(this.item, targetPropertyName, droppedJournal);
      return [this.item];
    }
    return false;
  }

  async _onDropJournalEntryPage(
    event: DragEvent,
    data: { type: string; uuid: string },
  ): Promise<boolean | RqgItem[]> {
    const {
      droppedDocument: droppedPage,
      dropZoneData: targetPropertyName,
      isAllowedToDrop,
      // @ts-expect-error JournalEntryPage
    } = await extractDropInfo<JournalEntryPage>(event, data);

    if (isAllowedToDrop && hasRqid(droppedPage)) {
      await updateRqidLink(this.item, targetPropertyName, droppedPage);
      return [this.item];
    }
    return false;
  }

  protected async _renderOuter(): Promise<JQuery<JQuery.Node>> {
    const html = (await super._renderOuter()) as JQuery<JQuery.Node>;
    await addRqidLinkToSheetHtml(html, this);
    return html;
  }
}

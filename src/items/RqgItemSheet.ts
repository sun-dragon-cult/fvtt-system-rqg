import { RqidLink } from "../data-model/shared/rqidLink";
import { getGame, getRequiredDomDataset, localize, localizeItemType } from "../system/util";
import { addRqidSheetHeaderButton } from "../documents/rqidSheetButton";
import { RqgItem } from "./rqgItem";
import {
  extractDropInfo,
  getAllowedDropDocumentNames,
  isAllowedDocumentNames,
  onDragEnter,
  onDragLeave,
  updateRqidLink,
} from "../documents/dragDrop";

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
    data: { type: string; uuid: string }
  ): Promise<boolean | RqgItem[]> {
    const {
      droppedDocument: droppedItem,
      dropZoneData: targetPropertyName,
      isAllowedToDrop,
      hasRqid,
    } = await extractDropInfo<RqgItem>(event, data);

    if (isAllowedToDrop && hasRqid) {
      await updateRqidLink(this.item, targetPropertyName, droppedItem);
      return [this.item];
    }
    return false;
  }

  async _onDropJournalEntry(
    event: DragEvent,
    data: { type: string; uuid: string }
  ): Promise<boolean | RqgItem[]> {
    const {
      droppedDocument: droppedJournal,
      dropZoneData: targetPropertyName,
      isAllowedToDrop,
      hasRqid,
    } = await extractDropInfo<JournalEntry>(event, data);

    if (isAllowedToDrop && hasRqid) {
      await updateRqidLink(this.item, targetPropertyName, droppedJournal);
      return [this.item];
    }
    return false;
  }

  async _onDropJournalEntryPage(
    event: DragEvent,
    data: { type: string; uuid: string }
  ): Promise<boolean | RqgItem[]> {
    const {
      droppedDocument: droppedPage,
      dropZoneData: targetPropertyName,
      isAllowedToDrop,
      hasRqid,
      // @ts-expect-error JournalEntryPage
    } = await extractDropInfo<JournalEntryPage>(event, data);

    if (isAllowedToDrop && hasRqid) {
      await updateRqidLink(this.item, targetPropertyName, droppedPage);
      return [this.item];
    }
    return false;
  }

  protected _getHeaderButtons(): Application.HeaderButton[] {
    const systemHeaderButtons = super._getHeaderButtons();
    addRqidSheetHeaderButton(systemHeaderButtons, this);
    return systemHeaderButtons;
  }
}

import { RqidLink } from "../data-model/shared/rqidLink";
import { Rqid } from "../system/api/rqidApi";
import { RQG_CONFIG } from "../system/config";
import {
  findDatasetValueInSelfOrAncestors,
  getDomDataset,
  getGame,
  getRequiredDomDataset,
  localize,
  localizeItemType,
} from "../system/util";
import { RqgItem } from "./rqgItem";

export interface RqgItemSheetData {
  isGM: boolean;
  ownerId: string | null | undefined;
  uuid: string | undefined;
  supportedLanguages: {
    en: string;
  } & Partial<Record<string, string>>;
}

export class RqgItemSheet<
  Options extends ItemSheet.Options,
  Data extends object = ItemSheet.Data<Options>
> extends ItemSheet<Options, Data> {
  get title(): string {
    return `${localizeItemType(this.object.type)}: ${this.object.name}`;
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);

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
                  itemType: localizeItemType(item.data.type),
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

    // RQG System Tab

    // Create a quick rqid based on the item
    $(this.form!)
      .find("[data-item-rqid-quick]")
      .each((i: number, el: HTMLElement) => {
        const itemId = getRequiredDomDataset($(el), "item-id");
        const ownerId = getDomDataset($(el), "owner-id"); // may or may not be there
        el.addEventListener("click", async () => {
          let item: RqgItem | undefined = undefined;
          if (ownerId) {
            // Get the item from the owner
            item = getGame().actors?.get(ownerId)?.items.get(itemId);
          } else {
            // Get the item from the world
            item = getGame().items?.get(itemId) as RqgItem;
          }
          if (!item) {
            return;
          }
          const newRqid = Rqid.getDefaultRqid(item);

          if (ownerId) {
            const actor = getGame().actors?.get(ownerId);
            if (actor) {
              await actor.updateEmbeddedDocuments("Item", [
                { _id: item.id, data: { rqid: newRqid } },
              ]);
            }
          } else {
            await item.update({ data: { rqid: newRqid } });
          }
        });
      });

    // Copy associated input value to clipboard
    $(this.form!)
      .find("[data-item-copy-input]")
      .each((i: number, el: HTMLElement) => {
        const itemId = getRequiredDomDataset($(el), "item-id");
        el.addEventListener("click", async () => {
          const input = el.previousElementSibling as HTMLInputElement;
          navigator.clipboard.writeText(input.value);
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
          let deleteFromProperty = getProperty(this.item.data.data, deleteFromPropertyName);
          if (Array.isArray(deleteFromProperty)) {
            const newValueArray = (deleteFromProperty as RqidLink[]).filter(
              (r) => r.rqid !== deleteRqid
            );
            if (this.item.isEmbedded) {
              await this.item.actor?.updateEmbeddedDocuments("Item", [
                { _id: this.item.id, data: { [deleteFromPropertyName]: newValueArray } },
              ]);
            } else {
              await this.item.update({ data: { [deleteFromPropertyName]: newValueArray } });
            }
          } else {
            if (this.item.isEmbedded) {
              await this.actor?.updateEmbeddedDocuments("Item", [
                { _id: this.item.id, data: { [deleteFromPropertyName]: new RqidLink() } },
              ]);
            } else {
              await this.item.update({ data: { [deleteFromPropertyName]: new RqidLink() } });
            }
          }
        });
      });

    $(this.form!)
      .find("[data-edit-bonus-property-name]")
      .each((i: number, el: HTMLElement) => {
        const editRqid = getRequiredDomDataset($(el), "rqid");
        const editPropertyName = getRequiredDomDataset($(el), "edit-bonus-property-name");
        el.addEventListener("change",async () => {
          console.log("CHANGE!", editRqid, editPropertyName);
          let updateProperty = getProperty(this.item.data.data, editPropertyName);
          if (Array.isArray(updateProperty)) {
            const updateRqidLink = (updateProperty as RqidLink[]).find(rqidLink => rqidLink.rqid === editRqid );
            if (updateRqidLink) {
              updateRqidLink.bonus = Number((el as HTMLInputElement).value);
            }
            if (this.item.isEmbedded) {
              await this.item.actor?.updateEmbeddedDocuments("Item", [
                { _id: this.item.id, data: { [editPropertyName]: updateProperty } },
              ]);
            } else {
              await this.item.update({ data: { [editPropertyName]: updateProperty } });
            }
          } else {
            (updateProperty as RqidLink).bonus = Number((el as HTMLInputElement).value);
            if (this.item.isEmbedded) {
              await this.actor?.updateEmbeddedDocuments("Item", [
                { _id: this.item.id, data: { [editPropertyName]: updateProperty } },
              ]);
            } else {
              await this.item.update({ data: { [editPropertyName]: updateProperty } });
            }            
          }
        });
      });
  }

  protected async _onDrop(event: DragEvent): Promise<void> {
    super._onDrop(event);

    let droppedDocumentData;
    try {
      droppedDocumentData = JSON.parse(event.dataTransfer!.getData("text/plain"));
    } catch (err) {
      ui.notifications?.error(localize("RQG.Item.Notification.ErrorParsingItemData"));
      return;
    }

    const targetPropertyName = findDatasetValueInSelfOrAncestors(
      event.target as HTMLElement,
      "targetDropProperty"
    );

    const dropTypes = findDatasetValueInSelfOrAncestors(event.target as HTMLElement, "expectedDropTypes")?.split(",");

    let droppedDocument: Item | JournalEntry | undefined = undefined;

    if (droppedDocumentData.type === "Item") {
      droppedDocument = await Item.fromDropData(droppedDocumentData);
    }

    if (droppedDocumentData.type === "JournalEntry") {
      droppedDocument = await JournalEntry.fromDropData(droppedDocumentData);
    }

    if (dropTypes && dropTypes.length > 0) {
      if (
        !(
          dropTypes.includes(droppedDocumentData.type) ||
          dropTypes.includes((droppedDocument as Item).type)
        )
      ) {
        const msg = `This field expects an item of type ${dropTypes.join(", ")} and the dropped item was ${droppedDocumentData.type}`;
        ui.notifications?.warn(msg);
        console.warn(msg, event);
        return;
      }
    }

    if (droppedDocument && targetPropertyName) {
      const newLink = new RqidLink();
      newLink.rqid = droppedDocument.getFlag(
        RQG_CONFIG.flagScope,
        RQG_CONFIG.rqidFlags.rqid
      ) as string;
      newLink.name = droppedDocument.name || "";
      newLink.documentType = droppedDocumentData.type;
      if (droppedDocument instanceof Item) {
        newLink.itemType = droppedDocument.type;
      }

      const targetProperty = getProperty(this.item.data.data, targetPropertyName);

      if (targetProperty) {
        (event as RqidLinkDragEvent).TargetPropertyName = targetPropertyName;
        if (Array.isArray(targetProperty)) {
          const targetPropertyRqidLinkArray = targetProperty as RqidLink[];
          if (!targetPropertyRqidLinkArray.map((j) => j.rqid).includes(newLink.rqid)) {
            targetPropertyRqidLinkArray.push(newLink);
            targetPropertyRqidLinkArray.sort((a, b) => a.name.localeCompare(b.name));
            if (this.item.isEmbedded) {
              (event as RqidLinkDragEvent).RqidLinkDropResult =
                await this.item.actor?.updateEmbeddedDocuments("Item", [
                  {
                    _id: this.item.id,
                    data: { [targetPropertyName]: targetPropertyRqidLinkArray },
                  },
                ]);
            } else {
              (event as RqidLinkDragEvent).RqidLinkDropResult = await this.item.update({
                data: { [targetPropertyName]: targetPropertyRqidLinkArray },
              });
            }
          }
        } else {
          // Property is a single RqidLink, not an array
          if (this.item.isEmbedded) {
            (event as RqidLinkDragEvent).RqidLinkDropResult =
              await this.actor?.updateEmbeddedDocuments("Item", [
                { _id: this.item.id, data: { [targetPropertyName]: newLink } },
              ]);
          } else {
            (event as RqidLinkDragEvent).RqidLinkDropResult = await this.item.update({
              data: { [targetPropertyName]: newLink },
            });
          }
        }
      }
    }
  }
}

export class RqidLinkDragEvent extends DragEvent {
  RqidLinkDropResult: any;
  TargetPropertyName: string = "";
}

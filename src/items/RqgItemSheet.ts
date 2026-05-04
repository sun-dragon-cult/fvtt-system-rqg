import { RqidLink } from "../data-model/shared/rqidLink";
import {
  getDomDataset,
  getRequiredDomDataset,
  localize,
  localizeItemType,
  normalizeSourceRqidLinks,
} from "../system/util";
import { addRqidLinkToSheetJQuery } from "../documents/rqidSheetButton";
import type { RqgItem } from "./rqgItem";
import {
  extractDropInfo,
  getAllowedDropDocumentNames,
  hasRqid,
  isAllowedDocumentNames,
  onDragEnter,
  onDragLeave,
  updateRqidLink,
} from "../documents/dragDrop";
import type { RqgActiveEffect } from "../active-effect/rqgActiveEffect.ts";

import ItemSheet = foundry.appv1.sheets.ItemSheet;

export class RqgItemSheet<
  Options extends ItemSheet.Options = ItemSheet.Options,
> extends ItemSheet<Options> {
  static override get defaultOptions(): ItemSheet.Options {
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

  override get title(): string {
    const parentName = this.object?.parent?.name;
    const parentAddition = parentName ? ` @ ${parentName}` : "";
    return `${localizeItemType(this.object.type)}: ${this.object.name}${parentAddition}`;
  }

  public override activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Fallback: persist checkbox changes directly in case delegated form-change
    // submission misses checkbox events in some runtimes.
    html[0]?.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name]').forEach((el) => {
      el.addEventListener("change", (event) => {
        const checkbox = event.currentTarget as HTMLInputElement;
        const path = checkbox.name;
        if (!path.startsWith("system.")) {
          return;
        }
        void this.document.update({ [path]: checkbox.checked });
      });
    });

    // Foundry doesn't provide dragenter & dragleave in its DragDrop handling
    html[0]?.querySelectorAll<HTMLElement>("[data-dropzone]").forEach((elem) => {
      elem.addEventListener("dragenter", this._onDragEnter);
      elem.addEventListener("dragleave", this._onDragLeave);
    });

    // Handle adding rqidLink via dropdown to an array of links
    html[0]
      ?.querySelectorAll<HTMLElement>("[data-add-to-rqid-array-link]")
      .forEach((elem: HTMLElement) => {
        const targetProperty = getDomDataset(elem, "dropzone");

        if (targetProperty) {
          elem.addEventListener("change", async (event) => {
            event.stopPropagation();
            const selectElem = event.currentTarget as HTMLSelectElement;
            const allowDuplicates = getDomDataset(elem, "allow-duplicates");
            const newRqid = selectElem?.value?.trim() ?? "";
            if (!newRqid || newRqid === "empty") {
              return;
            }

            const sourceLinks = foundry.utils.getProperty(
              this.document._source.system as object,
              targetProperty,
            );
            const targetRqidLinks = normalizeSourceRqidLinks(sourceLinks);

            if (allowDuplicates || !targetRqidLinks.some((l) => l.rqid === newRqid)) {
              const newName = selectElem?.selectedOptions[0]?.innerText?.trim() || newRqid;
              const newHitLocationRqidLink = { rqid: newRqid, name: newName };
              const updatedLinks = [...targetRqidLinks, newHitLocationRqidLink];
              await this.document.update({ [`system.${targetProperty}`]: updatedLinks });
            }
          });
        }
      });

    // Handle setting a single rqidLink via dropdown
    html[0]
      ?.querySelectorAll<HTMLElement>("[data-replace-rqid-link]")
      .forEach((elem: HTMLElement) => {
        const targetProperty = getDomDataset(elem, "dropzone");

        if (targetProperty) {
          elem.addEventListener("change", async (event) => {
            const selectElem = event.currentTarget as HTMLSelectElement;
            const newRqid = selectElem?.value;
            if ((this.document as any).system[targetProperty].rqid !== newRqid) {
              const newName = selectElem?.selectedOptions[0]?.innerText ?? "";
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
          const effect = fromUuidSync(effectUuid) as RqgActiveEffect | undefined;
          if (effect) {
            new foundry.applications.sheets.ActiveEffectConfig({ document: effect }).render(true);
          }
        });
      });

    // Add Item Active Effect
    $(this.form!)
      .find("[data-item-effect-add]")
      .each((i: number, el: HTMLElement) => {
        const itemUuid = getRequiredDomDataset($(el), "item-uuid");
        const item = fromUuidSync(itemUuid) as RqgItem | undefined;
        if (!item) {
          return; // The item is not in the world (ie it's in a compendium)
        }
        el.addEventListener("click", async () => {
          const effect = new ActiveEffect(
            {
              name: localize("RQG.Foundry.ActiveEffect.NewActiveEffectName"),
              img: "icons/svg/aura.svg",
              changes: [
                {
                  key: "",
                  value: "",
                },
              ],
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
          if (e[0]?.id) {
            const effect = item.effects.get(e[0].id) as RqgActiveEffect | undefined;
            if (effect) {
              new foundry.applications.sheets.ActiveEffectConfig({ document: effect }).render({
                force: true,
              });
            }
          }
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
    void RqidLink.addRqidLinkClickHandlersToJQuery($(this.form!));

    // Handle deleting RQID links
    RqidLink.addRqidLinkDeleteHandlersToJQuery(
      $(this.form!),
      this.item as foundry.abstract.Document.Any,
    );

    RqidLink.addRqidLinkBonusHandlersToJQuery(
      $(this.form!),
      this.item as foundry.abstract.Document.Any,
    );
  }

  _onDragEnter(event: DragEvent): void {
    onDragEnter(event);
  }

  _onDragLeave(event: DragEvent): void {
    onDragLeave(event);
  }

  protected override async _onDrop(event: DragEvent): Promise<unknown> {
    event.preventDefault(); // Allow the drag to be dropped
    this.render(true); // Get rid of any remaining drag-hover classes

    const droppedDocumentData = foundry.applications.ux.TextEditor.implementation.getDragEventData(
      event,
    ) as ActorSheet.DropData | null; // TODO - ActorSheets.DropData have type, correct here?
    const allowedDropDocumentNames = getAllowedDropDocumentNames(event);

    if (!isAllowedDocumentNames(droppedDocumentData?.type, allowedDropDocumentNames)) {
      return;
    }

    switch (
      droppedDocumentData?.type // type is actually documentName
    ) {
      case "Item":
        if (droppedDocumentData["uuid"]) {
          return await this._onDropItem(
            event,
            droppedDocumentData as { type: string; uuid: string },
          );
        }
        break;
      case "JournalEntry":
        if (droppedDocumentData["uuid"]) {
          return await this._onDropJournalEntry(
            event,
            droppedDocumentData as { type: string; uuid: string },
          );
        }
        break;
      case "JournalEntryPage":
        if (droppedDocumentData["uuid"]) {
          return await this._onDropJournalEntryPage(
            event,
            droppedDocumentData as { type: string; uuid: string },
          );
        }
        break;
      default:
        // This will warn about not supported Document Name
        isAllowedDocumentNames(droppedDocumentData?.type, [
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
    } = await extractDropInfo<foundry.abstract.Document.Any>(event, data);

    if (isAllowedToDrop && hasRqid(droppedItem)) {
      await updateRqidLink(
        this.item as foundry.abstract.Document.Any,
        targetPropertyName,
        droppedItem,
        allowDuplicates,
      );
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
    } = await extractDropInfo<foundry.abstract.Document.Any>(event, data);

    if (isAllowedToDrop && hasRqid(droppedJournal)) {
      await updateRqidLink(
        this.item as foundry.abstract.Document.Any,
        targetPropertyName,
        droppedJournal,
      );
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
    } = await extractDropInfo<foundry.abstract.Document.Any>(event, data);

    if (isAllowedToDrop && hasRqid(droppedPage)) {
      await updateRqidLink(
        this.item as foundry.abstract.Document.Any,
        targetPropertyName,
        droppedPage,
      );
      return [this.item];
    }
    return false;
  }

  protected override async _renderOuter(): Promise<JQuery<HTMLElement>> {
    const html = await super._renderOuter();
    // Cast to compatible document sheet type for rqid link functionality
    await addRqidLinkToSheetJQuery(html, this as unknown as DocumentSheet);
    return html;
  }
}

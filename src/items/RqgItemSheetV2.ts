import { RqidLink } from "../data-model/shared/rqidLink";
import {
  getDomDataset,
  getRequiredDomDataset,
  localize,
  localizeItemType,
  normalizeSourceRqidLinks,
} from "../system/util";
import { addRqidLinkToSheet } from "../documents/rqidSheetButton";
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
import type { DeepPartial } from "fvtt-types/utils";

/** Shorthand types for ApplicationV2 lifecycle method parameters. */
export type AppV2RenderContext = DeepPartial<foundry.applications.api.ApplicationV2.RenderContext>;
export type AppV2RenderOptions = DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions>;

const { HandlebarsApplicationMixin } = foundry.applications.api;
const ItemSheetV2 = foundry.applications.sheets.ItemSheetV2;

type ItemSheetV2HandlebarsBaseCtor = (abstract new (
  ...args: any[]
) => foundry.applications.sheets.ItemSheetV2.Any &
  foundry.applications.api.HandlebarsApplicationMixin.AnyMixed) &
  typeof ItemSheetV2 & {
    PARTS: Record<
      string,
      foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart
    >;
  };

const RqgItemSheetV2Base = HandlebarsApplicationMixin(
  ItemSheetV2,
) as unknown as ItemSheetV2HandlebarsBaseCtor;

export interface RqgItemSheetContext {
  id: string;
  uuid: string;
  name: string;
  img: string;
  isGM: boolean;
  system: unknown;
  isEditable: boolean;
  isEmbedded: boolean;
  /** The item's active effects collection, used by the Active Effects tab partial. */
  effects: unknown;
  /** Tab data prepared by _prepareTabs, used by tab-navigation template. */
  tabs?: Record<string, foundry.applications.api.ApplicationV2.Tab>;
  /** Active tab for the current part, set by _preparePartContext. */
  tab?: foundry.applications.api.ApplicationV2.Tab;
}

export class RqgItemSheetV2 extends RqgItemSheetV2Base {
  static override DEFAULT_OPTIONS: foundry.applications.api.ApplicationV2.DefaultOptions = {
    id: "{id}",
    classes: ["rqg", "item-sheet", "sheet"],
    position: {
      width: 960,
      height: 800,
    },
    form: {
      handler: RqgItemSheetV2.onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    window: {
      resizable: true,
    },
  };

  // Subclasses must define PARTS with their template

  static override PARTS: Record<
    string,
    foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart
  > = {};

  override get title(): string {
    const parentName = this.document?.parent?.name;
    const parentAddition = parentName ? ` @ ${parentName}` : "";
    return `${localizeItemType(this.document.type)}: ${this.document.name}${parentAddition}`;
  }

  // @ts-expect-error Return type is intentionally narrowed from the fvtt-types RenderContext
  override async _prepareContext(): Promise<RqgItemSheetContext> {
    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isGM: game.user?.isGM ?? false,
      isEditable: this.isEditable,
      isEmbedded: this.document.isEmbedded,
      effects: this.document.effects,
      system: foundry.utils.duplicate(this.document._source.system),
    };
  }

  // Always set context.tab — if left unset, hidden parts inherit the previous part's active tab.
  override async _preparePartContext(
    partId: string,
    context: RqgItemSheetContext,
    options: DeepPartial<foundry.applications.api.HandlebarsApplicationMixin.RenderOptions>,
  ): Promise<RqgItemSheetContext> {
    context = await super._preparePartContext(partId, context as any, options);
    context.tab = context.tabs?.[partId] ?? { active: false, id: partId, group: "sheet" };
    return context;
  }

  override async _onRender(
    context: AppV2RenderContext,
    options: AppV2RenderOptions,
  ): Promise<void> {
    await super._onRender(context, options);

    // RQID header button (AppV2 version)
    await addRqidLinkToSheet(this as unknown as DocumentSheet<any, any>);

    // RQID link open/delete handlers in the sheet body (bind once)
    if (options.isFirstRender) {
      RqidLink.bindHandlers(this.element, this.document as foundry.abstract.Document.Any);
    }

    // Drag-drop (register element-level listeners only on first render to avoid duplicates)
    if (options.isFirstRender) {
      this.element.addEventListener("dragover", (event) => event.preventDefault());
      this.element.addEventListener("drop", (event) => void this._onDrop(event));
    }
    this.element.querySelectorAll<HTMLElement>("[data-dropzone]").forEach((elem) => {
      elem.addEventListener("dragenter", (event) => this._onDragEnter(event as DragEvent));
      elem.addEventListener("dragleave", (event) => this._onDragLeave(event as DragEvent));
    });

    // Add rqidLink via dropdown to an array of links
    this.element.querySelectorAll<HTMLElement>("[data-add-to-rqid-array-link]").forEach((elem) => {
      const targetProperty = getDomDataset(elem, "dropzone");
      if (!targetProperty) {
        return;
      }
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
          const newRqidLink = { rqid: newRqid, name: newName };
          const updatedLinks = [...targetRqidLinks, newRqidLink];
          await this.document.update({ [`system.${targetProperty}`]: updatedLinks });
        }
      });
    });

    // Set a single rqidLink via dropdown
    this.element.querySelectorAll<HTMLElement>("[data-replace-rqid-link]").forEach((elem) => {
      const targetProperty = getDomDataset(elem, "dropzone");
      if (!targetProperty) {
        return;
      }
      elem.addEventListener("change", async (event) => {
        const selectElem = event.currentTarget as HTMLSelectElement;
        const newRqid = selectElem?.value;
        if ((this.document.system as any)[targetProperty]?.rqid !== newRqid) {
          const newName = selectElem?.selectedOptions[0]?.innerText ?? "";
          const newRqidLink = new RqidLink(newRqid, newName);
          await this.document.update({ [`system.${targetProperty}`]: newRqidLink });
        }
      });
    });

    // Edit Active Effect
    this.element.querySelectorAll<HTMLElement>("[data-item-effect-edit]").forEach((el) => {
      const effectUuid = getRequiredDomDataset(el, "effect-uuid");
      el.addEventListener("click", () => {
        const effect = fromUuidSync(effectUuid) as RqgActiveEffect | undefined;
        if (effect) {
          new foundry.applications.sheets.ActiveEffectConfig({ document: effect }).render(true);
        }
      });
    });

    // Add Active Effect
    this.element.querySelectorAll<HTMLElement>("[data-item-effect-add]").forEach((el) => {
      const itemUuid = getRequiredDomDataset(el, "item-uuid");
      const item = fromUuidSync(itemUuid) as RqgItem | undefined;
      if (!item) {
        return;
      }
      el.addEventListener("click", async () => {
        const effect = new ActiveEffect(
          {
            name: localize("RQG.Foundry.ActiveEffect.NewActiveEffectName"),
            img: "icons/svg/aura.svg",
            changes: [{ key: "", value: "" }],
            transfer: true,
            disabled: false,
          },
          item,
        );
        const created = await item
          .createEmbeddedDocuments("ActiveEffect", [effect.toObject()])
          .catch((reason: unknown) => {
            ui.notifications?.error(
              localize("RQG.Item.Notification.CantCreateActiveEffect", {
                itemType: localizeItemType(item.type),
              }),
            );
            throw reason;
          });
        if (created[0]?.id) {
          const createdEffect = item.effects.get(created[0].id) as RqgActiveEffect | undefined;
          if (createdEffect) {
            new foundry.applications.sheets.ActiveEffectConfig({
              document: createdEffect,
            }).render({ force: true });
          }
        }
      });
    });

    // Delete Active Effect
    this.element.querySelectorAll<HTMLElement>("[data-item-effect-delete]").forEach((el) => {
      const effectUuid = getRequiredDomDataset(el, "effect-uuid");
      el.addEventListener("click", () => {
        (fromUuidSync(effectUuid) as any)?.delete();
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
    type HandledDropEvent = DragEvent & { _rqgDropHandled?: boolean };
    const handledEvent = event as HandledDropEvent;
    if (handledEvent._rqgDropHandled) {
      return;
    }
    handledEvent._rqgDropHandled = true;

    event.preventDefault();
    event.stopPropagation();
    this.render();

    const droppedDocumentData = foundry.applications.ux.TextEditor.implementation.getDragEventData(
      event,
    ) as { type?: string; uuid?: string } | null;
    const allowedDropDocumentNames = getAllowedDropDocumentNames(event);

    if (!isAllowedDocumentNames(droppedDocumentData?.type, allowedDropDocumentNames)) {
      return;
    }

    switch (droppedDocumentData?.type) {
      case "Item":
      case "JournalEntry":
      case "JournalEntryPage":
        if (droppedDocumentData.uuid) {
          return await this._onDropDocument(event, {
            type: droppedDocumentData.type,
            uuid: droppedDocumentData.uuid,
          });
        }
        break;
      default:
        isAllowedDocumentNames(droppedDocumentData?.type, [
          "Item",
          "JournalEntry",
          "JournalEntryPage",
        ]);
    }
  }

  protected async _onDropDocument(
    event: DragEvent,
    data: { type: string; uuid: string },
  ): Promise<boolean | RqgItem[]> {
    const {
      droppedDocument,
      dropZoneData: targetPropertyName,
      isAllowedToDrop,
      allowDuplicates,
    } = await extractDropInfo<foundry.abstract.Document.Any>(event, data);
    if (isAllowedToDrop && hasRqid(droppedDocument)) {
      await updateRqidLink(
        this.document as foundry.abstract.Document.Any,
        targetPropertyName,
        droppedDocument,
        allowDuplicates,
      );
      return [this.document];
    }
    return false;
  }

  /**
   * Default form submit handler — saves the document.
   * Subclasses needing custom pre-processing override DEFAULT_OPTIONS.form.handler.
   */
  protected static async onSubmit(
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    await (this as unknown as RqgItemSheetV2).document.update(formData.object);
  }
}

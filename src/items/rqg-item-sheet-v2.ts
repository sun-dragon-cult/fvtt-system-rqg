import { RqidLink } from "../data-model/shared/rqid-link";
import {
  getDomDataset,
  getRequiredDomDataset,
  localize,
  localizeItemType,
  normalizeSourceRqidLinks,
  parseBooleanString,
} from "../system/util";
import { decorateRqidFrameButton, getRqidFrameButton } from "../documents/rqid-sheet-button";
import type { RqgItem } from "./rqg-item";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { PhysicalItem } from "@item-model/item-types.ts";
import { getBondRoleConflict, getBoundSpiritActors } from "../system/magic-point-source";
import {
  extractDropInfo,
  extractDroppedActor,
  getAllowedDropDocumentNames,
  hasRqid,
  isAllowedDocumentNames,
  onDragEnter,
  onDragLeave,
  updateRqidLink,
} from "../documents/drag-drop";
import type { RqgActiveEffect } from "../active-effect/rqg-active-effect.ts";
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
  uuid: string | null;
  name: string;
  img: string;
  isGM: boolean;
  system: unknown;
  isEditable: boolean;
  isEmbedded: boolean;
  /** The item's active effects collection, used by the Active Effects tab partial. */
  effects: unknown;
  /** The spirits bound in this item (#999) that are currently usable. */
  boundSpiritActors: { uuid: string; name: string; img: string }[];
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
    actions: {
      unlinkBoundSpirit: RqgItemSheetV2._unlinkBoundSpiritAction,
    },
  };

  private _rqgDragDrop?: foundry.applications.ux.DragDrop.Implementation;

  // Override ItemSheetV2 drag-drop controller to use explicit dropzones and callbacks.
  protected get _dragDrop(): foundry.applications.ux.DragDrop.Implementation {
    this._rqgDragDrop ??= new foundry.applications.ux.DragDrop.implementation({
      // [data-bound-spirit-dropzone] (#999) is checked before the generic Item/JournalEntry
      // switch below, same two-tier pattern as RqgActorSheetV2's Allied Spirit dropzone.
      dropSelector: "[data-dropzone], [data-bound-spirit-dropzone]",
      permissions: {
        drop: () => this.isEditable,
      },
      callbacks: {
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
        dragenter: this._onDragEnter.bind(this),
        dragleave: this._onDragLeave.bind(this),
      },
    });
    return this._rqgDragDrop;
  }

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

  override _getFrameButtons(
    options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions>,
  ): foundry.applications.api.ApplicationV2.HeaderControlsEntry[] {
    const buttons = super._getFrameButtons(options);
    buttons.unshift(getRqidFrameButton(this as unknown as DocumentSheet<any, any>));
    return buttons;
  }

  // @ts-expect-error Return type is intentionally narrowed from the fvtt-types RenderContext
  override async _prepareContext(): Promise<RqgItemSheetContext> {
    // Only physical items have boundSpiritActorUuids; getBoundSpiritActors reads it via a plain
    // property access, which is undefined (and so harmlessly resolves to no spirits) for every
    // other item type - no type-narrowing needed here.
    const boundSpiritActors = getBoundSpiritActors(this.document as unknown as PhysicalItem);
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
      boundSpiritActors: boundSpiritActors.map((spiritActor) => ({
        uuid: spiritActor.uuid ?? "",
        name: spiritActor.name ?? "",
        img: spiritActor.img ?? "",
      })),
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

    // RQID header button (AppV2 _getFrameButtons version)
    await decorateRqidFrameButton(this as unknown as DocumentSheet<any, any>);

    // RQID link open/delete handlers in the sheet body (bind once)
    if (options.isFirstRender) {
      RqidLink.bindHandlers(this.element, this.document as foundry.abstract.Document.Any);
    }

    // Add rqidLink via dropdown to an array of links
    this.element.querySelectorAll<HTMLElement>("[data-add-to-rqid-array-link]").forEach((elem) => {
      const targetProperty = getDomDataset(elem, "dropzone");
      if (!targetProperty) {
        return;
      }
      elem.addEventListener("change", async (event) => {
        const selectElem = event.currentTarget as HTMLSelectElement;
        const allowDuplicates = parseBooleanString(getDomDataset(elem, "allow-duplicates"));
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
        const newRqid = selectElem?.value?.trim() ?? "";
        if (!newRqid || newRqid === "empty") {
          return;
        }

        const currentLink = foundry.utils.getProperty(
          this.document.system as object,
          targetProperty,
        ) as { rqid?: string } | null | undefined;
        if (currentLink?.rqid !== newRqid) {
          const newName = selectElem?.selectedOptions[0]?.innerText?.trim() ?? "";
          const newRqidLink = { rqid: newRqid, name: newName };
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
          new foundry.applications.sheets.ActiveEffectConfig({ document: effect }).render({
            force: true,
          });
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
        const initialChange: ActiveEffect.ChangeData = {
          key: "",
          // @ts-expect-error TEMP(v14-types) legacy ActiveEffect change shape
          type: "add",
          value: "",
        };

        const effectData = {
          name: localize("RQG.Foundry.ActiveEffect.NewActiveEffectName"),
          img: "icons/svg/aura.svg",
          transfer: true,
          disabled: false,
          system: {
            // change.type is the string key from CONST.ACTIVE_EFFECT_CHANGE_TYPES, not the numeric priority value
            changes: [initialChange],
          },
        };
        const created = await item
          .createEmbeddedDocuments("ActiveEffect", [effectData])
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

  // Runtime override of ItemSheetV2 drag/drop hooks; current fvtt-types do not expose these members.
  protected _onDragEnter(event: DragEvent): void {
    onDragEnter(event);
  }

  protected _onDragLeave(event: DragEvent): void {
    onDragLeave(event);
  }

  protected _onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "link";
    }
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

    const target = event.target;
    if (target instanceof Element && target.closest("[data-bound-spirit-dropzone]")) {
      await this._onDropBoundSpirit(event);
      return;
    }

    this.render();

    const droppedDocumentData = foundry.applications.ux.TextEditor.implementation.getDragEventData(
      event,
    ) as ActorSheet.DropData | null;
    const allowedDropDocumentNames = getAllowedDropDocumentNames(event);

    if (!isAllowedDocumentNames(droppedDocumentData?.type, allowedDropDocumentNames)) {
      return;
    }

    switch (droppedDocumentData?.type) {
      case "Item":
      case "JournalEntry":
      case "JournalEntryPage":
        return await this._onDropDocument(event, droppedDocumentData);
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
    data: ActorSheet.DropData,
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

  /** The item's currently-stored bound-spirit uuids (#999), for _onDropBoundSpirit/
   *  _unlinkBoundSpiritAction to append to or filter. */
  private getBoundSpiritActorUuids(): string[] {
    return (
      (this.document.system as { boundSpiritActorUuids?: string[] }).boundSpiritActorUuids ?? []
    );
  }

  /** Bind the dropped Actor as another spirit trapped in this item (#999), appended to
   *  boundSpiritActorUuids. Mirrors RqgActorSheetV2._onDropAlliedSpirit. */
  protected async _onDropBoundSpirit(event: DragEvent): Promise<void> {
    if (!this.isEditable) {
      return;
    }
    const droppedActor = await extractDroppedActor(event);
    if (!droppedActor) {
      ui.notifications?.warn(localize("RQG.Item.Gear.BoundSpiritDropRequiresActorWarn"));
      return;
    }
    // Refuse an actor that's already this item's owner's Allied Spirit bond partner (either
    // direction, #957) - the same actor filling both roles at once would be double-counted as a
    // Magic Point source and race on itself when spent (see getBoundSpiritItems).
    const ownerActor = this.document.actor as unknown as RqgActor | null | undefined;
    if (
      ownerActor &&
      getBondRoleConflict(ownerActor, droppedActor as unknown as RqgActor) === "ally"
    ) {
      ui.notifications?.warn(
        localize("RQG.Item.Gear.BoundSpiritAlreadyAlliedWarn", {
          spiritName: droppedActor.name ?? "",
        }),
      );
      return;
    }
    const boundSpiritActorUuids = this.getBoundSpiritActorUuids();
    if (boundSpiritActorUuids.includes(droppedActor.uuid ?? "")) {
      ui.notifications?.warn(
        localize("RQG.Item.Gear.BoundSpiritAlreadyBoundWarn", {
          spiritName: droppedActor.name ?? "",
        }),
      );
      return;
    }
    await this.document.update({
      system: { boundSpiritActorUuids: [...boundSpiritActorUuids, droppedActor.uuid ?? ""] },
    });
  }

  /** Unlink action for one chip in the Bound Spirit list - see _onDropBoundSpirit. */
  private static async _unlinkBoundSpiritAction(
    this: RqgItemSheetV2,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (!this.isEditable) {
      return;
    }
    const spiritUuid = getRequiredDomDataset(target, "unlink-bound-spirit-uuid");
    await this.document.update({
      system: {
        boundSpiritActorUuids: this.getBoundSpiritActorUuids().filter(
          (uuid) => uuid !== spiritUuid,
        ),
      },
    });
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

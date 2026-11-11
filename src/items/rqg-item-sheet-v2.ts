import { RqidLink } from "../data-model/shared/rqid-link";
import { getRequiredDomDataset, localize, localizeItemType } from "../system/util";
import { decorateRqidFrameButton, getRqidFrameButton } from "../documents/rqid-sheet-button";
import type { RqgItem } from "./rqg-item";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { PhysicalItem } from "@item-model/item-types.ts";
import { getBondRoleConflict } from "../system/magic-point-source";
import {
  getNextSpiritMagicSort,
  resolveMatrixSpellItem,
  type MatrixSpellStorageEntry,
} from "../system/spell-matrix";
import {
  getAllowedDropDocumentNames,
  isAllowedDocumentNames,
  onDragEnter,
  onDragLeave,
} from "../documents/drag-drop";
import type { SpiritMagicItem } from "@item-model/spirit-magic-data-model.ts";
import type {
  RqgLinkDropDetail,
  RqgLinkFieldElement,
} from "../applications/rqg-link/rqg-link-field-element";
import { rqidOf } from "../applications/rqg-link/rqg-link-value";
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

  private _rqgDragDrop?: foundry.applications.ux.DragDrop.Implementation;

  /** Rqids of the matrix spells (#959) whose enchanted points are a choice, like Bladesharp 1-4. */
  private variableMatrixSpells = new Set<string>();

  // Override ItemSheetV2 drag-drop controller to use explicit dropzones and callbacks.
  protected override get _dragDrop(): foundry.applications.ux.DragDrop.Implementation {
    this._rqgDragDrop ??= new foundry.applications.ux.DragDrop.implementation({
      dropSelector: "[data-dropzone]",
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
    const system = foundry.utils.duplicate(this.document._source.system);
    await this.findVariableMatrixSpells();
    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isGM: game.user?.isGM ?? false,
      isEditable: this.isEditable,
      isEmbedded: this.document.isEmbedded,
      effects: this.document.effects,
      system,
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
      RqidLink.bindHandlers(this.element);
    }

    this.bindMatrixSpells();
    this.bindBoundSpirits();

    // Edit Active Effect
    this.element.querySelectorAll<HTMLElement>("[data-item-effect-edit]").forEach((el) => {
      const effectUuid = getRequiredDomDataset(el, "effect-uuid");
      el.addEventListener("click", () => {
        const effect = fromUuidSync(effectUuid) as RqgActiveEffect | undefined;
        if (effect) {
          void effect.sheet?.render(true);
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
          type: "add",
          value: "",
          phase: "initial",
          priority: null,
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
            void createdEffect.sheet?.render(true);
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

  // Runtime override of ItemSheetV2 drag-enter/leave hooks; current fvtt-types do not expose these members.
  protected _onDragEnter(event: DragEvent): void {
    onDragEnter(event);
  }

  protected _onDragLeave(event: DragEvent): void {
    onDragLeave(event);
  }

  protected override _onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "link";
    }
  }

  protected override async _onDrop(event: DragEvent): Promise<void> {
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
    ) as ActorSheet.DropData | null;
    const allowedDropDocumentNames = getAllowedDropDocumentNames(event);

    if (!isAllowedDocumentNames(droppedDocumentData?.type, allowedDropDocumentNames)) {
      return;
    }

    switch (droppedDocumentData?.type) {
      case "Item":
      case "JournalEntry":
      case "JournalEntryPage":
        await this._onDropItemOrJournal(event, droppedDocumentData);
        return;
      default:
        isAllowedDocumentNames(droppedDocumentData?.type, [
          "Item",
          "JournalEntry",
          "JournalEntryPage",
          "ActiveEffect",
        ]);
    }
  }

  /**
   * Handles an Item or journal dropped on a sheet's own `[data-dropzone]`; link fields handle
   * their drops themselves. Named distinctly from ItemSheetV2's own _onDropDocument.
   */
  protected async _onDropItemOrJournal(
    _event: DragEvent,
    _data: ActorSheet.DropData,
  ): Promise<boolean | RqgItem[]> {
    return false;
  }

  /** Only the GM edits matrix points, so only the GM looks the spells up. */
  private async findVariableMatrixSpells(): Promise<void> {
    const matrixSpells =
      (this.document.system as { matrixSpells?: MatrixSpellStorageEntry[] }).matrixSpells ?? [];
    if (!game.user?.isGM || !this.isEditable || !matrixSpells.length) {
      this.variableMatrixSpells = new Set();
      return;
    }
    const canonicalCache = new Map<string, Promise<RqgItem | undefined>>();
    const resolved = await Promise.all(
      matrixSpells.map((_entry, index) =>
        resolveMatrixSpellItem(this.document as unknown as PhysicalItem, index, canonicalCache),
      ),
    );
    this.variableMatrixSpells = new Set(
      matrixSpells
        .filter((_entry, index) => resolved[index]?.system.isVariable)
        .map((entry) => entry.spellRqidLink?.rqid ?? ""),
    );
  }

  /** Matrix spells show their points to the GM, editable for a variable spell. */
  private bindMatrixSpells(): void {
    const field = this.element.querySelector<RqgLinkFieldElement>("rqg-link-field.matrix-spells");
    if (!field) {
      return;
    }
    field.addEventListener("rqg-link-drop", (event) => {
      const { document: dropped, ref, entry } = (event as CustomEvent<RqgLinkDropDetail>).detail;
      const spell = dropped as unknown as SpiritMagicItem;
      entry["points"] = spell.system.points;
      entry["sort"] = getNextSpiritMagicSort(this.document.actor as unknown as RqgActor | null);
      if (spell.system.isVariable) {
        this.variableMatrixSpells.add(ref);
      }
    });
    if (!game.user?.isGM) {
      return;
    }
    const label = localize("RQG.Item.Gear.MatrixSpellPoints");
    field.renderEntry = (element, entry, editable) => {
      const rqid = rqidOf(entry, "spellRqidLink");
      let points: HTMLElement;
      if (editable && this.variableMatrixSpells.has(rqid)) {
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.max = "99";
        input.dataset["key"] = "points";
        input.value = String(entry["points"] ?? 0);
        input.ariaLabel = label;
        points = input;
      } else {
        points = document.createElement("span");
        points.textContent = String(entry["points"] ?? 0);
      }
      points.classList.add("matrix-spell-points");
      points.dataset["tooltip"] = label;
      element.append(points);
    };
  }

  /** Refuse a spirit that is already the owner's Allied Spirit bond partner (#957): it would be
   *  counted twice as a Magic Point source and race on itself when spent. */
  private bindBoundSpirits(): void {
    const field = this.element.querySelector<RqgLinkFieldElement>("rqg-link-field.bound-spirits");
    const ownerActor = this.document.actor as unknown as RqgActor | null | undefined;
    if (!field || !ownerActor) {
      return;
    }
    field.addEventListener("rqg-link-drop", (event) => {
      const spirit = (event as CustomEvent<RqgLinkDropDetail>).detail
        .document as unknown as RqgActor;
      if (getBondRoleConflict(ownerActor, spirit) === "ally") {
        event.preventDefault();
        ui.notifications?.warn(
          localize("RQG.Item.Gear.BoundSpiritAlreadyAlliedWarn", { spiritName: spirit.name ?? "" }),
        );
      }
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

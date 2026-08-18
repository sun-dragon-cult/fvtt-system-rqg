import type { DeepPartial } from "fvtt-types/utils";
import type { PhysicalItem } from "@item-model/item-types.ts";
import type { CharacterActor } from "../../data-model/actor-data/rqg-actor-data";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import {
  ALLY_MAGIC_POINT_SOURCE,
  boundSpiritSourceId,
  feedStorageFromSelf,
  getAlliedBondActor,
  getBoundSpiritActorByUuid,
  getMagicPointDrawOrder,
  getMaxTransferableToStorage,
  getStorageItems,
  MAGIC_POINT_SOURCE_DRAG_TYPE,
  moveSourceBefore,
  SELF_MAGIC_POINT_SOURCE,
  setMagicPointDrawOrder,
} from "../../system/magic-point-source";
import { isFoundryElementInstanceOf, requireValue } from "../../system/util";
import type {
  MagicPointSourcesAppContext,
  MagicPointSourcesAppRow,
} from "./magic-point-sources-app.types.ts";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MAGIC_POINT_SOURCES_APP_ID_PREFIX = "magic-point-sources";

/**
 * The (stable, actor-specific) app id used for this actor's Magic Point Sources popout - one per
 * actor. Passing this as the id keeps the app a singleton (see foundry.applications.instances):
 * opening it again while it's already open re-shows the existing instance instead of spawning a
 * duplicate.
 */
export function getMagicPointSourcesAppId(actor: CharacterActor): string {
  return `${MAGIC_POINT_SOURCES_APP_ID_PREFIX}-${actor.id}`;
}

let outsideClickListenerBound = false;

/**
 * Mirrors Foundry's own ContextMenu.activateListeners pattern: a single document-level listener,
 * bound once ever (not per-popout, so there's nothing to leak or to remember to remove), that
 * closes whichever open MagicPointSourcesApp instances the click landed outside of - looked up
 * live via foundry.applications.instances rather than tracked per-instance.
 */
function ensureOutsideClickListener(): void {
  if (outsideClickListenerBound) {
    return;
  }
  outsideClickListenerBound = true;

  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      // The clicked header toggle button (RqgActorSheetV2._openMagicPointSourcesAction) owns
      // open/close for its *own* actor's popout - pointerdown fires before that button's click
      // handler runs, so closing that one popout here first would race with (and always win
      // against) the toggle-closed behavior there. Scoped to just that actor's popout id (via
      // data-actor-id) rather than skipping the whole loop, so clicking actor B's toggle while
      // actor A's popout is open still closes A's popout instead of orphaning it.
      const toggleButton =
        target instanceof Element
          ? target.closest<HTMLElement>('[data-action="openMagicPointSources"]')
          : null;
      const toggledActorId = toggleButton?.dataset["actorId"];
      const ownToggleAppId =
        toggledActorId !== undefined
          ? `${MAGIC_POINT_SOURCES_APP_ID_PREFIX}-${toggledActorId}`
          : undefined;

      for (const [appId, app] of foundry.applications.instances.entries()) {
        if (!(app instanceof MagicPointSourcesApp) || appId === ownToggleAppId) {
          continue;
        }
        if (!app.element.contains(target)) {
          void app.close();
        }
      }
    },
    { capture: true },
  );
}

/**
 * Small popout listing an actor's Magic Point sources (their own pool plus any storage items,
 * e.g. POW crystals, see #956): edit each source's current points inline, and drag rows to
 * reorder them - the row order *is* the "auto" draw order, drained top to bottom.
 */
export class MagicPointSourcesApp extends HandlebarsApplicationMixin(
  ApplicationV2<MagicPointSourcesAppContext>,
) {
  private readonly actor: CharacterActor;
  private draggedSourceId: string | undefined;
  private _rqgDragDrop?: foundry.applications.ux.DragDrop.Implementation;

  // Mirrors RqgActorSheetV2's _dragDrop getter: Foundry's DragDrop controller binds handlers as
  // element properties (element.ondragover = fn, etc.) rather than addEventListener, so rebinding
  // on every render (see _onRender) replaces the previous handlers instead of stacking new ones
  // on top - no manual "already bound" bookkeeping needed.
  private get _dragDrop(): foundry.applications.ux.DragDrop.Implementation {
    this._rqgDragDrop ??= new foundry.applications.ux.DragDrop.implementation({
      dragSelector: "[data-source-id]",
      // No dropSelector: the popout is small and auto-sized, so using the whole window as the
      // drop target (rather than just the row list) maximizes the area that still counts as
      // "inside the popout" while dragging past the last row.
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
        dragleave: this._onDragLeave.bind(this),
        dragend: this._onDragEnd.bind(this),
      },
    });
    return this._rqgDragDrop;
  }

  constructor(
    actor: CharacterActor,
    options?: Partial<foundry.applications.types.ApplicationConfiguration>,
  ) {
    super({ ...options, id: getMagicPointSourcesAppId(actor) });
    this.actor = actor;
    ensureOutsideClickListener();
  }

  static override DEFAULT_OPTIONS = {
    id: "magic-point-sources-{id}",
    classes: [systemId, "magic-point-sources-app"],
    window: {
      title: "RQG.Actor.Attributes.MagicPointSources",
      icon: "fa-solid fa-bars",
      resizable: false,
      minimizable: false,
      // Not draggable and no close button: the header itself is hidden entirely (see
      // .window-header in rqg.css) - this is a popover (it already has click-outside-to-close
      // and a toggle button), not a normal window. Framed rather than frameless, though, so it
      // keeps all of Foundry's automatic window chrome (position, z-index/bringToFront, theming,
      // input styling) working for free instead of having to reimplement it - the "Magic Point
      // Source Order" title just moves into the content area as plain text (see the template)
      // since the header that would have shown it is gone.
      contentTag: "form",
    },
    // submitOnChange means every edited value (self pool, any storage item) submits the whole
    // form; onSubmit below routes each field to the right document (actor vs the owning item).
    form: {
      handler: MagicPointSourcesApp.onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      feedFromSelf: MagicPointSourcesApp._feedFromSelfAction,
    },
    position: {
      width: "auto" as const,
      height: "auto" as const,
    },
  } satisfies foundry.applications.api.ApplicationV2.DefaultOptions;

  static override PARTS = {
    body: {
      template: templatePaths.magicPointSourcesApp,
      root: true,
    },
  };

  override async _prepareContext(): Promise<MagicPointSourcesAppContext> {
    let priority = 0;
    const rows = getMagicPointDrawOrder(this.actor).map((entry) => {
      let base: Omit<MagicPointSourcesAppRow, "priority">;
      switch (entry.type) {
        case "self":
          base = {
            id: SELF_MAGIC_POINT_SOURCE,
            kind: "self",
            img: this.actor.img ?? undefined,
            name: "",
            value: Number(this.actor.system.attributes.magicPoints.value) || 0,
            max: Number(this.actor.system.attributes.magicPoints.max) || 0,
            feedMax: 0,
          };
          break;
        case "ally":
          base = {
            id: ALLY_MAGIC_POINT_SOURCE,
            kind: "ally",
            img: entry.actor.img ?? undefined,
            name: entry.actor.name ?? "",
            value: Number(entry.actor.system.attributes.magicPoints.value) || 0,
            max: Number(entry.actor.system.attributes.magicPoints.max) || 0,
            feedMax: 0,
          };
          break;
        case "item":
          base = {
            id: entry.item.id ?? "",
            kind: "item",
            img: entry.item.img ?? undefined,
            name: entry.item.name ?? "",
            value: Number(entry.item.system.storedMagicPoints?.value) || 0,
            max: Number(entry.item.system.storedMagicPoints?.max) || 0,
            feedMax: getMaxTransferableToStorage(this.actor, entry.item),
          };
          break;
        case "boundSpirit":
          // No feed button - a bound spirit's Magic Points aren't refilled from self.
          // itemName/itemImg let the row read "{name} in {itemName}", since an actor can have
          // several bound spirits.
          base = {
            id: boundSpiritSourceId(entry.item, entry.spiritActor),
            kind: "boundSpirit",
            img: entry.spiritActor.img ?? undefined,
            name: entry.spiritActor.name ?? "",
            value: Number(entry.spiritActor.system.attributes.magicPoints.value) || 0,
            max: Number(entry.spiritActor.system.attributes.magicPoints.max) || 0,
            feedMax: 0,
            itemName: entry.item.name ?? "",
            itemImg: entry.item.img ?? undefined,
          };
          break;
      }
      // Depleted sources (0 points left) never get drawn from by "auto", so they're excluded
      // from the priority numbering entirely rather than breaking the sequence.
      return { ...base, priority: base.value > 0 ? ++priority : null };
    });

    return { rows };
  }

  override async _onRender(
    context: foundry.applications.api.HandlebarsApplicationMixin.RenderContext,
    options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions>,
  ): Promise<void> {
    await super._onRender(context, options);

    this._dragDrop.bind(this.element);
  }

  /**
   * Form fields are named "system.attributes.magicPoints.value" (self),
   * "items.<itemId>.system.storedMagicPoints.value" (a storage item),
   * "ally.system.attributes.magicPoints.value" (a linked Allied Spirit bond partner, #957), or
   * "boundSpirit:<itemId>:<spiritUuid>:system.attributes.magicPoints.value" (a bound spirit,
   * #999 - ":" separates the id from the field path since a spirit's uuid contains "."), so the
   * submitted data is split by prefix and routed to the right document.
   */
  protected static async onSubmit(
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const app = this as unknown as MagicPointSourcesApp;
    const data = formData.object as Record<string, unknown>;

    const actorUpdate: Record<string, unknown> = {};
    const allyUpdate: Record<string, unknown> = {};
    const itemUpdatesById = new Map<string, Record<string, unknown>>();
    const boundSpiritUpdatesById = new Map<
      string,
      { itemId: string; spiritUuid: string; update: Record<string, unknown> }
    >();
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith("ally.")) {
        allyUpdate[key.slice("ally.".length)] = value;
        continue;
      }
      if (key.startsWith("boundSpirit:")) {
        // Split the whole key, not just the "boundSpirit:" id part - the field path never
        // contains ":", so this always yields exactly ["boundSpirit", itemId, spiritUuid,
        // fieldPath].
        const [, itemId, spiritUuid, fieldPath] = key.split(":");
        requireValue(itemId, `Malformed bound spirit field name [${key}]`);
        requireValue(spiritUuid, `Malformed bound spirit field name [${key}]`);
        requireValue(fieldPath, `Malformed bound spirit field name [${key}]`);
        const entryId = `${itemId}:${spiritUuid}`;
        const spiritUpdateEntry = boundSpiritUpdatesById.get(entryId) ?? {
          itemId,
          spiritUuid,
          update: {},
        };
        spiritUpdateEntry.update[fieldPath] = value;
        boundSpiritUpdatesById.set(entryId, spiritUpdateEntry);
        continue;
      }
      const itemFieldMatch = /^items\.([^.]+)\.(.+)$/.exec(key);
      if (!itemFieldMatch) {
        actorUpdate[key] = value;
        continue;
      }
      const itemId = itemFieldMatch[1] ?? "";
      const itemField = itemFieldMatch[2] ?? "";
      const itemUpdate = itemUpdatesById.get(itemId) ?? {};
      itemUpdate[itemField] = value;
      itemUpdatesById.set(itemId, itemUpdate);
    }

    if (Object.keys(actorUpdate).length > 0) {
      await app.actor.update(actorUpdate);
    }
    for (const [itemId, itemUpdate] of itemUpdatesById) {
      const item = app.actor.items.get(itemId);
      requireValue(item, `Couldn't find item [${itemId}] to edit its Magic Point storage`);
      await item.update(itemUpdate);
    }
    if (Object.keys(allyUpdate).length > 0) {
      const ally = getAlliedBondActor(app.actor);
      requireValue(ally, "Couldn't find the linked Allied Spirit to edit its Magic Points");
      await ally.update(allyUpdate);
    }
    // Independent Actor documents - write concurrently (mirrors spendMagicPoints).
    await Promise.all(
      Array.from(boundSpiritUpdatesById.values()).map(({ itemId, spiritUuid, update }) => {
        const item = app.actor.items.get(itemId) as unknown as PhysicalItem | undefined;
        requireValue(item, `Couldn't find item [${itemId}] to edit its bound spirit`);
        const spiritActor = getBoundSpiritActorByUuid(item, spiritUuid);
        requireValue(
          spiritActor,
          `Couldn't find the spirit [${spiritUuid}] bound in item [${itemId}] to edit it`,
        );
        return spiritActor.update(update);
      }),
    );

    await app.render();
  }

  /** Feed button on a single storage-item row - see feedStorageFromSelf. */
  private static async _feedFromSelfAction(
    this: MagicPointSourcesApp,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const itemId = target.dataset["itemId"];
    requireValue(itemId, "No item id found to feed Magic Points into");
    const item = getStorageItems(this.actor).find((i) => i.id === itemId);
    requireValue(item, `Couldn't find storage item [${itemId}] to feed Magic Points into`);
    await feedStorageFromSelf(this.actor, item);
    await this.render();
  }

  private getRows(): HTMLElement[] {
    return Array.from(this.element.querySelectorAll<HTMLElement>("[data-source-id]"));
  }

  private clearDragOver(rows: HTMLElement[]): void {
    rows.forEach((r) => r.classList.remove("drag-over", "drag-over-after"));
  }

  /** The row to insert before, based on cursor position; undefined means "after the last row". */
  private findDropTarget(rows: HTMLElement[], clientY: number): HTMLElement | undefined {
    return rows.find((row) => {
      const rect = row.getBoundingClientRect();
      return clientY < rect.top + rect.height / 2;
    });
  }

  private _onDragStart(event: DragEvent): void {
    const row = event.currentTarget;
    if (!isFoundryElementInstanceOf(row, HTMLElement)) {
      return;
    }
    this.draggedSourceId = row.dataset["sourceId"];
    row.classList.add("dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", this.draggedSourceId ?? "");
      // Marker MIME type - see RqgActorSheetV2._onDragOver, which uses it to recognize and
      // ignore this drag (never a valid document drop) even if the cursor strays over the sheet.
      event.dataTransfer.setData(MAGIC_POINT_SOURCE_DRAG_TYPE, this.draggedSourceId ?? "");
    }
  }

  private _onDragOver(event: DragEvent): void {
    if (!this.draggedSourceId) {
      return;
    }
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }

    // dragover fires continuously while dragging, so the row list is looked up once here and
    // reused for both the target lookup and clearing prior indicators, rather than re-querying
    // the DOM for each.
    const rows = this.getRows();
    const target = this.findDropTarget(rows, event.clientY);
    this.clearDragOver(rows);
    if (target) {
      if (target.dataset["sourceId"] !== this.draggedSourceId) {
        target.classList.add("drag-over");
      }
    } else {
      rows[rows.length - 1]?.classList.add("drag-over-after");
    }
  }

  private _onDragLeave(event: DragEvent): void {
    const related = event.relatedTarget;
    if (!(related instanceof Node) || !this.element.contains(related)) {
      this.clearDragOver(this.getRows());
    }
    event.stopPropagation();
  }

  private async _onDrop(event: DragEvent): Promise<void> {
    event.stopPropagation();
    const draggedId = this.draggedSourceId;
    this.draggedSourceId = undefined;
    const rows = this.getRows();
    this.clearDragOver(rows);
    if (!draggedId) {
      return;
    }

    const target = this.findDropTarget(rows, event.clientY);
    const beforeId = target?.dataset["sourceId"] ?? null;
    if (beforeId === draggedId) {
      return;
    }
    const currentOrder = rows.map((r) => r.dataset["sourceId"] ?? "");
    const newOrder = moveSourceBefore(currentOrder, draggedId, beforeId);
    await setMagicPointDrawOrder(this.actor, newOrder);
    await this.render();
  }

  private _onDragEnd(event: DragEvent): void {
    const row = event.currentTarget;
    if (isFoundryElementInstanceOf(row, HTMLElement)) {
      row.classList.remove("dragging");
    }
    this.clearDragOver(this.getRows());
    this.draggedSourceId = undefined;
    event.stopPropagation();
  }
}

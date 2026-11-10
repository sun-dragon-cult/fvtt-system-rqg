import { Rqid, type RqidDisplay } from "../../system/api/rqid-api";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { isValidRqidString } from "../../system/api/rqid-validation";
import {
  getDomDataset,
  getRequiredDomDataset,
  isFoundryElementInstanceOf,
  localize,
  localizeItemType,
  toCamelCase,
} from "../../system/util";
import type { ItemTypeEnum } from "@item-model/item-types.ts";

type RqidDocument = foundry.abstract.Document.Any;

export class RqidLink<R extends string = string> {
  /** The rqid to link to */
  readonly rqid: R;

  bonus: number | null | undefined;

  constructor(rqid: R) {
    this.rqid = rqid;
  }

  static display(rqid: string | undefined, actor?: RqgActor | null): RqidDisplay {
    return Rqid.displayFromRqid(rqid, actor);
  }

  /**
   * The actor owning the document `ownerUuid` (or that actor itself). Resolves the actor part of the
   * uuid, as fromUuidSync can't reach items of compendium actors.
   */
  static ownerActor(ownerUuid: unknown): RqgActor | undefined {
    const actorUuid =
      typeof ownerUuid === "string" ? /^(.*?\bActor\.[^.]+)/.exec(ownerUuid)?.[1] : undefined;
    const actor = actorUuid ? fromUuidSync(actorUuid, { strict: false }) : undefined;
    return actor instanceof Actor ? (actor as unknown as RqgActor) : undefined;
  }

  /** Tooltip naming the document type the rqid links to. */
  static tooltip(rqid: string): string {
    const documentName = Rqid.getDocumentName(rqid);
    const itemTypeString = documentName === "Item" ? Rqid.getDocumentType(rqid) : undefined;
    const itemType = (itemTypeString ? toCamelCase(itemTypeString) : undefined) as
      ItemTypeEnum | undefined;
    return localize("RQG.Foundry.ContentLink.RqidLinkTitle", {
      rqid: rqid,
      documentName: game.i18n?.localize(`DOCUMENT.${documentName}`) ?? "",
      documentType: itemType ? localizeItemType(itemType) : "",
    });
  }

  static displayName(rqid: string | undefined): string {
    return RqidLink.display(rqid).name;
  }

  /** The links sorted by their shown names, each with its index in `links`. `displayOf` names a
   * link that isn't `{ rqid }`. */
  static sortedByName<T>(
    links: readonly T[] | undefined,
    displayOf: (link: T) => RqidDisplay = (link) =>
      RqidLink.display((link as { rqid?: string }).rqid),
  ): ({ link: T; index: number } & RqidDisplay)[] {
    return (links ?? [])
      .map((link, index) => ({ link, index, ...displayOf(link) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Handle rqid links for legacy AppV1/JQuery sheets.
   *
   * @deprecated Use addRqidLinkClickHandlers with HTMLElement for AppV2/native sheets.
   */
  static async addRqidLinkClickHandlersToJQuery(jQuery: JQuery): Promise<void> {
    RqidLink.bindHandlers(jQuery[0] as HTMLElement);
  }

  /**
   * Handle RQID link deletion for legacy AppV1/JQuery sheets.
   *
   * @deprecated Use bindHandlers with HTMLElement for AppV2/native sheets.
   */
  static addRqidLinkDeleteHandlersToJQuery(jQuery: JQuery, document: RqidDocument): void {
    RqidLink.bindHandlers(jQuery[0] as HTMLElement, document);
  }

  /**
   * Bind delegated handlers for RQID link open/delete behavior.
   * Uses one-time flags on the root element to avoid duplicate listeners on re-render.
   */
  static bindHandlers(html: HTMLElement, document?: RqidDocument): void {
    if (html.dataset["rqidLinkOpenBound"] !== "true") {
      html.dataset["rqidLinkOpenBound"] = "true";
      html.addEventListener("click", (ev: MouseEvent) => {
        if (!isFoundryElementInstanceOf(ev.target, Element)) {
          return;
        }

        const linkEl = ev.target.closest<HTMLElement>("[data-rqid-link]");
        if (!linkEl || isFoundryElementInstanceOf(ev.target, HTMLInputElement)) {
          return;
        }

        const rqid = getDomDataset(linkEl, "rqid-link");
        const targetRqidLink = getDomDataset(ev, "rqid-link");
        const targetUuid = getDomDataset(ev, "uuid");
        if (!rqid || targetUuid || targetRqidLink !== rqid) {
          return; // exclude inputs and embedded uuid & rqid links
        }

        if (isValidRqidString(rqid)) {
          const anchor = getDomDataset(linkEl, "anchor");
          void Rqid.renderRqidDocument(rqid, anchor);
        }
      });
    }

    if (document && html.dataset["rqidLinkDeleteBound"] !== "true") {
      html.dataset["rqidLinkDeleteBound"] = "true";
      html.addEventListener("click", (ev: MouseEvent) => {
        if (!isFoundryElementInstanceOf(ev.target, Element)) {
          return;
        }

        const deleteEl = ev.target.closest<HTMLElement>("[data-delete-from-property]");
        if (!deleteEl || !html.contains(deleteEl)) {
          return;
        }

        ev.preventDefault();
        ev.stopPropagation();
        void RqidLink.deleteRqidLink(deleteEl, document);
      });
    }

    if (document && html.dataset["rqidLinkBonusBound"] !== "true") {
      html.dataset["rqidLinkBonusBound"] = "true";
      html.addEventListener("change", (ev: Event) => {
        if (!isFoundryElementInstanceOf(ev.target, HTMLInputElement)) {
          return;
        }

        const bonusEl = ev.target.closest<HTMLInputElement>("[data-edit-bonus-property-name]");
        if (!bonusEl || !html.contains(bonusEl)) {
          return;
        }

        void RqidLink.updateRqidLinkBonus(bonusEl, document);
      });
    }
  }

  /**
   * Bind click handlers on [data-delete-from-property] elements to delete RqidLinks.
   * For embedded items the update is routed through the parent actor's updateEmbeddedDocuments;
   * for all other documents (actors, top-level items) document.update() is used directly.
   */
  static addRqidLinkDeleteHandlers(html: HTMLElement, document: RqidDocument): void {
    RqidLink.bindHandlers(html, document);
  }

  /**
   * Handle RQID link bonus editing for legacy AppV1/JQuery sheets.
   *
   * @deprecated Use bindHandlers with HTMLElement for AppV2/native sheets.
   */
  static addRqidLinkBonusHandlersToJQuery(jQuery: JQuery, document: RqidDocument): void {
    RqidLink.bindHandlers(jQuery[0] as HTMLElement, document);
  }

  static async addRqidLinkClickHandlers(html: HTMLElement): Promise<void> {
    RqidLink.bindHandlers(html);
  }

  private static async deleteRqidLink(el: HTMLElement, document: RqidDocument): Promise<void> {
    const deleteRqid = getRequiredDomDataset(el, "delete-rqid");
    const deleteIndexRaw = getDomDataset(el, "delete-index");
    const deleteIndex = Number.parseInt(deleteIndexRaw ?? "", 10);
    const deleteFromPropertyName = getRequiredDomDataset(el, "delete-from-property");

    const deleteFromProperty = foundry.utils.getProperty(
      (document as any).system as object,
      deleteFromPropertyName,
    );

    const updateKey = `system.${deleteFromPropertyName}`;
    let newValue: RqidLink[] | null = null;
    if (Array.isArray(deleteFromProperty)) {
      const links = [...(deleteFromProperty as RqidLink[])];
      if (Number.isInteger(deleteIndex) && deleteIndex >= 0 && deleteIndex < links.length) {
        links.splice(deleteIndex, 1);
        newValue = links;
      } else {
        newValue = links.filter((r) => r.rqid !== deleteRqid);
      }
    }

    if ((document as any).isEmbedded && (document as any).actor) {
      await (document as any).actor.updateEmbeddedDocuments("Item", [
        { _id: document.id, [updateKey]: newValue },
      ]);
      return;
    }

    await (document as any).update({ [updateKey]: newValue });
  }

  private static async updateRqidLinkBonus(
    el: HTMLInputElement,
    document: RqidDocument,
  ): Promise<void> {
    const editRqid = getRequiredDomDataset(el, "rqid");
    const editPropertyName = getRequiredDomDataset(el, "edit-bonus-property-name");
    const sourceProperty = foundry.utils.getProperty(
      (document as any).system as object,
      editPropertyName,
    );

    const parsedBonus = Number(el.value);
    const bonus = Number.isFinite(parsedBonus) ? parsedBonus : null;

    let updateProperty: RqidLink | RqidLink[] | null = null;
    if (Array.isArray(sourceProperty)) {
      updateProperty = [...(sourceProperty as RqidLink[])].map((rqidLink) =>
        rqidLink.rqid === editRqid ? { ...rqidLink, bonus } : rqidLink,
      );
    } else if (sourceProperty) {
      updateProperty = { ...(sourceProperty as RqidLink), bonus };
    }

    const updateKey = `system.${editPropertyName}`;
    if ((document as any).isEmbedded && (document as any).actor) {
      await (document as any).actor.updateEmbeddedDocuments("Item", [
        { _id: document.id, [updateKey]: updateProperty },
      ]);
      return;
    }

    await (document as any).update({ [updateKey]: updateProperty });
  }
}

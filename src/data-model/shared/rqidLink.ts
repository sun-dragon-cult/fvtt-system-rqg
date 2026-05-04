import { Rqid } from "../../system/api/rqidApi";
import { isValidRqidString } from "../../system/api/rqidValidation";
import { getDomDataset, getRequiredDomDataset } from "../../system/util";

export class RqidLink<R extends string = string> {
  /** The rqid to link to */
  readonly rqid: R;
  /** Display name of the link */
  readonly name: string;

  bonus: number | null | undefined;

  constructor(rqid: R, name: string) {
    this.rqid = rqid;
    this.name = name;
  }

  /**
   * Handle rqid links for legacy AppV1/JQuery sheets.
   *
   * @deprecated Use addRqidLinkClickHandlers with HTMLElement for AppV2/native sheets.
   */
  static async addRqidLinkClickHandlersToJQuery(jQuery: JQuery): Promise<void> {
    await RqidLink.addRqidLinkClickHandlers(jQuery[0] as HTMLElement);
  }

  /**
   * Bind click handlers on [data-delete-from-property] elements to delete RqidLinks.
   * For embedded items the update is routed through the parent actor's updateEmbeddedDocuments;
   * for all other documents (actors, top-level items) document.update() is used directly.
   */
  static addRqidLinkDeleteHandlers(
    html: HTMLElement,
    document: foundry.abstract.Document.Any,
  ): void {
    html.querySelectorAll<HTMLElement>("[data-delete-from-property]").forEach((el) => {
      const deleteRqid = getRequiredDomDataset(el, "delete-rqid");
      const deleteIndexRaw = getDomDataset(el, "delete-index");
      const deleteIndex = Number.parseInt(deleteIndexRaw ?? "", 10);
      const deleteFromPropertyName = getRequiredDomDataset(el, "delete-from-property");
      el.addEventListener("click", async () => {
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
        } else {
          await (document as any).update({ [updateKey]: newValue });
        }
      });
    });
  }

  static async addRqidLinkClickHandlers(html: HTMLElement): Promise<void> {
    html.querySelectorAll("[data-rqid-link]").forEach((el: Element) => {
      const rqid = getDomDataset(el, "rqid-link");
      const anchor = getDomDataset(el, "anchor");
      if (rqid) {
        el.addEventListener("click", async (ev) => {
          const targetRqidLink = getDomDataset(ev, "rqid-link");
          const targetUuid = getDomDataset(ev, "uuid");

          if (ev.target instanceof HTMLInputElement || targetUuid || targetRqidLink !== rqid) {
            return; // exclude inputs and embedded uuid & rqid links
          }
          if (isValidRqidString(rqid)) {
            await Rqid.renderRqidDocument(rqid, anchor);
          }
        });
      }
    });
  }
}

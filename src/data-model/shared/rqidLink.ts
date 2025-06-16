import { Rqid } from "../../system/api/rqidApi";
import { getDomDataset } from "../../system/util";

export class RqidLink {
  /** The rqid to link to */
  readonly rqid: string;
  /** Display name of the link */
  readonly name: string;

  bonus?: number | undefined; // TODO Should not be here.

  constructor(rqid: string, name: string) {
    this.rqid = rqid;
    this.name = name;
  }

  // Handle rqid links
  static async addRqidLinkClickHandlersToJQuery(jQuery: JQuery): Promise<void> {
    await RqidLink.addRqidLinkClickHandlers(jQuery[0] as HTMLElement);
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
          await Rqid.renderRqidDocument(rqid, anchor);
        });
      }
    });
  }
}

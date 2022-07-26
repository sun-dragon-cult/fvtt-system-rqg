import { Rqid } from "../../system/api/rqidApi";
import { getDomDataset } from "../../system/util";

export class RqidLink {
  /** The rqid to link to */
  rqid: string = "";
  /** Display name of the link */
  name: string = "";
  documentType: string = ""; // TODO not necessary - part of the rqid
  itemType?: string; // TODO not necessary - part of the rqid
  bonus: number | undefined; // TODO Should not be here.

  // Handle rqid links
  static async addRqidLinkClickHandlers(html: JQuery): Promise<void> {
    html.find("[data-rqid-link]").each((i: number, el: HTMLElement) => {
      const rqid = getDomDataset(el, "rqid-link");
      if (rqid) {
        el.addEventListener("click", async () => {
          await Rqid.renderRqidDocument(rqid);
        });
      }
    });
  }
}

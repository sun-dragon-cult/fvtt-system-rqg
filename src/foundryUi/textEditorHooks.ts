import { getGame, localize } from "../system/util";
import { Rqid } from "../system/api/rqidApi";

export class TextEditorHooks {
  public static init() {
    const pattern = /@RQID\[([^#\]]+)(?:#([^\]]+))?](?:{([^}]+)})?/g;
    // @ts-expect-error CONFIG.TextEditor
    CONFIG.TextEditor.enrichers.push({ pattern, enricher });

    async function enricher(match: RegExpMatchArray, options: any): Promise<HTMLElement> {
      const rqid = match[1] as string | undefined;
      const linkName = match[3] as string | undefined;
      const linkIcon = Rqid.getRqidIcon(rqid);
      const documentName = rqid && Rqid.getDocumentName(rqid);
      const a = document.createElement("a");
      a.classList.add("rqid-content-link");
      if (!linkIcon || !linkName || !documentName) {
        a.classList.add("malformed-rqid-link");
      }
      a.draggable = true;
      a.dataset.tooltip = localize("RQG.Foundry.ContentLink.RqidLinkTitle", {
        rqid: rqid,
        documentName: getGame().i18n.localize(`DOCUMENT.${documentName}`),
      });
      a.dataset.rqidLink = rqid;
      a.innerHTML = `${linkIcon}${linkName}`;
      return a;
    }
  }
}

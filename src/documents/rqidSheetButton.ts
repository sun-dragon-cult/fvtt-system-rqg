import { getGame, getGameUser } from "../system/util";
import { RqidEditor } from "../applications/rqidEditor/rqidEditor";
import { systemId } from "../system/config";
import { DocumentRqidFlags, documentRqidFlags } from "../data-model/shared/rqgDocumentFlags";

/**
 * Create an ID link button in the document sheet header which displays the document ID and copies to clipboard
 */
export async function addRqidLinkToSheetHtml(
  html: JQuery<JQuery.Node>,
  sheet: DocumentSheet<any, any>,
) {
  const title = html.find(".window-title");
  const rqid: DocumentRqidFlags = sheet.object.getFlag(systemId, documentRqidFlags);
  const rqidLink = document.createElement("a");
  rqidLink.classList.add("title-rqid-link");
  rqidLink.setAttribute("alt", "Edit / Copy document rqid");
  rqidLink.dataset.tooltip = await renderTemplate("systems/rqg/documents/rqid-tooltip.hbs", {
    rqid: rqid,
  });
  rqidLink.dataset.tooltipDirection = "UP";
  rqidLink.innerHTML = '<i class="fas fa-fingerprint"></i>';
  if (getGameUser().isGM) {
    rqidLink.addEventListener("click", (event) => {
      event.preventDefault();
      new RqidEditor(sheet.object, {}).render(true, { focus: true });
    });
  }
  rqidLink.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    // @ts-expect-error clipboard
    getGame().clipboard.copyPlainText(rqid?.id);
    ui.notifications?.info(`Copied Rqid ${rqid?.id}`);
  });
  title.append(rqidLink);
}

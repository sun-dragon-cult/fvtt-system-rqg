import { RqidEditor } from "../applications/rqidEditor/rqidEditor";
import { systemId } from "../system/config";
import { type DocumentRqidFlags, documentRqidFlags } from "../data-model/shared/rqgDocumentFlags";
import { templatePaths } from "../system/loadHandlebarsTemplates";

/**
 * Create an ID link button in the document sheet header which displays the document ID and copies to clipboard.
 * This version works with application v2 sheets.
 */
export async function addRqidLinkToSheet(sheet: DocumentSheet<any, any>): Promise<void> {
  // @ts-expect-error window, do not add duplicates
  if (sheet?.window?.header && sheet.window.header.querySelector(".fa-fingerprint") == null) {
    const rqid: DocumentRqidFlags = sheet.options.document.getFlag("rqg", "documentRqidFlags");
    const rqidLink = await createRqidLink(rqid, sheet);
    // @ts-expect-error window
    sheet.window.close?.insertAdjacentElement("beforebegin", rqidLink);
  }
}

/**
 * Create an ID link button in the document sheet header which displays the document ID and copies to clipboard
 * Only to be used with application v1 sheets.
 */
export async function addRqidLinkToSheetJQuery(
  jquery: JQuery<JQuery.Node>,
  sheet: DocumentSheet.Any,
) {
  const title = jquery.find(".window-title");
  const rqid = (sheet.object as any).getFlag(systemId, documentRqidFlags) as DocumentRqidFlags;
  const rqidLink = await createRqidLink(rqid, sheet, "a");
  title.append($(rqidLink));
}

async function createRqidLink(
  rqid: DocumentRqidFlags,
  sheet: DocumentSheet,
  rootElement: "a" | "button" = "button",
): Promise<HTMLElement> {
  const rqidLink = document.createElement(rootElement);
  rqidLink.setAttribute("type", "button");
  rqidLink.setAttribute("aria-label", "Edit / Copy document rqid");
  rqidLink.classList.add("header-control", "fa-solid", "fa-fingerprint", "icon");
  rqidLink.dataset["tooltipDirection"] = "UP";
  // @ts-expect-error renderTemplate
  rqidLink.dataset.tooltip = await foundry.applications.handlebars.renderTemplate(
    templatePaths.rqidTooltip,
    {
      rqid: rqid,
    },
  );
  if (game.user?.isGM) {
    rqidLink.addEventListener("click", (event) => {
      event.preventDefault();
      new RqidEditor(sheet.document, {}).render(true, { focus: true });
    });
  }
  rqidLink.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    // @ts-expect-error clipboard
    game.clipboard.copyPlainText(rqid?.id);
    ui.notifications?.info(`Copied Rqid ${rqid?.id}`);
  });
  return rqidLink;
}

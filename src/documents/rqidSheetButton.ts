import { RqidEditor } from "../applications/rqidEditor/rqidEditor";
import { systemId } from "../system/config";
import { type DocumentRqidFlags, documentRqidFlags } from "../data-model/shared/rqgDocumentFlags";
import { templatePaths } from "../system/loadHandlebarsTemplates";

export const rqidFrameButtonAction = "rqgRqid";

function openRqidEditor(sheet: DocumentSheet<any, any>): void {
  if (!game.user?.isGM) {
    return;
  }
  new RqidEditor(sheet.document, {}).render(true, { focus: true });
}

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
 * Build an AppV2 frame-button entry for the RQID control.
 */
export function getRqidFrameButton(sheet: DocumentSheet<any, any>): any {
  const rqid: DocumentRqidFlags = sheet.options.document.getFlag(systemId, documentRqidFlags);
  const lastpartOfId = rqid?.id?.split(".")[2]?.trim();

  return {
    icon: "fa-solid fa-fingerprint",
    label: "",
    action: rqidFrameButtonAction,
    tooltip: "Edit / Copy document rqid",
    // Keep existing visual warning for missing rqids.
    cssClass: lastpartOfId ? "" : "rqid-missing",
  };
}

/**
 * Keep AppV2 RQID frame button behavior in sync with runtime data.
 * This binds context-menu copy and refreshes tooltip/missing-state each render.
 */
export async function decorateRqidFrameButton(sheet: DocumentSheet<any, any>): Promise<void> {
  // @ts-expect-error window/header typing differs between AppV1/AppV2 in fvtt-types
  const header = sheet.window?.header as HTMLElement | undefined;
  const button = header?.querySelector<HTMLElement>(
    `.header-control[data-action='${rqidFrameButtonAction}']`,
  );
  if (!button) {
    return;
  }

  const rqid: DocumentRqidFlags = sheet.options.document.getFlag(systemId, documentRqidFlags);
  const lastpartOfId = rqid?.id?.split(".")[2]?.trim();
  button.classList.toggle("rqid-missing", !lastpartOfId);
  button.setAttribute("aria-label", "Edit / Copy document rqid");
  button.dataset["tooltipDirection"] = "UP";
  button.dataset["tooltip"] = await foundry.applications.handlebars.renderTemplate(
    templatePaths.rqidTooltip,
    {
      rqid,
    },
  );

  button.onclick = (event: MouseEvent) => {
    event.preventDefault();
    openRqidEditor(sheet);
  };

  button.oncontextmenu = (event: MouseEvent) => {
    event.preventDefault();
    // @ts-expect-error clipboard
    game.clipboard.copyPlainText(rqid?.id);
    ui.notifications?.info(`Copied Rqid ${rqid?.id}`);
  };
}

/**
 * Create an ID link button in the document sheet header which displays the document ID and copies to clipboard
 * Only to be used with application v1 sheets.
 *
 * @deprecated Use addRqidLinkToSheet for AppV2/native sheets.
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
  const lastpartOfId = rqid?.id?.split(".")[2]?.trim();
  if (!lastpartOfId) {
    rqidLink.classList.add("rqid-missing");
  }
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
      openRqidEditor(sheet as DocumentSheet<any, any>);
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

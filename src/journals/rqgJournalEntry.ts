import { systemId } from "../system/config";
import { Rqid } from "../system/api/rqidApi";
import { RqidEditor } from "../applications/rqidEditor/rqidEditor";
import { RqidLink } from "../data-model/shared/rqidLink";

export class RqgJournalEntry extends JournalEntry {
  public static init() {
    CONFIG.JournalEntry.documentClass = RqgJournalEntry;

    Hooks.on("getApplicationHeaderButtons", RqgJournalEntry.addRqidButton);
    Hooks.on("renderJournalPageSheet", RqgJournalEntry.addRqidEventListener);
  }

  private static addRqidButton(doc: any, buttons: any[]) {
    if (
      !(doc instanceof RqidEditor) &&
      // @ts-expect-error JournalEntryPage
      (doc.object instanceof JournalEntry || doc.object instanceof JournalEntryPage)
    ) {
      buttons.splice(0, 0, {
        class: "edit-rqid",
        label: "Rqid",
        icon: "fas fa-fingerprint",
        onclick: () => {
          new RqidEditor(doc.object, {}).render(true, { focus: true });
        },
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static addRqidEventListener(doc: any, html: JQuery, options: any) {
    RqidLink.addRqidLinkClickHandlers(html);
  }

  /**
   * Only handles embedded Pages
   */
  // @ts-expect-error JournalEntryPage
  public getEmbeddedDocumentsByRqid(rqid: string): JournalEntryPage[] {
    // @ts-expect-error pages
    return this.pages.filter((i) => i.getFlag(systemId, "documentRqidFlags.id") === rqid);
  }

  // @ts-expect-error JournalEntryPage
  public getBestEmbeddedDocumentByRqid(rqid: string): JournalEntryPage | undefined {
    return this.getEmbeddedDocumentsByRqid(rqid).sort(Rqid.compareRqidPrio)[0];
  }
}

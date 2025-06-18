import { systemId } from "../system/config";
import { Rqid } from "../system/api/rqidApi";
import { RqidLink } from "../data-model/shared/rqidLink";
import { addRqidLinkToSheet } from "../documents/rqidSheetButton";

export class RqgJournalEntry extends JournalEntry {
  public static init() {
    CONFIG.JournalEntry.documentClass = RqgJournalEntry;

    Hooks.on("renderJournalEntryPageSheet", RqgJournalEntry.addRqidHandling);
    Hooks.on("renderJournalEntrySheet", RqgJournalEntry.addRqidTitleIcon);
  }

  // TODO can the specific clickhandlers be removed and a generic one on body used instead?

  private static async addRqidHandling(sheet: any, html: HTMLElement) {
    await addRqidLinkToSheet(sheet);
    await RqidLink.addRqidLinkClickHandlers(html);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static async addRqidTitleIcon(sheet: any, html: HTMLElement, options: any) {
    await addRqidLinkToSheet(sheet);
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

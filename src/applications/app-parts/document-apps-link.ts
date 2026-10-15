type AppsDocument = { apps: Record<string, unknown> };

/**
 * Keeps an application in a document's `apps`, so changes to the document rerender it - what
 * DocumentSheetV2 does for sheets. Call `link` from `_onRender` and `unlink` from `_onClose`.
 */
export class DocumentAppsLink {
  private document: AppsDocument | undefined;

  constructor(private readonly app: { id: string }) {}

  /** Link to `document`, moving off any earlier one. */
  link(document: AppsDocument | null | undefined): void {
    if (document === this.document) {
      return;
    }
    this.unlink();
    if (document) {
      document.apps[this.app.id] = this.app;
      this.document = document;
    }
  }

  unlink(): void {
    if (this.document?.apps[this.app.id] === this.app) {
      delete this.document.apps[this.app.id];
    }
    this.document = undefined;
  }
}

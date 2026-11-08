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

type RenderableApp = {
  id: string;
  readonly rendered: boolean;
  render(...args: unknown[]): unknown;
};

/**
 * Rerenders an app when any of a set of other documents (or their items/effects) change, e.g. an
 * actor sheet showing another actor's Magic Points. Foundry closes everything in a deleted
 * document's `apps`, so a stand-in goes there instead of the app: it forwards renders, and on
 * close rerenders the app rather than closing it. Call `link` on each render, `unlink` on close.
 */
export class RelatedDocumentsAppsLink {
  private documents = new Set<AppsDocument>();
  readonly standIn: RenderableApp & { close(...args: unknown[]): Promise<void> };

  constructor(app: RenderableApp) {
    this.standIn = {
      get id() {
        return app.id;
      },
      get rendered() {
        return app.rendered;
      },
      render: (...args: unknown[]) => app.render(...args),
      close: async () => {
        if (app.rendered) {
          await app.render();
        }
      },
    };
  }

  /** Link to exactly `documents`, unlinking any earlier ones no longer among them. */
  link(documents: Iterable<AppsDocument | null | undefined>): void {
    const next = new Set<AppsDocument>();
    for (const document of documents) {
      // Never displace another app, e.g. the sheet of the document itself
      const existing = document?.apps[this.standIn.id];
      if (document && (existing === undefined || existing === this.standIn)) {
        next.add(document);
      }
    }
    for (const document of this.documents) {
      if (!next.has(document)) {
        this.remove(document);
      }
    }
    for (const document of next) {
      document.apps[this.standIn.id] = this.standIn;
    }
    this.documents = next;
  }

  unlink(): void {
    this.documents.forEach((document) => this.remove(document));
    this.documents.clear();
  }

  private remove(document: AppsDocument): void {
    if (document.apps[this.standIn.id] === this.standIn) {
      delete document.apps[this.standIn.id];
    }
  }
}

import { systemId } from "../../system/config";
import { escapeRegex, getRequiredDomDataset, toKebabCase, trimChars } from "../../system/util";
import { Rqid } from "../../system/api/rqidApi";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

import Document = foundry.abstract.Document;
import FormApplication = foundry.appv1.api.FormApplication;

export class RqidEditor extends FormApplication {
  private document: Document.Any;
  private parentAppLinked = false;

  constructor(document: Document.Any, options: any) {
    super(document, options);
    this.document = document;
  }

  private isAppAwareDocument(
    document: unknown,
  ): document is Document.Any & { apps: Record<string, unknown> } {
    return !!document && typeof document === "object" && "apps" in document;
  }

  private linkToParentDocumentApps(): void {
    if (this.parentAppLinked || !this.document.isEmbedded) {
      return;
    }

    const parentDocument = (this.document as any).parent as Document.Any | undefined;
    if (!this.isAppAwareDocument(parentDocument)) {
      return;
    }

    parentDocument.apps[String(this.appId)] = this;
    this.parentAppLinked = true;
  }

  private unlinkFromParentDocumentApps(): void {
    if (!this.parentAppLinked || !this.document.isEmbedded) {
      return;
    }

    const parentDocument = (this.document as any).parent as Document.Any | undefined;
    if (
      this.isAppAwareDocument(parentDocument) &&
      parentDocument.apps[String(this.appId)] === this
    ) {
      delete parentDocument.apps[String(this.appId)];
    }
    this.parentAppLinked = false;
  }

  private async syncRqidHeaderIconState(): Promise<void> {
    const rqid = Rqid.getDocumentFlag(this.document);
    const lastPartOfId = rqid?.id?.split(".")[2]?.trim();
    const rqidMissing = !lastPartOfId;

    const tooltip = await foundry.applications.handlebars.renderTemplate(
      templatePaths.rqidTooltip,
      {
        rqid: rqid,
      },
    );

    const apps = Object.values((this.document as any)?.apps ?? {}) as Array<{
      window?: { header?: HTMLElement };
      element?: JQuery<HTMLElement> | HTMLElement;
    }>;

    for (const app of apps) {
      const elementRoot =
        app.element instanceof HTMLElement
          ? app.element
          : ((app.element?.[0] as HTMLElement | undefined) ?? undefined);

      const icon =
        app.window?.header?.querySelector<HTMLElement>(".fa-fingerprint") ??
        elementRoot?.querySelector<HTMLElement>(".fa-fingerprint") ??
        undefined;

      if (!icon) {
        continue;
      }

      icon.classList.toggle("rqid-missing", rqidMissing);
      icon.dataset["tooltipDirection"] = "UP";
      icon.dataset["tooltip"] = tooltip;
    }
  }

  override get id() {
    return `${this.constructor.name}-${trimChars(toKebabCase(this.document.uuid ?? ""), "-")}`;
  }

  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "form", "rqid-editor"],
      popOut: true,
      template: templatePaths.dialogRqidEditor,
      width: 650,
      left: 35,
      top: 15,
      title: "Rqid Editor",
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
      resizable: true,
    });
  }

  override async getData(): Promise<any> {
    const appData: any = {};

    const documentRqid: string | undefined = Rqid.getDocumentFlag(this.document)?.id;
    const documentLang: string | undefined = Rqid.getDocumentFlag(this.document)?.lang;

    // For embedded documents (e.g. JournalEntryPage inside a JournalEntry), get the parent rqid for display context
    const parentRqid: string = this.document.isEmbedded
      ? (Rqid.getDocumentFlag((this.document as any).parent)?.id ?? "")
      : "";

    if (documentRqid && documentLang) {
      const rqidDocumentPrefix = documentRqid.split(".")[0];
      const rqidSearchRegex = new RegExp("^" + escapeRegex(documentRqid) + "$");

      // Embedded documents (like JournalEntryPage with "jp" prefix) have no top-level game collection,
      // so skip the duplicate search to avoid errors from getGameProperty("jp")
      if (!this.document.isEmbedded) {
        const worldDocuments = await Rqid.fromRqidRegexAll(
          rqidSearchRegex,
          rqidDocumentPrefix,
          documentLang,
          "world",
        );
        const compendiumDocuments = await Rqid.fromRqidRegexAll(
          rqidSearchRegex,
          rqidDocumentPrefix,
          documentLang,
          "packs",
        );

        const worldDocumentInfo: any[] = [];
        for (const d of worldDocuments) {
          const link = await foundry.applications.ux.TextEditor.implementation.enrichHTML(d.link);
          worldDocumentInfo.push({
            priority: Rqid.getDocumentFlag(d)?.priority ?? -Infinity,
            link: link,
            folder: this.getPath(d),
          });
        }

        const compendiumDocumentInfo: any[] = [];
        for (const d of compendiumDocuments) {
          const link = await foundry.applications.ux.TextEditor.implementation.enrichHTML(d.link);
          compendiumDocumentInfo.push({
            priority: Rqid.getDocumentFlag(d)?.priority ?? -Infinity,
            link: link,
            compendium: `${d.compendium?.metadata?.label} ⇒ ${d.compendium?.metadata?.packageName}`,
          });
        }

        const uniqueWorldPriorityCount = new Set(
          worldDocuments.map((d) => Rqid.getDocumentFlag(d)?.priority ?? -Infinity),
        ).size;
        if (uniqueWorldPriorityCount !== worldDocuments.length) {
          appData.warnDuplicateWorldPriority = true;
        }

        const uniqueCompendiumPriorityCount = new Set(
          compendiumDocuments.map((d) => Rqid.getDocumentFlag(d)?.priority ?? -Infinity),
        ).size;
        if (uniqueCompendiumPriorityCount !== compendiumDocuments.length) {
          appData.warnDuplicateCompendiumPriority = true;
        }

        appData.worldDuplicates = worldDocuments.length ?? 0;
        appData.compendiumDuplicates = compendiumDocuments.length ?? 0;
        appData.worldDocumentInfo = worldDocumentInfo;
        appData.compendiumDocumentInfo = compendiumDocumentInfo;
      }

      // For embedded documents, construct the full rqid including the parent's rqid
      const fullRqid = parentRqid ? `${parentRqid}.${documentRqid}` : documentRqid;
      appData.rqidLink = `@RQID[${fullRqid}]{${this.document.name}}`;
      appData.fullRqid = fullRqid;
    }

    appData.supportedLanguagesOptions = CONFIG.supportedLanguages;
    appData.id = this.document.id;
    appData.parentId = this.document?.parent?.id ?? "";
    appData.parentUuid = this.document?.parent?.uuid ?? "";
    appData.uuid = this.document.uuid;

    appData.folder = this.getPath(this.document);
    appData.flags = {
      rqg: {
        documentRqidFlags: {
          lang: Rqid.getDocumentFlag(this.document)?.lang ?? CONFIG.RQG.fallbackLanguage,
          priority: Rqid.getDocumentFlag(this.document)?.priority ?? 0,
        },
      },
    };
    const [documentIdPart, documentType] = Rqid.getDefaultRqid(this.document).split(".");
    appData.rqidPrefix = `${documentIdPart}.${documentType}.`;
    appData.rqidNamePart = Rqid.getDocumentFlag(this.document)?.id?.split(".").pop();
    appData.parentRqid = parentRqid;
    appData.parentMissingRqid = this.document.isEmbedded && !parentRqid;

    return appData;
  }

  override get title(): string {
    return `${super.title} ${this.document.documentName}: ${this.document.name}`;
  }

  protected override _getSubmitData(
    updateData?: Record<string, any> | null,
  ): Partial<Record<string, unknown>> {
    return super._getSubmitData(updateData);
  }

  override activateListeners(html: JQuery) {
    this.linkToParentDocumentApps();

    // update the document with a default rqid
    html[0]?.querySelectorAll<HTMLElement>("[data-generate-default-rqid]").forEach((el) => {
      const uuid = getRequiredDomDataset(el, "document-uuid");
      el.addEventListener("click", async () => {
        const document = await fromUuid(uuid);
        if (!document) {
          const msg = "Couldn't find document from uuid";
          console.warn("RQG | ", msg);
          return;
        }

        const updateData = {
          flags: {
            rqg: {
              documentRqidFlags: {
                id: Rqid.getDefaultRqid(document),
                lang: Rqid.getDocumentFlag(document)?.lang ?? CONFIG.RQG.fallbackLanguage,
                priority: Rqid.getDocumentFlag(document)?.priority ?? 0,
              },
            },
          },
        };
        await (this.document as any).update(foundry.utils.flattenObject(updateData));
        await this.syncRqidHeaderIconState();
        this.render();
      });
    });

    // Copy associated input value to clipboard
    html[0]?.querySelectorAll<HTMLElement>("[data-item-copy-input]").forEach((el) => {
      el.addEventListener("click", async () => {
        const input = el.previousElementSibling as HTMLInputElement;
        await navigator.clipboard.writeText(input.value);
      });
    });

    html[0]?.querySelectorAll<HTMLElement>("[data-open-parent-rqid-editor]").forEach((el) => {
      el.addEventListener("click", async (event) => {
        event.preventDefault();
        const parentUuid = getRequiredDomDataset(el, "parent-document-uuid");
        const parentDocument = await fromUuid(parentUuid);
        if (!parentDocument) {
          console.warn("RQG | Could not find parent document from uuid", parentUuid);
          return;
        }
        new RqidEditor(parentDocument as Document.Any, {}).render(true, { focus: true });
      });
    });

    super.activateListeners(html);
  }

  override async close(options?: FormApplication.CloseOptions): Promise<void> {
    this.unlinkFromParentDocumentApps();
    return await super.close(options);
  }

  async _updateObject(event: Event, formData: any): Promise<void> {
    const [documentIdPart, documentType] = Rqid.getDefaultRqid(this.document).split(".");
    const rqidNamePart = toKebabCase(formData["rqidNamePart"].trim());
    formData["flags.rqg.documentRqidFlags.id"] =
      rqidNamePart && (formData["flags.rqg.documentRqidFlags.id"] = rqidNamePart)
        ? `${documentIdPart}.${documentType}.${rqidNamePart}`
        : null;
    delete formData["rqidNamePart"];

    formData["flags.rqg.documentRqidFlags.priority"] =
      Number(formData["flags.rqg.documentRqidFlags.priority"]) || 0;

    await (this.document as any).update(formData);
    await this.syncRqidHeaderIconState();
    this.render();
  }

  getPath(document: any): string {
    let path = "";
    let folder = document?.folder;
    while (folder) {
      path = "/" + folder.name + path;
      folder = folder.folder;
    }
    return document?.parent || document?.compendium ? "" : path || "/";
  }
}

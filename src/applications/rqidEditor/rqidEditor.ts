import { systemId } from "../../system/config";
import {
  escapeRegex,
  getRequiredDomDataset,
  localize,
  toKebabCase,
  trimChars,
} from "../../system/util";
import { Rqid, isRqidDocumentName } from "../../system/api/rqidApi";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

import Document = foundry.abstract.Document;

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

interface DocumentInfo {
  priority: number;
  link: string;
  isCurrent: boolean;
  hasDuplicatePriority: boolean;
}

interface RqidEditorData {
  warnDuplicateWorldPriority?: boolean;
  warnDuplicateCompendiumPriority?: boolean;
  worldDuplicates?: number;
  compendiumDuplicates?: number;
  worldDocumentInfo?: (DocumentInfo & { folder: string })[];
  compendiumDocumentInfo?: (DocumentInfo & { compendium: string })[];
  rqidLink?: string;
  fullRqid?: string;
  supportedLanguagesOptions: typeof CONFIG.supportedLanguages;
  id: string | null;
  parentId: string;
  parentUuid: string;
  uuid: string;
  folder: string;
  flags: { rqg: { documentRqidFlags: { lang: string; priority: number } } };
  rqidDocumentNamePart: string;
  rqidNamePart: string | undefined;
  parentRqid: string;
  parentMissingRqid: boolean;
  buttons: {
    type: "button" | "submit";
    action?: "cancel";
    icon: string;
    label: string;
  }[];
}

export class RqidEditor extends HandlebarsApplicationMixin(ApplicationV2<RqidEditorData>) {
  private document: Document.Any;
  private parentAppLinked = false;
  private duplicateLookupDebounce?: number;
  private duplicateLookupRequestId = 0;

  constructor(document: Document.Any, options?: any) {
    super(options);
    this.document = document;
  }

  static override DEFAULT_OPTIONS = {
    classes: [systemId, "rqid-editor"],
    tag: "form",
    window: {
      title: "Rqid Editor",
      resizable: true,
      contentClasses: ["standard-form", "rqid-editor-main"],
    },
    position: {
      width: 650,
      left: 35,
      top: 15,
    },
    form: {
      handler: RqidEditor.onSubmit,
      closeOnSubmit: true,
    },
    actions: {
      cancel: RqidEditor.onCancel,
    },
  };

  static override PARTS = {
    body: {
      template: templatePaths.dialogRqidEditor,
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
    info: {
      template: templatePaths.dialogRqidEditorInfo,
      scrollable: [""],
    },
  };

  override get id(): string {
    return `${this.constructor.name}-${trimChars(toKebabCase(this.document.uuid ?? ""), "-")}`;
  }

  override get title(): string {
    return `${super.title} ${this.document.documentName}: ${this.document.name}`;
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

    const parentDocument = this.document.parent;
    if (!this.isAppAwareDocument(parentDocument)) {
      return;
    }

    parentDocument.apps[String(this.id)] = this;
    this.parentAppLinked = true;
  }

  private unlinkFromParentDocumentApps(): void {
    if (!this.parentAppLinked || !this.document.isEmbedded) {
      return;
    }

    const parentDocument = this.document.parent;
    if (this.isAppAwareDocument(parentDocument) && parentDocument.apps[String(this.id)] === this) {
      delete parentDocument.apps[String(this.id)];
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

    const apps = Object.values(
      this.isAppAwareDocument(this.document) ? this.document.apps : {},
    ) as Array<{
      window?: { header?: HTMLElement };
      element?: HTMLElement;
    }>;

    for (const app of apps) {
      const icon =
        app.window?.header?.querySelector<HTMLElement>(".fa-fingerprint") ??
        app.element?.querySelector<HTMLElement>(".fa-fingerprint") ??
        undefined;

      if (!icon) {
        continue;
      }

      icon.classList.toggle("rqid-missing", rqidMissing);
      icon.dataset["tooltipDirection"] = "UP";
      icon.dataset["tooltip"] = tooltip;
    }
  }

  override async _prepareContext(): Promise<RqidEditorData> {
    const documentRqid: string | undefined = Rqid.getDocumentFlag(this.document)?.id;
    const documentLang: string | undefined = Rqid.getDocumentFlag(this.document)?.lang;

    const parentRqid: string = this.document.isEmbedded
      ? (Rqid.getDocumentFlag(this.document.parent)?.id ?? "")
      : "";

    let duplicateData: Pick<
      RqidEditorData,
      | "warnDuplicateWorldPriority"
      | "warnDuplicateCompendiumPriority"
      | "worldDuplicates"
      | "compendiumDuplicates"
      | "worldDocumentInfo"
      | "compendiumDocumentInfo"
    > = {
      warnDuplicateWorldPriority: false,
      warnDuplicateCompendiumPriority: false,
      worldDuplicates: 0,
      compendiumDuplicates: 0,
      worldDocumentInfo: [],
      compendiumDocumentInfo: [],
    };

    let rqidLinkData: Pick<RqidEditorData, "rqidLink" | "fullRqid"> = {};

    if (documentRqid && documentLang) {
      const rqidDocumentName = documentRqid.split(".")[0];
      const rqidSearchRegex = new RegExp("^" + escapeRegex(documentRqid) + "$");

      if (!this.document.isEmbedded && isRqidDocumentName(rqidDocumentName)) {
        const worldDocuments = await Rqid.fromRqidRegex(
          rqidSearchRegex,
          rqidDocumentName,
          documentLang,
          { source: "world", mode: "all" },
        );
        const compendiumDocuments = await Rqid.fromRqidRegex(
          rqidSearchRegex,
          rqidDocumentName,
          documentLang,
          { source: "packs", mode: "all" },
        );

        const duplicateWorldPriorities = this.getDuplicatePriorities(worldDocuments);
        const duplicateCompendiumPriorities = this.getDuplicatePriorities(compendiumDocuments);

        const worldDocumentInfo: (DocumentInfo & {
          folder: string;
        })[] = [];
        for (const d of worldDocuments) {
          const link = await foundry.applications.ux.TextEditor.implementation.enrichHTML(d.link);
          const priorityLabel = this.getPriorityLabel(d);
          worldDocumentInfo.push({
            priority: Number(priorityLabel),
            link: link,
            folder: this.getPath(d),
            isCurrent: d.uuid === this.document.uuid,
            hasDuplicatePriority: duplicateWorldPriorities.has(priorityLabel),
          });
        }

        const compendiumDocumentInfo: (DocumentInfo & {
          compendium: string;
        })[] = [];
        for (const d of compendiumDocuments) {
          const link = await foundry.applications.ux.TextEditor.implementation.enrichHTML(d.link);
          const priorityLabel = this.getPriorityLabel(d);
          compendiumDocumentInfo.push({
            priority: Number(priorityLabel),
            link: link,
            compendium: `${d.compendium?.metadata?.label} => ${d.compendium?.metadata?.packageName}`,
            isCurrent: d.uuid === this.document.uuid,
            hasDuplicatePriority: duplicateCompendiumPriorities.has(priorityLabel),
          });
        }

        const uniqueWorldPriorityCount = new Set(
          worldDocuments.map((d) => Rqid.getDocumentFlag(d)?.priority ?? -Infinity),
        ).size;
        const uniqueCompendiumPriorityCount = new Set(
          compendiumDocuments.map((d) => Rqid.getDocumentFlag(d)?.priority ?? -Infinity),
        ).size;

        duplicateData = {
          warnDuplicateWorldPriority: uniqueWorldPriorityCount !== worldDocuments.length,
          warnDuplicateCompendiumPriority:
            uniqueCompendiumPriorityCount !== compendiumDocuments.length,
          worldDuplicates: worldDocuments.length ?? 0,
          compendiumDuplicates: compendiumDocuments.length ?? 0,
          worldDocumentInfo: worldDocumentInfo,
          compendiumDocumentInfo: compendiumDocumentInfo,
        };
      }

      const fullRqid = parentRqid ? `${parentRqid}.${documentRqid}` : documentRqid;
      rqidLinkData = {
        rqidLink: `@RQID[${fullRqid}]{${this.document.name}}`,
        fullRqid: fullRqid,
      };
    }

    const [documentIdPart, documentType] = Rqid.getDefaultRqid(this.document).split(".");

    return {
      ...duplicateData,
      ...rqidLinkData,
      supportedLanguagesOptions: CONFIG.supportedLanguages,
      id: this.document.id,
      parentId: this.document?.parent?.id ?? "",
      parentUuid: this.document?.parent?.uuid ?? "",
      uuid: this.document.uuid,
      folder: this.getPath(this.document),
      flags: {
        rqg: {
          documentRqidFlags: {
            lang: Rqid.getDocumentFlag(this.document)?.lang ?? CONFIG.RQG.fallbackLanguage,
            priority: Rqid.getDocumentFlag(this.document)?.priority ?? 0,
          },
        },
      },
      rqidDocumentNamePart: `${documentIdPart}.${documentType}.`,
      rqidNamePart: Rqid.getDocumentFlag(this.document)?.id?.split(".").pop(),
      parentRqid: parentRqid,
      parentMissingRqid: this.document.isEmbedded && !parentRqid,
      buttons: [
        {
          type: "submit",
          icon: "fa-solid fa-floppy-disk",
          label: "SETTINGS.Save",
        },
        {
          type: "button",
          action: "cancel",
          icon: "fa-solid fa-times",
          label: "RQG.Dialog.Common.btnCancel",
        },
      ],
    };
  }

  override async _onRender(): Promise<void> {
    this.linkToParentDocumentApps();
    this.element.dataset["documentUuid"] = this.document.uuid;

    this.element.querySelectorAll<HTMLElement>("[data-generate-default-rqid]").forEach((el) => {
      el.addEventListener("click", async () => {
        this.applyDefaultRqidToForm();
      });
    });

    this.element.querySelectorAll<HTMLElement>("[data-item-copy-input]").forEach((el) => {
      el.addEventListener("click", async (event) => {
        event.preventDefault();
        const copyTarget = el.dataset["copyTarget"];
        const input = copyTarget
          ? this.element.querySelector<HTMLInputElement>(`#${copyTarget}`)
          : (el.previousElementSibling as HTMLInputElement | null);
        const value = input?.value ?? "";
        if (!value) {
          return;
        }
        await navigator.clipboard.writeText(value);
      });
    });

    this.element.querySelectorAll<HTMLElement>("[data-open-parent-rqid-editor]").forEach((el) => {
      el.addEventListener("click", async (event) => {
        event.preventDefault();
        const parentUuid = getRequiredDomDataset(el, "parent-document-uuid");
        const parentDocument = await fromUuid(parentUuid);
        if (!parentDocument) {
          console.warn("RQG | Could not find parent document from uuid", parentUuid);
          return;
        }
        new RqidEditor(parentDocument, {}).render({ force: true });
      });
    });

    this.element
      .querySelector<HTMLInputElement>('input[name="rqidNamePart"]')
      ?.addEventListener("input", () => this.syncRetrievalPreview());
    this.element
      .querySelector<HTMLSelectElement>('select[name="flags.rqg.documentRqidFlags.lang"]')
      ?.addEventListener("change", () => this.syncRetrievalPreview());
    this.element
      .querySelector<HTMLInputElement>('input[name="flags.rqg.documentRqidFlags.priority"]')
      ?.addEventListener("input", () => this.syncRetrievalPreview());

    this.syncRetrievalPreview();
  }

  override async close(options?: any): Promise<this> {
    this.unlinkFromParentDocumentApps();
    return await super.close(options);
  }

  static async onSubmit(
    this: RqidEditor,
    _event: Event,
    _form: HTMLFormElement,
    formData: FormDataExtended,
  ): Promise<void> {
    const data = formData.object as Record<string, unknown>;
    const [documentIdPart, documentType] = Rqid.getDefaultRqid(this.document).split(".");
    const rqidNamePart = toKebabCase(String(data["rqidNamePart"] ?? "").trim());
    data["flags.rqg.documentRqidFlags.id"] = rqidNamePart
      ? `${documentIdPart}.${documentType}.${rqidNamePart}`
      : null;
    delete data["rqidNamePart"];

    data["flags.rqg.documentRqidFlags.priority"] =
      Number(data["flags.rqg.documentRqidFlags.priority"]) || 0;

    // @ts-expect-error Document.Any.update() first arg typed as never
    await this.document.update(data);
    await this.syncRqidHeaderIconState();
  }

  private static onCancel(this: RqidEditor): void {
    this.close();
  }

  private applyDefaultRqidToForm(): void {
    const defaultRqid = Rqid.getDefaultRqid(this.document);
    const rqidNamePart = defaultRqid.split(".").pop() ?? "";

    const rqidInput = this.element.querySelector<HTMLInputElement>('input[name="rqidNamePart"]');
    if (rqidInput) {
      rqidInput.value = rqidNamePart;
    }

    const langSelect = this.element.querySelector<HTMLSelectElement>(
      'select[name="flags.rqg.documentRqidFlags.lang"]',
    );
    if (langSelect) {
      langSelect.value = Rqid.getDocumentFlag(this.document)?.lang ?? CONFIG.RQG.fallbackLanguage;
    }

    const priorityInput = this.element.querySelector<HTMLInputElement>(
      'input[name="flags.rqg.documentRqidFlags.priority"]',
    );
    if (priorityInput) {
      priorityInput.value = String(Rqid.getDocumentFlag(this.document)?.priority ?? 0);
    }

    this.syncRetrievalPreview();
  }

  private syncRetrievalPreview(): void {
    const rqidInput = this.element.querySelector<HTMLInputElement>('input[name="rqidNamePart"]');
    const langSelect = this.element.querySelector<HTMLSelectElement>(
      'select[name="flags.rqg.documentRqidFlags.lang"]',
    );
    const priorityInput = this.element.querySelector<HTMLInputElement>(
      'input[name="flags.rqg.documentRqidFlags.priority"]',
    );
    const getLikeThisInput = this.element.querySelector<HTMLInputElement>(
      "#rqid-editor-get-document-like-this",
    );
    const journalLinkInput = this.element.querySelector<HTMLInputElement>(
      "#rqid-editor-journal-link-to-document-like-this",
    );

    if (!rqidInput || !getLikeThisInput || !journalLinkInput) {
      return;
    }

    const rqidNamePart = toKebabCase(rqidInput.value.trim());
    const dependentElements = this.element.querySelectorAll<HTMLElement>("[data-rqid-dependent]");

    if (!rqidNamePart) {
      getLikeThisInput.value = "";
      journalLinkInput.value = "";
      dependentElements.forEach((el) => {
        el.hidden = true;
      });
      this.scheduleDuplicateLookupPreview(
        undefined,
        langSelect?.value,
        this.getPreviewPriority(priorityInput),
      );
      return;
    }

    const [documentIdPart, documentType] = Rqid.getDefaultRqid(this.document).split(".");
    const parentRqid: string = this.document.isEmbedded
      ? (Rqid.getDocumentFlag(this.document.parent)?.id ?? "")
      : "";
    const documentRqid = `${documentIdPart}.${documentType}.${rqidNamePart}`;
    const fullRqid = parentRqid ? `${parentRqid}.${documentRqid}` : documentRqid;
    const lang = langSelect?.value ?? CONFIG.RQG.fallbackLanguage;

    getLikeThisInput.value = `await game.system.api.rqid.fromRqid("${fullRqid}","${lang}")`;
    journalLinkInput.value = `@RQID[${fullRqid}]{${this.document.name}}`;

    dependentElements.forEach((el) => {
      el.hidden = false;
    });

    this.scheduleDuplicateLookupPreview(documentRqid, lang, this.getPreviewPriority(priorityInput));
  }

  private scheduleDuplicateLookupPreview(
    documentRqid: string | undefined,
    lang?: string,
    currentPriority?: number,
  ): void {
    if (this.duplicateLookupDebounce) {
      clearTimeout(this.duplicateLookupDebounce);
    }

    this.duplicateLookupDebounce = window.setTimeout(() => {
      void this.updateDuplicateLookupPreview(documentRqid, lang, currentPriority);
    }, 180);
  }

  private async updateDuplicateLookupPreview(
    documentRqid: string | undefined,
    lang?: string,
    currentPriority?: number,
  ): Promise<void> {
    const requestId = ++this.duplicateLookupRequestId;

    const duplicateElements = this.element.querySelectorAll<HTMLElement>("[data-rqid-duplicates]");
    const worldSummary = this.element.querySelector<HTMLElement>("#rqid-editor-docs-world-summary");
    const compSummary = this.element.querySelector<HTMLElement>(
      "#rqid-editor-docs-compendium-summary",
    );
    const worldWarning = this.element.querySelector<HTMLElement>("#rqid-editor-docs-world-warning");
    const compWarning = this.element.querySelector<HTMLElement>(
      "#rqid-editor-docs-compendium-warning",
    );
    const worldRows = this.element.querySelector<HTMLTableSectionElement>(
      "#rqid-editor-docs-world-rows",
    );
    const compRows = this.element.querySelector<HTMLTableSectionElement>(
      "#rqid-editor-docs-compendium-rows",
    );

    if (!worldSummary || !compSummary || !worldWarning || !compWarning || !worldRows || !compRows) {
      return;
    }

    const rqidDocumentName = documentRqid?.split(".")[0];
    const canLookup = !!documentRqid && !!rqidDocumentName && !this.document.isEmbedded;

    duplicateElements.forEach((el) => {
      el.hidden = !canLookup;
    });

    if (!canLookup || !isRqidDocumentName(rqidDocumentName)) {
      worldRows.innerHTML = "";
      compRows.innerHTML = "";
      worldWarning.hidden = true;
      compWarning.hidden = true;
      return;
    }

    const lookupLang = lang ?? CONFIG.RQG.fallbackLanguage;
    const rqidSearchRegex = new RegExp("^" + escapeRegex(documentRqid) + "$");

    const worldDocuments = await Rqid.fromRqidRegex(rqidSearchRegex, rqidDocumentName, lookupLang, {
      source: "world",
      mode: "all",
    });
    const compendiumDocuments = await Rqid.fromRqidRegex(
      rqidSearchRegex,
      rqidDocumentName,
      lookupLang,
      {
        source: "packs",
        mode: "all",
      },
    );

    if (requestId !== this.duplicateLookupRequestId) {
      return;
    }

    worldSummary.textContent = localize("RQG.RQGSystem.DocsInWorld", {
      count: `${worldDocuments.length}`,
    });
    compSummary.textContent = localize("RQG.RQGSystem.DocsInCompendiums", {
      count: `${compendiumDocuments.length}`,
    });

    const uniqueWorldPriorityCount = new Set(
      worldDocuments.map((d) => this.getPriorityLabel(d, currentPriority)),
    ).size;
    const uniqueCompendiumPriorityCount = new Set(
      compendiumDocuments.map((d) => this.getPriorityLabel(d, currentPriority)),
    ).size;
    const duplicateWorldPriorities = this.getDuplicatePriorities(worldDocuments, currentPriority);
    const duplicateCompendiumPriorities = this.getDuplicatePriorities(
      compendiumDocuments,
      currentPriority,
    );

    worldWarning.hidden = uniqueWorldPriorityCount === worldDocuments.length;
    compWarning.hidden = uniqueCompendiumPriorityCount === compendiumDocuments.length;

    worldRows.innerHTML = "";
    for (const d of worldDocuments) {
      const tr = document.createElement("tr");
      if (d.uuid === this.document.uuid) {
        tr.classList.add("current-document-row");
      }
      const priorityTd = document.createElement("td");
      const linkTd = document.createElement("td");
      const folderTd = document.createElement("td");
      const statusTd = document.createElement("td");
      statusTd.classList.add("status-col");
      const priorityLabel = this.getPriorityLabel(d, currentPriority);
      const hasDuplicatePriority = duplicateWorldPriorities.has(priorityLabel);

      priorityTd.classList.add("priority-cell");
      priorityTd.textContent = priorityLabel;
      if (hasDuplicatePriority) {
        priorityTd.appendChild(this.createDuplicatePriorityMarker());
      }
      linkTd.innerHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(d.link);
      folderTd.textContent = this.getPath(d);
      if (d.uuid === this.document.uuid) {
        const markerText = localize("RQG.RQGSystem.CurrentDocumentMarkerTooltip");
        statusTd.dataset["tooltip"] = markerText;
        statusTd.setAttribute("aria-label", markerText);
        statusTd.appendChild(this.createCurrentDocumentMarker());
      }

      tr.append(priorityTd, linkTd, folderTd, statusTd);
      worldRows.appendChild(tr);
    }

    compRows.innerHTML = "";
    for (const d of compendiumDocuments) {
      const tr = document.createElement("tr");
      if (d.uuid === this.document.uuid) {
        tr.classList.add("current-document-row");
      }
      const priorityTd = document.createElement("td");
      const linkTd = document.createElement("td");
      const compendiumTd = document.createElement("td");
      const statusTd = document.createElement("td");
      statusTd.classList.add("status-col");
      const priorityLabel = this.getPriorityLabel(d, currentPriority);
      const hasDuplicatePriority = duplicateCompendiumPriorities.has(priorityLabel);

      priorityTd.classList.add("priority-cell");
      priorityTd.textContent = priorityLabel;
      if (hasDuplicatePriority) {
        priorityTd.appendChild(this.createDuplicatePriorityMarker());
      }
      linkTd.innerHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(d.link);
      compendiumTd.textContent = `${d.compendium?.metadata?.label} => ${d.compendium?.metadata?.packageName}`;
      if (d.uuid === this.document.uuid) {
        const markerText = localize("RQG.RQGSystem.CurrentDocumentMarkerTooltip");
        statusTd.dataset["tooltip"] = markerText;
        statusTd.setAttribute("aria-label", markerText);
        statusTd.appendChild(this.createCurrentDocumentMarker());
      }

      tr.append(priorityTd, linkTd, compendiumTd, statusTd);
      compRows.appendChild(tr);
    }
  }

  private createCurrentDocumentMarker(): HTMLElement {
    const marker = document.createElement("i");
    marker.classList.add("fas", "fa-location-dot", "current-document-marker");
    return marker;
  }

  private createDuplicatePriorityMarker(): HTMLElement {
    const marker = document.createElement("i");
    const tooltip = localize("RQG.RQGSystem.DuplicatePriorityMarkerTooltip");
    marker.classList.add("fas", "fa-exclamation-triangle", "duplicate-priority-marker");
    marker.dataset["tooltip"] = tooltip;
    marker.setAttribute("aria-label", tooltip);
    return marker;
  }

  private getPreviewPriority(priorityInput: HTMLInputElement | null): number {
    return Number(priorityInput?.value) || 0;
  }

  private getPriorityLabel(document: Document.Any, currentPriority?: number): string {
    if (currentPriority != null && document.uuid === this.document.uuid) {
      return String(currentPriority);
    }
    return String(Rqid.getDocumentFlag(document)?.priority ?? -Infinity);
  }

  private getDuplicatePriorities(documents: Document.Any[], currentPriority?: number): Set<string> {
    const priorityKeys = documents.map((d) => this.getPriorityLabel(d, currentPriority));
    const counts = new Map<string, number>();
    for (const key of priorityKeys) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set([...counts].filter(([, count]) => count > 1).map(([key]) => key));
  }

  private getPath(document: Document.Any): string {
    let path = "";
    type FolderLike = { name: string; folder?: FolderLike | null };
    let folder = "folder" in document ? (document.folder as FolderLike | null) : null;
    while (folder) {
      path = "/" + folder.name + path;
      folder = folder.folder ?? null;
    }
    return document.parent || ("compendium" in document && document.compendium) ? "" : path || "/";
  }
}

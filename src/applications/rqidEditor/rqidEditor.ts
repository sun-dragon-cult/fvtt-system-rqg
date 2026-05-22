import { systemId } from "../../system/config";
import { escapeRegex, getRequiredDomDataset, toKebabCase, trimChars } from "../../system/util";
import { Rqid, isRqidDocumentName } from "../../system/api/rqidApi";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

import Document = foundry.abstract.Document;

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

interface DocumentInfo {
  priority: number;
  link: string;
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
}

export class RqidEditor extends HandlebarsApplicationMixin(ApplicationV2<RqidEditorData>) {
  private document: Document.Any;
  private parentAppLinked = false;

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
    },
    position: {
      width: 650,
      left: 35,
      top: 15,
    },
    form: {
      handler: RqidEditor.onSubmit,
      closeOnSubmit: false,
      submitOnChange: true,
    },
  };

  static override PARTS = {
    body: {
      template: templatePaths.dialogRqidEditor,
      root: true,
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
    > = {};

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

        const worldDocumentInfo: { priority: number; link: string; folder: string }[] = [];
        for (const d of worldDocuments) {
          const link = await foundry.applications.ux.TextEditor.implementation.enrichHTML(d.link);
          worldDocumentInfo.push({
            priority: Rqid.getDocumentFlag(d)?.priority ?? -Infinity,
            link: link,
            folder: this.getPath(d),
          });
        }

        const compendiumDocumentInfo: { priority: number; link: string; compendium: string }[] = [];
        for (const d of compendiumDocuments) {
          const link = await foundry.applications.ux.TextEditor.implementation.enrichHTML(d.link);
          compendiumDocumentInfo.push({
            priority: Rqid.getDocumentFlag(d)?.priority ?? -Infinity,
            link: link,
            compendium: `${d.compendium?.metadata?.label} => ${d.compendium?.metadata?.packageName}`,
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
    };
  }

  override async _onRender(): Promise<void> {
    this.linkToParentDocumentApps();
    this.element.dataset["documentUuid"] = this.document.uuid;

    this.element.querySelectorAll<HTMLElement>("[data-generate-default-rqid]").forEach((el) => {
      el.addEventListener("click", async () => {
        const document = await fromUuid(this.document.uuid);
        if (!document) {
          console.warn("RQG | Couldn't find document from uuid");
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
        // @ts-expect-error Document.Any.update() first arg typed as never
        await this.document.update(foundry.utils.flattenObject(updateData));
        await this.syncRqidHeaderIconState();
        this.render();
      });
    });

    this.element.querySelectorAll<HTMLElement>("[data-item-copy-input]").forEach((el) => {
      el.addEventListener("click", async () => {
        const input = el.previousElementSibling as HTMLInputElement;
        await navigator.clipboard.writeText(input.value);
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
    this.render();
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

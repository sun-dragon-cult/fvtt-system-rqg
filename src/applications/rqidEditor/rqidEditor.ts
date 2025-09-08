import { systemId } from "../../system/config";
import { escapeRegex, getRequiredDomDataset, toKebabCase, trimChars } from "../../system/util";
import { Rqid } from "../../system/api/rqidApi";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

import Document = foundry.abstract.Document;
import FormApplication = foundry.appv1.api.FormApplication;

export class RqidEditor extends FormApplication {
  private document: Document.Any;
  constructor(document: Document.Any, options: any) {
    super(document, options);
    this.document = document;
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

    const documentRqid: string | undefined = this.document?.flags?.rqg?.documentRqidFlags?.id;
    const documentLang: string | undefined = this.document?.flags?.rqg?.documentRqidFlags?.lang;
    if (documentRqid && documentLang) {
      const rqidDocumentPrefix = documentRqid.split(".")[0];
      const rqidSearchRegex = new RegExp("^" + escapeRegex(documentRqid) + "$");

      // Find out if there exists a duplicate rqid already and propose a
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

      const worldDocumentInfo: Document.Any[] = [];
      for (const d of worldDocuments) {
        const link = await foundry.applications.ux.TextEditor.implementation.enrichHTML(d.link);
        worldDocumentInfo.push({
          priority: d.flags?.rqg.documentRqidFlags.priority,
          link: link,
          folder: this.getPath(d),
        });
      }

      const compendiumDocumentInfo: Document.Any[] = [];
      for (const d of compendiumDocuments) {
        const link = await foundry.applications.ux.TextEditor.implementation.enrichHTML(d.link);
        compendiumDocumentInfo.push({
          priority: d.flags?.rqg.documentRqidFlags.priority,
          link: link,
          compendium: `${d.compendium?.metadata?.label} ⇒ ${d.compendium?.metadata?.packageName}`,
        });
      }

      const uniqueWorldPriorityCount = new Set(
        worldDocuments.map((d) => d.flags?.rqg.documentRqidFlags.priority),
      ).size;
      if (uniqueWorldPriorityCount !== worldDocuments.length) {
        appData.warnDuplicateWorldPriority = true;
      }

      const uniqueCompendiumPriorityCount = new Set(
        compendiumDocuments.map((d) => d.flags?.rqg.documentRqidFlags.priority),
      ).size;
      if (uniqueCompendiumPriorityCount !== compendiumDocuments.length) {
        appData.warnDuplicateCompendiumPriority = true;
      }

      appData.worldDuplicates = worldDocuments.length ?? 0;
      appData.compendiumDuplicates = compendiumDocuments.length ?? 0;
      appData.worldDocumentInfo = worldDocumentInfo;
      appData.compendiumDocumentInfo = compendiumDocumentInfo;
      appData.rqidLink = `@RQID[${documentRqid}]{${this.document.name}}`;
    }

    appData.supportedLanguagesOptions = CONFIG.supportedLanguages;
    appData.id = this.document.id;
    appData.parentId = this.document?.parent?.id ?? "";
    appData.uuid = this.document.uuid;

    appData.folder = this.getPath(this.document);
    appData.flags = {
      rqg: {
        documentRqidFlags: {
          lang: this.document?.flags?.rqg?.documentRqidFlags?.lang ?? CONFIG.RQG.fallbackLanguage,
          priority: this.document?.flags?.rqg?.documentRqidFlags?.priority ?? 0,
        },
      },
    };
    const [documentIdPart, documentType] = Rqid.getDefaultRqid(this.document).split(".");
    appData.rqidPrefix = `${documentIdPart}.${documentType}.`;
    appData.rqidNamePart = this.document?.flags?.rqg?.documentRqidFlags?.id?.split(".").pop();

    return appData;
  }

  override get title(): string {
    return `${super.title} ${this.document.documentName}: ${this.document.name}`;
  }

  protected override _getSubmitData(updateData?: object | null): Partial<Record<string, unknown>> {
    return super._getSubmitData(updateData);
  }

  override activateListeners(html: JQuery) {
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
                lang:
                  document.getFlag(systemId, "documentRqidFlags.lang") ??
                  CONFIG.RQG.fallbackLanguage,
                priority: document.getFlag(systemId, "documentRqidFlags.priority") ?? 0,
              },
            },
          },
        };
        await this.document.update(flattenObject(updateData));
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

    super.activateListeners(html);
  }

  async _updateObject(event: Event, formData: any): Promise<void> {
    const [documentIdPart, documentType] = Rqid.getDefaultRqid(this.document).split(".");
    formData["flags.rqg.documentRqidFlags.id"] = formData["rqidNamePart"]
      ? `${documentIdPart}.${documentType}.${formData["rqidNamePart"]}`
      : undefined;
    delete formData["rqidNamePart"];

    formData["flags.rqg.documentRqidFlags.priority"] =
      Number(formData["flags.rqg.documentRqidFlags.priority"]) || 0;

    await this.document.update(formData);
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

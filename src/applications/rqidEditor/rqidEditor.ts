import { Document } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/module.mjs";
import { systemId } from "../../system/config";
import { escapeRegex, getRequiredDomDataset } from "../../system/util";
import { Rqid } from "../../system/api/rqidApi";

export class RqidEditor extends FormApplication {
  private document: Document<any, any>;
  constructor(document: Document<any, any>, options: any) {
    super(document, options);
    this.document = document;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "form", "rqid-editor"],
      popOut: true,
      template: `systems/rqg/applications/rqidEditor/rqidEditor.hbs`,
      width: 650,
      left: 35,
      top: 15,
      id: "rqid-editor-application",
      title: "Rqid Editor",
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
      resizable: true,
    });
  }

  async getData(): Promise<any> {
    const appData: any = {};

    // @ts-expect-error flags
    const documentRqid: string | undefined = this.document?.flags?.rqg?.documentRqidFlags?.id;
    const documentLang: string | undefined =
      // @ts-expect-error flags
      this.document?.flags?.rqg?.documentRqidFlags?.lang;
    if (documentRqid && documentLang) {
      const rqidDocumentPrefix = documentRqid.split(".")[0];
      const rqidSearchRegex = new RegExp("^" + escapeRegex(documentRqid) + "$");

      // Find out if there exists a duplicate rqid already and propose a
      const worldDocuments = await Rqid.fromRqidRegexAll(
        rqidSearchRegex,
        rqidDocumentPrefix,
        documentLang,
        "world"
      );
      const compendiumDocuments = await Rqid.fromRqidRegexAll(
        rqidSearchRegex,
        rqidDocumentPrefix,
        documentLang,
        "packs"
      );

      const worldDocumentInfo: Document<any, any>[] = [];
      for (const d of worldDocuments) {
        // @ts-expect-error async
        const link = await TextEditor.enrichHTML(d.link, { async: true });
        worldDocumentInfo.push({
          // @ts-expect-error flags
          priority: d.flags?.rqg.documentRqidFlags.priority,
          link: link,
          // @ts-ignore
          folder: d.folder?.name,
        });
      }

      const compendiumDocumentInfo: Document<any, any>[] = [];
      for (const d of compendiumDocuments) {
        // @ts-expect-error async
        const link = await TextEditor.enrichHTML(d.link, { async: true });
        compendiumDocumentInfo.push({
          // @ts-expect-error flags
          priority: d.flags?.rqg.documentRqidFlags.priority,
          link: link,
          // @ts-expect-error compendium
          compendium: `${d.compendium?.metadata?.label} ⇒ ${
            // @ts-expect-error packageName
            d.compendium?.metadata?.packageName
          }`,
        });
      }

      const uniqueWorldPriorityCount = new Set(
        // @ts-expect-error flags
        worldDocuments.map((d) => d.flags.rqg.documentRqidFlags.priority)
      ).size;
      if (uniqueWorldPriorityCount !== worldDocuments.length) {
        appData.warnDuplicateWorldPriority = true;
      }

      const uniqueCompendiumPriorityCount = new Set(
        // @ts-expect-error flags
        compendiumDocuments.map((d) => d.flags.rqg.documentRqidFlags.priority)
      ).size;
      if (uniqueCompendiumPriorityCount !== compendiumDocuments.length) {
        appData.warnDuplicateCompendiumPriority = true;
      }

      appData.worldDuplicates = worldDocuments.length ?? 0;
      appData.compendiumDuplicates = compendiumDocuments.length ?? 0;
      appData.worldDocumentInfo = worldDocumentInfo;
      appData.compendiumDocumentInfo = compendiumDocumentInfo;
    }

    appData.supportedLanguages = CONFIG.supportedLanguages;
    appData.id = this.document.id;
    appData.parentId = this.document?.parent?.id ?? "";
    // @ts-expect-error uuid
    appData.uuid = this.document.uuid;
    appData.flags = {
      rqg: {
        // @ts-expect-error flags
        documentRqidFlags: this.document?.flags?.rqg?.documentRqidFlags,
      },
    };

    return appData;
  }

  get title(): string {
    return `${super.title} ${this.document.documentName}: ${this.document.name}`;
  }

  protected _getSubmitData(updateData?: object | null): Partial<Record<string, unknown>> {
    return super._getSubmitData(updateData);
  }

  activateListeners(html: JQuery) {
    // update the document with a default rqid
    html[0]?.querySelectorAll<HTMLElement>("[data-generate-default-rqid]").forEach((el) => {
      const uuid = getRequiredDomDataset(el, "document-uuid");
      el.addEventListener("click", async () => {
        const document = await fromUuid(uuid);
        if (!document) {
          const msg = "Couldn't find document from uuid"; // TODO fix translation
          console.warn("RQG | ", msg);
          return;
        }
        const rqid = Rqid.getDefaultRqid(document);
        const updateData: any = { flags: { rqg: { documentRqidFlags: { id: rqid } } } };
        if (document.isEmbedded) {
          updateData._id = document.id;
          await document.parent.updateEmbeddedDocuments(document.documentName, [updateData]);
        }
        await document.update(updateData);
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
    await this.document.update(formData);
    this.render();
  }
}

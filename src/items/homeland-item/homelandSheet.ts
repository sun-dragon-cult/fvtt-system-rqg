import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { getGameUser } from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";
import { systemId } from "../../system/config";
import { ItemSheetData } from "../shared/sheetInterfaces";

export interface HomelandSheetData {
  enrichedWizardInstructions: string;
}

export class HomelandSheet extends RqgItemSheet<
  ItemSheet.Options,
  HomelandSheetData | ItemSheet.Data
> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Homeland],
      template: "systems/rqg/items/homeland-item/homelandSheet.hbs",
      width: 500,
      height: 650,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "homeland",
        },
      ],
    });
  }

  async getData(): Promise<HomelandSheetData & ItemSheetData> {
    const system = duplicate(this.document.system);

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isEditable: this.isEditable,
      isGM: getGameUser().isGM,
      system: system,
      isEmbedded: this.document.isEmbedded,
      enrichedWizardInstructions: await TextEditor.enrichHTML(system.wizardInstructions, {
        // @ts-expect-error async
        async: true,
      }),
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    const region = formData["system.region"] ? ` (${formData["system.region"]})` : "";
    const newName = formData["system.homeland"] + region;
    if (newName) {
      // If there's nothing in the homeland or region, don't rename
      formData["name"] = newName;
    }
    return super._updateObject(event, formData);
  }
}

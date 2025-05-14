import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { AvailableItemCache, getGameUser, getSelectRuneOptions } from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";
import { systemId } from "../../system/config";
import { ItemSheetData } from "../shared/sheetInterfaces";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

export interface HomelandSheetData {
  allRuneOptions: AvailableItemCache[];
  enrichedWizardInstructions: string;
}

export class HomelandSheet extends RqgItemSheet<
  ItemSheet.Options,
  HomelandSheetData | ItemSheet.Data
> {
  static get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Homeland],
      template: templatePaths.itemHomelandSheet,
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
    // @ts-expect-error _source Read from the original data unaffected by any AEs
    const system = foundry.utils.duplicate(this.document._source.system);

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isEditable: this.isEditable,
      isGM: getGameUser().isGM,
      system: system,
      isEmbedded: this.document.isEmbedded,
      enrichedWizardInstructions: await TextEditor.enrichHTML(system.wizardInstructions),
      allRuneOptions: getSelectRuneOptions("RQG.Item.Homeland.AddHomelandRunePlaceholder"),
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

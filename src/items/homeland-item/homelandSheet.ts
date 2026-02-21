import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { getSelectRuneOptions } from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";
import { systemId } from "../../system/config";
import type { ItemSheetData } from "../shared/sheetInterfaces.types.ts";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import type { HomelandItem } from "@item-model/homelandData.ts";

export interface HomelandSheetData {
  allRuneOptions: SelectOptionData<string>[];
  enrichedWizardInstructions: string;
}

export class HomelandSheet extends RqgItemSheet {
  override get document(): HomelandItem {
    return super.document as HomelandItem;
  }

  static override get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Homeland],
      template: templatePaths.itemHomelandSheet,
      width: 600,
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

  override async getData(): Promise<HomelandSheetData & ItemSheetData> {
    const system = foundry.utils.duplicate(this.document._source.system);

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isEditable: this.isEditable,
      isGM: game.user?.isGM ?? false,
      system: system,
      isEmbedded: this.document.isEmbedded,
      enrichedWizardInstructions:
        await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          system.wizardInstructions,
        ),
      allRuneOptions: getSelectRuneOptions("RQG.Item.Homeland.AddHomelandRunePlaceholder"),
    };
  }

  protected override _updateObject(event: Event, formData: any): Promise<any> {
    const region = formData["system.region"] ? ` (${formData["system.region"]})` : "";
    const newName = formData["system.homeland"] + region;
    if (newName) {
      // If there's nothing in the homeland or region, don't rename
      formData["name"] = newName;
    }
    return super._updateObject(event, formData);
  }
}

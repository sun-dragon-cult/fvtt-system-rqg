import type { AnyMutableObject } from "fvtt-types/utils";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { getSelectRuneOptions } from "../../system/util";
import { RqgItemSheet } from "../rqg-item-sheet";
import { systemId } from "../../system/config";
import type { ItemSheetData } from "../shared/sheet-interfaces.types.ts";
import { templatePaths } from "../../system/load-handlebars-templates";
import type { HomelandItem } from "@item-model/homeland-data-model.ts";
import { buildItemName } from "../item-name";

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

  protected override _updateObject(event: Event, formData: AnyMutableObject): Promise<unknown> {
    const name = buildItemName(ItemTypeEnum.Homeland, {
      homeland: formData["system.homeland"] ?? this.document.system.homeland,
      region: formData["system.region"] ?? this.document.system.region,
    });
    if (name) {
      formData["name"] = name;
    }
    return super._updateObject(event, formData);
  }
}

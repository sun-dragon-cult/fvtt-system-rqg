import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  EquippedStatus,
  equippedStatusOptions,
  PhysicalItemType,
  physicalItemTypeOptions,
} from "../../data-model/item-data/IPhysicalItem";
import { RqgItemSheet } from "../RqgItemSheet";
import { getGameUser } from "../../system/util";
import { systemId } from "../../system/config";
import { EffectsItemSheetData } from "../shared/sheetInterfaces";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

interface GearSheetData {
  enrichedDescription: string;
  enrichedGmNotes: string;
  equippedStatusOptions: SelectOptionData<EquippedStatus>[];
  physicalItemTypeOptions: SelectOptionData<PhysicalItemType>[];
}

export class GearSheet extends RqgItemSheet<ItemSheet.Options, GearSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Gear],
      template: templatePaths.itemGearSheet,
      width: 600,
      height: 500,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "gear",
        },
      ],
    });
  }

  async getData(): Promise<GearSheetData & EffectsItemSheetData> {
    // @ts-expect-error _source Read from the original data unaffected by any AEs
    const system = foundry.utils.duplicate(this.document._source.system);

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isGM: getGameUser().isGM,
      isEmbedded: this.document.isEmbedded,
      isEditable: this.isEditable,
      system: system,
      effects: this.document.effects,
      // @ts-expect-error applications
      enrichedDescription: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.description,
      ),
      // @ts-expect-error applications
      enrichedGmNotes: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.gmNotes,
      ),
      equippedStatusOptions: equippedStatusOptions,
      physicalItemTypeOptions: physicalItemTypeOptions,
    };
  }

  protected async _updateObject(event: Event, formData: any): Promise<any> {
    if (formData[`system.physicalItemType`] === "unique") {
      formData[`system.quantity`] = 1;
    }
    return super._updateObject(event, formData);
  }
}

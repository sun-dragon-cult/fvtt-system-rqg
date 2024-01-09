import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { equippedStatuses, physicalItemTypes } from "../../data-model/item-data/IPhysicalItem";
import { RqgItemSheet } from "../RqgItemSheet";
import { getGameUser } from "../../system/util";
import { systemId } from "../../system/config";
import { EffectsItemSheetData } from "../shared/sheetInterfaces";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

interface GearSheetData {
  enrichedDescription: string;
  enrichedGmNotes: string;
  equippedStatuses: typeof equippedStatuses;
  physicalItemTypes: typeof physicalItemTypes;
}

export class GearSheet extends RqgItemSheet<ItemSheet.Options, GearSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Gear],
      template: templatePaths.itemGearSheet,
      width: 450,
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
      // @ts-expect-error async
      enrichedDescription: await TextEditor.enrichHTML(system.description, { async: true }),
      // @ts-expect-error async
      enrichedGmNotes: await TextEditor.enrichHTML(system.gmNotes, { async: true }),
      equippedStatuses: [...equippedStatuses],
      physicalItemTypes: [...physicalItemTypes],
    };
  }

  protected async _updateObject(event: Event, formData: any): Promise<any> {
    if (formData[`system.physicalItemType`] === "unique") {
      formData[`system.quantity`] = 1;
    }
    return super._updateObject(event, formData);
  }
}

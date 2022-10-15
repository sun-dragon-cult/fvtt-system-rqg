import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  armorTypeTranslationKeys,
  materialTranslationKeys,
} from "../../data-model/item-data/armorData";
import { equippedStatuses } from "../../data-model/item-data/IPhysicalItem";
import { RqgItemSheet } from "../RqgItemSheet";
import { getGameUser, getHitLocations, localize } from "../../system/util";
import { RqgItem } from "../rqgItem";
import { systemId } from "../../system/config";
import { EffectsItemSheetData } from "../shared/sheetInterfaces";

interface ArmorSheetData {
  allHitLocations: string[];
  equippedStatuses: string[];
  armorTypeNames: string[];
  materialNames: string[];
  enrichedDescription: string;
  enrichedGmNotes: string;
}

export class ArmorSheet extends RqgItemSheet<ItemSheet.Options, ArmorSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Armor],
      template: "systems/rqg/items/armor-item/armorSheet.hbs",
      width: 500,
      height: 600,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "armor",
        },
      ],
    });
  }

  async getData(): Promise<ArmorSheetData & EffectsItemSheetData> {
    const system = duplicate(this.document.system);
    return {
      id: this.document.id ?? "",
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isEditable: this.isEditable,
      isEmbedded: this.document.isEmbedded,
      isGM: getGameUser().isGM,
      system: system,
      effects: this.document.effects,
      allHitLocations: getHitLocations(),
      equippedStatuses: [...equippedStatuses],
      armorTypeNames: armorTypeTranslationKeys.map((key) => localize(key)),
      materialNames: materialTranslationKeys.map((key) => localize(key)),
      // @ts-expect-error async
      enrichedDescription: await TextEditor.enrichHTML(system.description, { async: true }),
      // @ts-expect-error async
      enrichedGmNotes: await TextEditor.enrichHTML(system.gmNotes, { async: true }),
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<RqgItem | undefined> {
    let hitLocations = formData["system.hitLocations"];
    hitLocations = Array.isArray(hitLocations) ? hitLocations : [hitLocations];
    hitLocations = [...new Set(hitLocations.filter((r: any) => r))]; // Remove empty & duplicates
    formData[
      "name"
    ] = `${formData["system.namePrefix"]} ${formData["system.armorType"]} (${formData["system.material"]})`;
    formData["system.hitLocations"] = duplicate(hitLocations);
    return super._updateObject(event, formData);
  }
}

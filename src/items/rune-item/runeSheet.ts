import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RuneType, RuneTypeEnum } from "../../data-model/item-data/runeData";
import { getAvailableRunes, getGameUser, AvailableItemCache, localize } from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";
import { RqgItem } from "../rqgItem";
import { systemId } from "../../system/config";
import { ItemSheetData } from "../shared/sheetInterfaces";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

interface RuneSheetData {
  allRunes: AvailableItemCache[];
  runeTypes: RuneType[];
  rqid: string;
}
export class RuneSheet extends RqgItemSheet<ItemSheet.Options, RuneSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Rune],
      template: templatePaths.itemRuneSheet,
      width: 450,
      height: 500,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "rune",
        },
      ],
    });
  }

  getData(): RuneSheetData & ItemSheetData {
    // @ts-expect-error _source Read from the original data unaffected by any AEs
    const system = duplicate(this.document._source.system);

    if (!system.rune) {
      system.rune = this.document.name;
    }

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      rqid: this.document.flags?.[systemId]?.documentRqidFlags?.id ?? "",
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isGM: getGameUser().isGM,
      system: system,
      isEmbedded: this.document.isEmbedded,
      allRunes: getAvailableRunes(),
      runeTypes: Object.values(RuneTypeEnum).map((rt) => ({
        type: rt,
        name: localize(`RQG.Item.Rune.RuneType.${rt}`),
      })),
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<RqgItem | undefined> {
    const runeType = formData["system.runeType.type"];
    const translatedRuneType = localize(`RQG.Item.Rune.RuneType.${runeType}`);
    formData["name"] = `${formData["system.rune"]} (${translatedRuneType})`;
    // Only update runeType if it is changed
    if ((event.currentTarget as HTMLSelectElement)?.name === "system.runeType.type") {
      formData["system.runeType.name"] = translatedRuneType;
    }
    formData["system.chance"] = Number(formData["system.chance"]);
    return super._updateObject(event, formData);
  }
}

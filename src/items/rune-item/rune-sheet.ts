import { ItemTypeEnum } from "@item-model/item-types.ts";
import { RuneTypeEnum, type RuneItem } from "@item-model/rune-data-model.ts";
import { localize, getSelectRuneOptions } from "../../system/util";
import { RqgItemSheet } from "../rqg-item-sheet";
import { systemId } from "../../system/config";
import type { ItemSheetData } from "../shared/sheet-interfaces.types.ts";
import { templatePaths } from "../../system/load-handlebars-templates";

interface RuneSheetData {
  opposingRuneOptions: SelectOptionData<string>[];
  minorRuneOptions: SelectOptionData<string>[];
  runeTypeOption: SelectOptionData<RuneTypeEnum>[];
  rqid: string;
}
export class RuneSheet extends RqgItemSheet {
  override get document(): RuneItem {
    return super.document as RuneItem;
  }

  static override get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Rune],
      template: templatePaths.itemRuneSheet,
      width: 600,
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

  override getData(): RuneSheetData & ItemSheetData {
    const system = foundry.utils.duplicate(this.document._source.system);
    const rqid = this.document.flags?.[systemId]?.documentRqidFlags?.id ?? "";
    let opposingRuneOptions = getSelectRuneOptions("RQG.Item.Rune.SetOpposingRunePlaceholder");
    if (rqid) {
      opposingRuneOptions = opposingRuneOptions.filter(
        (option) => option.value === "empty" || option.value !== rqid,
      );
    }

    if (!system.rune) {
      system.rune = this.document.name;
    }

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      rqid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isGM: game.user?.isGM ?? false,
      system: system,
      isEmbedded: this.document.isEmbedded,
      opposingRuneOptions,
      minorRuneOptions: getSelectRuneOptions("RQG.Item.Rune.AddMinorRunePlaceholder"),
      runeTypeOption: Object.values(RuneTypeEnum).map((rt) => ({
        value: rt,
        label: localize(`RQG.Item.Rune.RuneType.${rt}`),
      })),
    };
  }

  protected override _updateObject(event: Event, formData: any): Promise<unknown> {
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

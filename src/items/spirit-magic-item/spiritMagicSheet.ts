import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { getGameUser } from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";
import {
  SpellConcentrationEnum,
  SpellDurationEnum,
  SpellRangeEnum,
} from "../../data-model/item-data/spell";
import { systemId } from "../../system/config";
import { RqgItem } from "../rqgItem";
import { EffectsItemSheetData } from "../shared/sheetInterfaces";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

interface SpiritMagicSheetData {
  rangeOptions: SelectOptionData<SpellRangeEnum>[];
  durationOptions: SelectOptionData<SpellDurationEnum>[];
  concentrationOptions: SelectOptionData<SpellConcentrationEnum>[];
}

export class SpiritMagicSheet extends RqgItemSheet<
  ItemSheet.Options,
  SpiritMagicSheetData | ItemSheet.Data
> {
  static get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.SpiritMagic],
      template: templatePaths.itemSpiritMagicSheet,
      width: 600,
      height: 500,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "spirit-magic",
        },
      ],
    });
  }

  getData(): SpiritMagicSheetData & EffectsItemSheetData {
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
      effects: this.document.effects,

      rangeOptions: Object.values(SpellRangeEnum).map((range) => ({
        value: range,
        label: "RQG.Item.Spell.RangeEnum." + (range || "undefined"),
      })),
      durationOptions: Object.values(SpellDurationEnum).map((range) => ({
        value: range,
        label: "RQG.Item.Spell.DurationEnum." + (range || "undefined"),
      })),
      concentrationOptions: Object.values(SpellConcentrationEnum).map((range) => ({
        value: range,
        label: "RQG.Item.Spell.ConcentrationEnum." + (range || "undefined"),
      })),
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<RqgItem | undefined> {
    // Set a concentration value if there isn't one already
    if (formData["system.duration"] === SpellDurationEnum.Temporal) {
      formData["system.concentration"] = formData["system.concentration"]
        ? formData["system.concentration"]
        : SpellConcentrationEnum.Active;
    } else {
      // Generally only Temporal spells have concentration
      formData["system.concentration"] = "";
    }

    // ... except Focused spells that always are concentration active
    if (formData["system.duration"] === SpellDurationEnum.Focused) {
      formData["system.concentration"] = SpellConcentrationEnum.Active;
    }

    // ... and Special Duration spells that always are concentration passive
    if (formData["system.duration"] === SpellDurationEnum.Special) {
      formData["system.concentration"] = SpellConcentrationEnum.Passive;
    }

    return super._updateObject(event, formData);
  }
}

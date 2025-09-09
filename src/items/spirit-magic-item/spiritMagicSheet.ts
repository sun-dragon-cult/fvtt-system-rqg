import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { RqgItemSheet } from "../RqgItemSheet";
import { SpellConcentrationEnum, SpellDurationEnum, SpellRangeEnum } from "@item-model/spell.ts";
import { systemId } from "../../system/config";
import type { EffectsItemSheetData } from "../shared/sheetInterfaces.types.ts";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

interface SpiritMagicSheetData {
  rangeOptions: SelectOptionData<SpellRangeEnum>[];
  durationOptions: SelectOptionData<SpellDurationEnum>[];
  concentrationOptions: SelectOptionData<SpellConcentrationEnum>[];
}

export class SpiritMagicSheet extends RqgItemSheet {
  static override get defaultOptions(): ItemSheet.Options {
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

  override getData(): SpiritMagicSheetData & EffectsItemSheetData {
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

  protected override _updateObject(event: Event, formData: any): Promise<unknown> {
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

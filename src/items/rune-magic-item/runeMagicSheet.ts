import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { getGameUser, getSelectRuneOptions } from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";
import { SpellDurationEnum, SpellRangeEnum } from "../../data-model/item-data/spell";
import { systemId } from "../../system/config";
import { EffectsItemSheetData } from "../shared/sheetInterfaces";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

interface RuneMagicSheetData {
  allRuneOptions: SelectOptionData<string>[];
  rangeOptions: SelectOptionData<SpellRangeEnum>[];
  durationOptions: SelectOptionData<SpellDurationEnum>[];
  actorCultOptions: SelectOptionData<string>[];
}

export class RuneMagicSheet extends RqgItemSheet<
  ItemSheet.Options,
  RuneMagicSheetData | ItemSheet.Data
> {
  static get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.RuneMagic],
      template: templatePaths.itemRuneMagicSheet,
      width: 450,
      height: 500,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "rune-magic",
        },
      ],
    });
  }

  getData(): RuneMagicSheetData & EffectsItemSheetData {
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
        label: "RQG.Item.Spell.RangeEnum." + (range || "none"),
      })),
      durationOptions: Object.values(SpellDurationEnum).map((range) => ({
        value: range,
        label: "RQG.Item.Spell.DurationEnum." + (range || "none"),
      })),
      actorCultOptions: this.getActorCultOptions(),
      allRuneOptions: getSelectRuneOptions("RQG.Item.RuneMagic.AddRuneMagicRunePlaceholder"),
    };
  }

  private getActorCultOptions(): SelectOptionData<string>[] {
    return (
      this.actor
        ?.getEmbeddedCollection("Item")
        .filter((i: any) => i.type === ItemTypeEnum.Cult)
        .map((c) => ({
          value: c.id ?? "",
          label: c.name ?? "",
        })) ?? []
    );
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    return super._updateObject(event, formData);
  }
}

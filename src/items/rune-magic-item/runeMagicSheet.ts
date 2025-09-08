import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { getSelectRuneOptions, isDocumentSubType } from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";
import { SpellDurationEnum, SpellRangeEnum } from "@item-model/spell.ts";
import { systemId } from "../../system/config";
import type { EffectsItemSheetData } from "../shared/sheetInterfaces.types.ts";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import type { CultItem } from "@item-model/cultData.ts";
import type { RqgItem } from "@items/rqgItem.ts";

interface RuneMagicSheetData {
  allRuneOptions: SelectOptionData<string>[];
  rangeOptions: SelectOptionData<SpellRangeEnum>[];
  durationOptions: SelectOptionData<SpellDurationEnum>[];
  actorCultOptions: SelectOptionData<string>[];
}

export class RuneMagicSheet extends RqgItemSheet {
  static override get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.RuneMagic],
      template: templatePaths.itemRuneMagicSheet,
      width: 600,
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

  override getData(): RuneMagicSheetData & EffectsItemSheetData {
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
      actorCultOptions: this.getActorCultOptions(),
      allRuneOptions: getSelectRuneOptions("RQG.Item.RuneMagic.AddRuneMagicRunePlaceholder"),
    };
  }

  private getActorCultOptions(): SelectOptionData<string>[] {
    return (
      this.actor
        ?.getEmbeddedCollection("Item")
        .filter((i: RqgItem) => isDocumentSubType<CultItem>(i, ItemTypeEnum.Cult))
        .map((c) => ({
          value: c.id ?? "",
          label: c.name ?? "",
        })) ?? []
    );
  }

  protected override _updateObject(event: Event, formData: any): Promise<any> {
    return super._updateObject(event, formData);
  }
}

import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { getAvailableRunes, getGameUser, AvailableItemCache } from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";
import { SpellDurationEnum, SpellRangeEnum } from "../../data-model/item-data/spell";
import { systemId } from "../../system/config";
import { EffectsItemSheetData } from "../shared/sheetInterfaces";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

interface RuneMagicSheetData {
  ranges: SpellRangeEnum[];
  durations: SpellDurationEnum[];
  actorCults: any[];
  allRunes: AvailableItemCache[];
}

export class RuneMagicSheet extends RqgItemSheet<
  ItemSheet.Options,
  RuneMagicSheetData | ItemSheet.Data
> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
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
    const system = duplicate(this.document._source.system);

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

      ranges: Object.values(SpellRangeEnum),
      durations: Object.values(SpellDurationEnum),
      actorCults: this.getActorCults(),
      allRunes: getAvailableRunes(),
    };
  }

  private getActorCults(): any[] {
    return this.actor
      ? // @ts-expect-error v10
        this.actor.getEmbeddedCollection("Item").filter((i) => i.type === ItemTypeEnum.Cult)
      : [];
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    return super._updateObject(event, formData);
  }
}

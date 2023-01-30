import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { getAvailableRunes, getGameUser, AvailableRuneCache } from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";
import { SpellDurationEnum, SpellRangeEnum } from "../../data-model/item-data/spell";
import { systemId } from "../../system/config";
import { EffectsItemSheetData } from "../shared/sheetInterfaces";

interface RuneMagicSheetData {
  ranges: SpellRangeEnum[];
  durations: SpellDurationEnum[];
  actorCults: any[];
  allRunes: AvailableRuneCache[];
}

export class RuneMagicSheet extends RqgItemSheet<
  ItemSheet.Options,
  RuneMagicSheetData | ItemSheet.Data
> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.RuneMagic],
      template: "systems/rqg/items/rune-magic-item/runeMagicSheet.hbs",
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
    const system = duplicate(this.document.system);

    system.runes = Array.isArray(system.runes) ? system.runes : [system.runes];

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
    let runes = formData["system.runes"];
    runes = Array.isArray(runes) ? runes : [runes];
    runes = runes.filter((r: string) => r); // Remove empty
    formData["system.runes"] = duplicate(runes);
    return super._updateObject(event, formData);
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);
    this.form?.addEventListener("drop", this._onDrop.bind(this));
  }

  protected async _onDrop(event: DragEvent): Promise<void> {
    return super._onDrop(event);
  }
}

import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgItemSheet } from "../RqgItemSheet";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { DocumentSheetData } from "../shared/sheetInterfaces";
import { getGameUser } from "../../system/util";
import { RqgItem } from "../rqgItem";

export interface BackgroundSheetData {
  backgroundModifiersJoined: string;
}

export class BackgroundSheet extends RqgItemSheet<
  ItemSheet.Options,
  BackgroundSheetData | ItemSheet.Data
> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Cult],
      template: templatePaths.itemBackgroundSheet,
      width: 650,
      height: 500,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "deity",
        },
      ],
    });
  }

  getData(): BackgroundSheetData & DocumentSheetData {
    // @ts-expect-error _source Read from the original data unaffected by any AEs
    const system = duplicate(this.document._source.system);
    console.log("Background getData returning system:", system);

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isEditable: this.isEditable,
      isGM: getGameUser().isGM,
      system: system,

      backgroundModifiersJoined: system.backgroundModifiers
        .map((modifier: any) => {
          console.log("MAP to join modifier bonuses into a string", modifier);
          const bonus = modifier.bonus || 0;
          const bonusValueText = `${bonus >= 0 ? "+" : "-"}${bonus}%`;
          if (modifier.incomeSkill) {
            return `<span class="incomeSkillText">${modifier.rqid?.name} ${bonusValueText}</span>`;
          } else {
            return `<span>${modifier.name} ${bonusValueText}</span>`;
          }
        })
        .join(", "),
    };
  }

  protected _updateObject(event: Event, formData: object): Promise<any> {
    // Do Background Specific Stuff here
    console.log("BACKGROUND super._updateObject(event, formData)", event, formData);
    return super._updateObject(event, formData);
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Do Background Specific Stuff Here
  }

  async _onDropItem(
    event: DragEvent,
    data: { type: string; uuid: string },
  ): Promise<boolean | RqgItem[]> {
    // Do Background Specific Stuff Here
    console.log("BACKGROUND _onDropItem(event, data)", event, data);
    return await super._onDropItem(event, data);
  }
}

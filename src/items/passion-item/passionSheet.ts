import { PassionsEnum } from "../../data-model/item-data/passionData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgItemSheet } from "../RqgItemSheet";
import { getGameUser } from "../../system/util";
import { systemId } from "../../system/config";
import { ItemSheetData } from "../shared/sheetInterfaces";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

export interface PassionSheetData {
  enrichedDescription: string;
  enrichedGmNotes: string;
  passionTypes: PassionsEnum[];
}

export class PassionSheet extends RqgItemSheet<
  ItemSheet.Options,
  PassionSheetData | ItemSheet.Data
> {
  // TODO move to config?
  static passionImgUrl = new Map([
    [PassionsEnum.Ambition, "systems/rqg/assets/images/passion/ambition.svg"],
    [PassionsEnum.Cowardly, "systems/rqg/assets/images/passion/cowardly.svg"],
    [PassionsEnum.Devotion, "systems/rqg/assets/images/passion/devotion.svg"],
    [PassionsEnum.Fear, "systems/rqg/assets/images/passion/fear.svg"],
    [PassionsEnum.Gluttony, "systems/rqg/assets/images/passion/gluttony.svg"],
    [PassionsEnum.Hate, "systems/rqg/assets/images/passion/hate.svg"],
    [PassionsEnum.Honor, "systems/rqg/assets/images/passion/honor.svg"],
    [PassionsEnum.Loyalty, "systems/rqg/assets/images/passion/loyalty.svg"],
    [PassionsEnum.Love, "systems/rqg/assets/images/passion/love.svg"],
    [PassionsEnum.Vanity, "systems/rqg/assets/images/passion/vanity.svg"],
  ]);

  static get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Passion],
      template: templatePaths.itemPassionSheet,
      width: 450,
      height: 500,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "passion",
        },
      ],
    });
  }

  async getData(): Promise<PassionSheetData & ItemSheetData> {
    // @ts-expect-error _source Read from the original data unaffected by any AEs
    const system = foundry.utils.duplicate(this.document._source.system);

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isGM: getGameUser().isGM,
      isEditable: this.isEditable,
      isEmbedded: this.document.isEmbedded,
      system: system,
      enrichedDescription: await TextEditor.enrichHTML(system.description),
      enrichedGmNotes: await TextEditor.enrichHTML(system.gmNotes),
      passionTypes: Object.values(PassionsEnum),
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    const subject = formData["system.subject"] ? ` (${formData["system.subject"]})` : "";
    formData["name"] = formData["system.passion"] + subject;

    if (Object.values(PassionsEnum).includes(formData["system.passion"])) {
      formData["img"] = PassionSheet.passionImgUrl.get(formData["system.passion"]);
    }

    return super._updateObject(event, formData);
  }
}

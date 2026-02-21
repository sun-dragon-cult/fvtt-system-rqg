import { PassionsEnum, type PassionItem } from "@item-model/passionData.ts";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { RqgItemSheet } from "../RqgItemSheet";
import { systemId } from "../../system/config";
import type { ItemSheetData } from "../shared/sheetInterfaces.types.ts";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

export interface PassionSheetData {
  enrichedDescription: string;
  enrichedGmNotes: string;
  passionTypes: PassionsEnum[];
}

export class PassionSheet extends RqgItemSheet {
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

  override get document(): PassionItem {
    return super.document as PassionItem;
  }

  static override get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Passion],
      template: templatePaths.itemPassionSheet,
      width: 600,
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

  override async getData(): Promise<PassionSheetData & ItemSheetData> {
    const system = foundry.utils.duplicate(this.document._source.system);

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isGM: game.user?.isGM ?? false,
      isEditable: this.isEditable,
      isEmbedded: this.document.isEmbedded,
      system: system,
      enrichedDescription: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.description,
      ),
      enrichedGmNotes: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.gmNotes,
      ),
      passionTypes: Object.values(PassionsEnum),
    };
  }

  protected override _updateObject(event: Event, formData: any): Promise<any> {
    const subject = formData["system.subject"] ? ` (${formData["system.subject"]})` : "";
    formData["name"] = formData["system.passion"] + subject;

    if (Object.values(PassionsEnum).includes(formData["system.passion"])) {
      formData["img"] = PassionSheet.passionImgUrl.get(formData["system.passion"]);
    }

    return super._updateObject(event, formData);
  }
}

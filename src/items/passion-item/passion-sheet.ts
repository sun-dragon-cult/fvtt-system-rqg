import type { AnyMutableObject } from "fvtt-types/utils";
import { passionKey, passionLabel, type PassionItem } from "@item-model/passion-data-model.ts";
import { PassionsEnum, passionKeys } from "@item-model/passion-enums.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { RqgItemSheet } from "../rqg-item-sheet";
import { systemId } from "../../system/config";
import type { ItemSheetData } from "../shared/sheet-interfaces.types.ts";
import { templatePaths } from "../../system/load-handlebars-templates";

export interface PassionSheetData {
  enrichedDescription: string;
  enrichedGmNotes: string;
  passionLabel: string;
  passionTypes: string[];
}

export class PassionSheet extends RqgItemSheet {
  // TODO move to config?
  static passionImgUrl = new Map<string, string>([
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
      passionLabel: passionLabel(system.passion),
      passionTypes: passionKeys.map(passionLabel),
    };
  }

  protected override _updateObject(event: Event, formData: AnyMutableObject): Promise<unknown> {
    const passion = passionKey(String(formData["system.passion"] ?? ""));
    formData["system.passion"] = passion;
    const subject = formData["system.subject"] ? ` (${formData["system.subject"]})` : "";
    formData["name"] = passionLabel(passion) + subject;

    const img = PassionSheet.passionImgUrl.get(passion);
    if (img) {
      formData["img"] = img;
    }

    return super._updateObject(event, formData);
  }
}

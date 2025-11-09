import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { armorTypeTranslationKeys, materialTranslationKeys } from "@item-model/armorData.ts";
import { type EquippedStatus, equippedStatusOptions } from "@item-model/IPhysicalItem.ts";
import { RqgItemSheet } from "../RqgItemSheet";
import {
  convertFormValueToString,
  getAvailableHitLocations,
  getSelectHitLocationOptions,
  localize,
} from "../../system/util";
import { systemId } from "../../system/config";
import type { EffectsItemSheetData } from "../shared/sheetInterfaces.types.ts";
import { RqidLink } from "../../data-model/shared/rqidLink";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

interface ArmorSheetData {
  allHitLocationOptions: SelectOptionData<string>[];
  equippedStatusOptions: SelectOptionData<EquippedStatus>[];
  armorTypeNames: string[];
  materialNames: string[];
  enrichedDescription: string;
  enrichedGmNotes: string;
}

export class ArmorSheet extends RqgItemSheet {
  static override get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Armor],
      template: templatePaths.itemArmorSheet,
      width: 600,
      height: 600,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "armor",
        },
      ],
    });
  }

  override async getData(): Promise<ArmorSheetData & EffectsItemSheetData> {
    const system = foundry.utils.duplicate(this.document._source.system);

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isEditable: this.isEditable,
      isEmbedded: this.document.isEmbedded,
      isGM: game.user?.isGM ?? false,
      system: system,
      effects: this.document.effects,
      allHitLocationOptions: getSelectHitLocationOptions(
        "RQG.Item.Armor.AddNewCoveredHitLocationPlaceholder",
      ),
      equippedStatusOptions: equippedStatusOptions,
      armorTypeNames: armorTypeTranslationKeys.map((key) => localize(key)),
      materialNames: materialTranslationKeys.map((key) => localize(key)),
      enrichedDescription: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.description,
      ),
      enrichedGmNotes: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.gmNotes,
      ),
    };
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);
    html.find("[data-add-hit-location]").change(this.onAddHitLocation.bind(this));
  }

  protected override _updateObject(event: Event, formData: any): Promise<unknown> {
    formData["name"] =
      `${formData["system.namePrefix"]} ${formData["system.armorType"]} (${formData["system.material"]})`;
    return super._updateObject(event, formData);
  }

  async onAddHitLocation(event: any): Promise<void> {
    const newRqid = convertFormValueToString(event.currentTarget?.value);

    if (!this.document.system.hitLocationRqidLinks.some((l: RqidLink) => l.rqid === newRqid)) {
      const newName =
        getAvailableHitLocations().find((l) => l.rqid === event.currentTarget.value)?.name ?? "";
      const newHitLocationRqidLink = new RqidLink(newRqid, newName);
      const updatedLinks = [...this.document.system.hitLocationRqidLinks, newHitLocationRqidLink];
      await this.document.update({ system: { hitLocationRqidLinks: updatedLinks } });
    }
    this.render();
  }
}

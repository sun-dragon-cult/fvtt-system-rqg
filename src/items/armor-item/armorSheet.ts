import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  armorTypeTranslationKeys,
  materialTranslationKeys,
} from "../../data-model/item-data/armorData";
import {
  type EquippedStatus,
  equippedStatusOptions,
} from "../../data-model/item-data/IPhysicalItem";
import { RqgItemSheet } from "../RqgItemSheet";
import {
  convertFormValueToString,
  getAvailableHitLocations,
  getGameUser,
  getSelectHitLocationOptions,
  localize,
} from "../../system/util";
import { RqgItem } from "../rqgItem";
import { systemId } from "../../system/config";
import type { EffectsItemSheetData } from "../shared/sheetInterfaces";
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

export class ArmorSheet extends RqgItemSheet<ItemSheet.Options, ArmorSheetData | ItemSheet.Data> {
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
    // @ts-expect-error _source Read from the original data unaffected by any AEs
    const system = foundry.utils.duplicate(this.document._source.system);

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isEditable: this.isEditable,
      isEmbedded: this.document.isEmbedded,
      isGM: getGameUser().isGM,
      system: system,
      effects: this.document.effects,
      allHitLocationOptions: getSelectHitLocationOptions(
        "RQG.Item.Armor.AddNewCoveredHitLocationPlaceholder",
      ),
      equippedStatusOptions: equippedStatusOptions,
      armorTypeNames: armorTypeTranslationKeys.map((key) => localize(key)),
      materialNames: materialTranslationKeys.map((key) => localize(key)),
      // @ts-expect-error applications
      enrichedDescription: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.description,
      ),
      // @ts-expect-error applications
      enrichedGmNotes: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.gmNotes,
      ),
    };
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);
    html.find("[data-add-hit-location]").change(this.onAddHitLocation.bind(this));
  }

  protected override _updateObject(event: Event, formData: any): Promise<RqgItem | undefined> {
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
      await this.document.update({ "system.hitLocationRqidLinks": updatedLinks });
    }
    this.render();
  }
}

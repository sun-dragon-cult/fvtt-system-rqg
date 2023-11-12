import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  armorTypeTranslationKeys,
  materialTranslationKeys,
} from "../../data-model/item-data/armorData";
import { equippedStatuses } from "../../data-model/item-data/IPhysicalItem";
import { RqgItemSheet } from "../RqgItemSheet";
import {
  AvailableItemCache,
  convertFormValueToString,
  getAvailableHitLocations,
  getGameUser,
  localize,
} from "../../system/util";
import { RqgItem } from "../rqgItem";
import { systemId } from "../../system/config";
import { EffectsItemSheetData } from "../shared/sheetInterfaces";
import { RqidLink } from "../../data-model/shared/rqidLink";

interface ArmorSheetData {
  allHitLocationOptions: AvailableItemCache[];
  equippedStatuses: string[];
  armorTypeNames: string[];
  materialNames: string[];
  enrichedDescription: string;
  enrichedGmNotes: string;
}

export class ArmorSheet extends RqgItemSheet<ItemSheet.Options, ArmorSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Armor],
      template: "systems/rqg/items/armor-item/armorSheet.hbs",
      width: 500,
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

  async getData(): Promise<ArmorSheetData & EffectsItemSheetData> {
    // @ts-expect-error _source Read from the original data unaffected by any AEs
    const system = duplicate(this.document._source.system);

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
      allHitLocationOptions:
        [
          { rqid: "empty", name: localize("RQG.Item.Armor.AddNewCoveredHitLocationPlaceholder") },
          ...(getAvailableHitLocations() ?? []),
        ].reduce((acc: any, l: any) => {
          return { ...acc, [l.rqid]: l.name };
        }, {}) ?? {},
      equippedStatuses: [...equippedStatuses],
      armorTypeNames: armorTypeTranslationKeys.map((key) => localize(key)),
      materialNames: materialTranslationKeys.map((key) => localize(key)),
      // @ts-expect-error async
      enrichedDescription: await TextEditor.enrichHTML(system.description, { async: true }),
      // @ts-expect-error async
      enrichedGmNotes: await TextEditor.enrichHTML(system.gmNotes, { async: true }),
    };
  }

  activateListeners(html: JQuery): void {
    super.activateListeners(html);
    html.find("[data-add-hit-location]").change(this.onAddHitLocation.bind(this));
  }

  protected _updateObject(event: Event, formData: any): Promise<RqgItem | undefined> {
    formData[
      "name"
    ] = `${formData["system.namePrefix"]} ${formData["system.armorType"]} (${formData["system.material"]})`;
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

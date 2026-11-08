import type { AnyMutableObject } from "fvtt-types/utils";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import {
  armorTypeKey,
  armorTypeLabel,
  materialKey,
  materialLabel,
  type ArmorItem,
} from "@item-model/armor-data-model.ts";
import { armorTypeKeys, materialKeys } from "@item-model/armor-enums.ts";
import { type EquippedStatus, equippedStatusOptions } from "@item-model/i-physical-item.ts";
import { RqgItemSheet } from "../rqg-item-sheet";
import { convertFormValueToString, getSelectHitLocationOptions } from "../../system/util";
import { systemId } from "../../system/config";
import type { EffectsItemSheetData } from "../shared/sheet-interfaces.types.ts";
import { RqidLink } from "../../data-model/shared/rqid-link";
import { templatePaths } from "../../system/load-handlebars-templates";
import { buildItemName } from "../item-name";

interface ArmorSheetData {
  allHitLocationOptions: SelectOptionData<string>[];
  equippedStatusOptions: SelectOptionData<EquippedStatus>[];
  /** The stored armor type and material as shown in the current language */
  armorTypeLabel: string;
  materialLabel: string;
  /** Labels of the known armor types and materials */
  armorTypeNames: string[];
  materialNames: string[];
  enrichedDescription: string;
  enrichedGmNotes: string;
}

export class ArmorSheet extends RqgItemSheet {
  override get document(): ArmorItem {
    return super.document as ArmorItem;
  }

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
      armorTypeLabel: armorTypeLabel(system.armorType),
      materialLabel: materialLabel(system.material),
      armorTypeNames: armorTypeKeys.map(armorTypeLabel),
      materialNames: materialKeys.map(materialLabel),
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

  protected override _updateObject(event: Event, formData: AnyMutableObject): Promise<unknown> {
    const { system } = this.document;
    const armorType = armorTypeKey(String(formData["system.armorType"] ?? system.armorType));
    const material = materialKey(String(formData["system.material"] ?? system.material));
    formData["system.armorType"] = armorType;
    formData["system.material"] = material;
    const name = buildItemName(ItemTypeEnum.Armor, {
      namePrefix: formData["system.namePrefix"] ?? system.namePrefix,
      armorType,
      material,
    });
    if (name) {
      formData["name"] = name;
    }
    return super._updateObject(event, formData);
  }

  async onAddHitLocation(event: any): Promise<void> {
    const newRqid = convertFormValueToString(event.currentTarget?.value);

    if (!this.document.system.hitLocationRqidLinks.some((l: RqidLink) => l.rqid === newRqid)) {
      const newHitLocationRqidLink = new RqidLink(newRqid);
      const updatedLinks = [...this.document.system.hitLocationRqidLinks, newHitLocationRqidLink];
      await this.document.update({ system: { hitLocationRqidLinks: updatedLinks } });
    }
    this.render();
  }
}

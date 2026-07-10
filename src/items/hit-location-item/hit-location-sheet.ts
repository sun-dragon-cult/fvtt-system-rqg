import { ItemTypeEnum } from "@item-model/item-types.ts";
import {
  hitLocationHealthStatusOptions,
  type HitLocationItem,
} from "@item-model/hit-location-data-model.ts";
import type { HitLocationHealthState } from "@item-model/hit-location-enums.ts";
import { HitLocationTypesEnum } from "@item-model/hit-location-enums.ts";
import { getSelectHitLocationOptions } from "../../system/util";
import { RqgItemSheet } from "../rqg-item-sheet";
import { systemId } from "../../system/config";
import type { ItemSheetData } from "../shared/sheet-interfaces.types.ts";
import { templatePaths } from "../../system/load-handlebars-templates";
import { showHitLocationHealWoundDialog } from ".";

interface HitLocationSheetData {
  allHitLocationOptions: SelectOptionData<string>[];
  hitLocationTypeOptions: SelectOptionData<HitLocationTypesEnum>[];
  hitLocationHealthStatusOptions: SelectOptionData<HitLocationHealthState>[];
  rqid: string;
}

export class HitLocationSheet extends RqgItemSheet {
  override get document(): HitLocationItem {
    return super.document as HitLocationItem;
  }

  static override get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.HitLocation],
      template: templatePaths.itemHitLocationSheet,
      width: 600,
      height: 500,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "hit-location",
        },
      ],
    });
  }

  override getData(): HitLocationSheetData & ItemSheetData {
    const system = foundry.utils.duplicate(this.document._source.system);
    system.hitPoints = this.document.system.hitPoints; // Use the actor derived values
    system.armorPoints = this.document.system.armorPoints; // Use the actor derived value

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      rqid: this.document.flags?.[systemId]?.documentRqidFlags?.id ?? "",
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isGM: game.user?.isGM ?? false,
      isEmbedded: this.document.isEmbedded,
      system: system,

      allHitLocationOptions: getSelectHitLocationOptions(),
      hitLocationHealthStatusOptions: hitLocationHealthStatusOptions,
      hitLocationTypeOptions: Object.values(HitLocationTypesEnum).map((type) => ({
        value: type,
        label: "RQG.Item.HitLocationType." + type,
      })),
    };
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Add event listener for healing wounds
    html.find("[data-item-heal-wound]").on("click", () => {
      if (this.document.isEmbedded && this.document.actor) {
        showHitLocationHealWoundDialog(this.document.actor, this.document.id!);
      }
    });
  }
}

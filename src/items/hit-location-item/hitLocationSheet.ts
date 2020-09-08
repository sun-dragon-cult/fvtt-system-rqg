import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  HitLocationData,
  HitLocationsEnum,
} from "../../data-model/item-data/hitLocationData";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";
import { HitLocation } from "./hitLocation";

export class HitLocationSheet extends ItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.HitLocation],
      template: "systems/rqg/items/hit-location-item/hitLocationSheet.html",
      width: 520,
      height: 250,
    });
  }

  // Wrong type definition super.getData returns ItemData<DataType> ??? I think
  getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: HitLocationData = sheetData.item.data;
    data.hitLocationTypes = Object.values(HitLocationsEnum);

    return sheetData;
  }

  static async addWound(actor, itemId) {
    const item = actor.getOwnedItem(itemId);
    const dialogContent = '<input type="number" name="damage" value="0"/>';

    await new Dialog(
      {
        title: `Add damage to ${item.name}`,
        content: dialogContent,
        default: "submit",
        buttons: {
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => null,
          },
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: "Confirm",
            callback: async (html) => {
              const damage = (html as JQuery).find("input")[0].value;
              item.data.data.wounds.push(damage);
              await HitLocation.prepareItemForActorSheet(item);
              actor.sheet.render();
            },
          },
        },
      },
      {
        classes: ["rqg", "dialog"],
      }
    ).render(true);
  }

  static async editWounds(actor, itemId) {
    const item = actor.getOwnedItem(itemId);
    console.log("*** editWounds item", item.data.data.wounds);
    // const dialogContent ='<input type="number" name="damage" value=item./>';
    let dialogContent = "";

    item.data.data.wounds.forEach(
      (wound, i) =>
        (dialogContent += `<input type="number" name="damage${i}" value="${wound}"/>`)
    );

    await new Dialog(
      {
        title: `Modify wound in ${item.name}`,
        content: dialogContent,
        default: "submit",
        buttons: {
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => null,
          },
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: "Confirm",
            callback: async (html) => {
              item.data.data.wounds = (html as JQuery)
                .find("input")
                .toArray()
                .map((w) => parseInt(w.value));
              await HitLocation.prepareItemForActorSheet(item);
              actor.sheet.render();
            },
          },
        },
      },
      {
        classes: ["rqg", "dialog"],
      }
    ).render(true);
  }
}

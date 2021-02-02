import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { HitLocationData, HitLocationsEnum } from "../../data-model/item-data/hitLocationData";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";
import { RqgActor } from "../../actors/rqgActor";
import { RqgItemSheet } from "../RqgItemSheet";

export class HitLocationSheet extends RqgItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.HitLocation],
      template: "systems/rqg/items/hit-location-item/hitLocationSheet.html",
      width: 310,
      height: 150,
    });
  }

  // Wrong type definition super.getData returns ItemData<DataType> ??? I think
  getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: HitLocationData = sheetData.item.data;
    data.hitLocationTypes = Object.values(HitLocationsEnum);

    return sheetData;
  }

  static addWound(actor: RqgActor, itemId: string) {
    const item: Item<HitLocationData> = actor.getOwnedItem(itemId);
    const dialogContent =
      '<input type="number" name="damage" value="0"/><label><input type="checkbox" name="toTotalHp" checked> Apply to total HP</label><br><label><input type="checkbox" name="subtractAP" checked> Subtract AP</label>';
    new Dialog(
      {
        title: `Add damage to ${item.name}`,
        content: dialogContent,
        default: "submit",
        buttons: {
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: "Add wound",
            callback: async (html) => {
              const applyDamageToTotalHp: boolean = ((html[0] as HTMLElement).querySelector(
                "[name=toTotalHp]"
              ) as HTMLInputElement).checked;
              const subtractAP: boolean = ((html[0] as HTMLElement).querySelector(
                "[name=subtractAP]"
              ) as HTMLInputElement).checked;
              let damage = parseInt(
                ((html[0] as HTMLElement).querySelector("[name=damage]") as HTMLInputElement).value
              );
              if (subtractAP) {
                damage = Math.max(0, damage - item.data.data.ap);
              }
              item.data.data.wounds.push(damage);
              await actor.updateOwnedItem({
                _id: item._id,
                data: { wounds: item.data.data.wounds.slice() },
              });
              if (applyDamageToTotalHp) {
                const currentTotalHp = actor.data.data.attributes.hitPoints.value;
                await actor.update({
                  "data.attributes.hitPoints.value": currentTotalHp - damage,
                });
              }
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => null,
          },
        },
      },
      {
        classes: ["rqg", "dialog"],
      }
    ).render(true);
  }

  static editWounds(actor: RqgActor, itemId: string) {
    const item: Item<HitLocationData> = actor.getOwnedItem(itemId);
    let dialogContent = "";

    item.data.data.wounds.forEach(
      (wound, i) => (dialogContent += `<input type="number" name="damage${i}" value="${wound}"/>`)
    );
    dialogContent +=
      '<label><input type="checkbox" name="toTotalHp" checked> Restore from total HP</label>';

    new Dialog(
      {
        title: `Modify wound in ${item.name}`,
        content: dialogContent,
        default: "submit",
        buttons: {
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: "Confirm",
            callback: async (html) => {
              const applyDamageToTotalHp: boolean = ((html[0] as HTMLElement).querySelector(
                "[name=toTotalHp]"
              ) as HTMLInputElement).checked;
              const woundsSumBefore = item.data.data.wounds.reduce((acc, v) => acc + v, 0);
              item.data.data.wounds = (html as JQuery)
                .find("input")
                .toArray()
                .map((w) => parseInt(w.value));

              await actor.updateOwnedItem({
                _id: item._id,
                data: { wounds: item.data.data.wounds.slice() },
              });
              if (applyDamageToTotalHp) {
                const currentTotalHp = actor.data.data.attributes.hitPoints.value;
                const woundsSumAfter = item.data.data.wounds.reduce((acc, v) => acc + v, 0);
                await actor.update({
                  "data.attributes.hitPoints.value":
                    currentTotalHp + woundsSumBefore - woundsSumAfter,
                });
              }
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => null,
          },
        },
      },
      {
        classes: ["rqg", "dialog"],
      }
    ).render(true);
  }
}

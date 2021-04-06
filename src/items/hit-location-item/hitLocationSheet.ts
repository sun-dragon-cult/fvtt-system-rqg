import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { HitLocationItemData, HitLocationsEnum } from "../../data-model/item-data/hitLocationData";
import { RqgActor } from "../../actors/rqgActor";
import { logBug } from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";

export class HitLocationSheet extends RqgItemSheet {
  static get defaultOptions(): BaseEntitySheet.Options {
    // @ts-ignore mergeObject
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.HitLocation],
      template: "systems/rqg/items/hit-location-item/hitLocationSheet.html",
      width: 310,
      height: 150,
    });
  }

  getData(): HitLocationItemData {
    const sheetData = super.getData() as HitLocationItemData;
    const data = sheetData.data;
    data.hitLocationTypes = Object.values(HitLocationsEnum);

    return sheetData;
  }

  static addWound(actor: RqgActor, itemId: string): void {
    const item = actor.getOwnedItem(itemId) as Item<HitLocationItemData>;
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
            callback: async (html: JQuery | HTMLElement) => {
              const htmlEl = (html as JQuery)[0] as HTMLElement;
              const applyDamageToTotalHp: boolean = (htmlEl.querySelector(
                "[name=toTotalHp]"
              ) as HTMLInputElement).checked;
              const subtractAP: boolean = (htmlEl.querySelector(
                "[name=subtractAP]"
              ) as HTMLInputElement).checked;
              let damage = Number(
                (htmlEl.querySelector("[name=damage]") as HTMLInputElement).value
              );
              if (subtractAP) {
                damage = Math.max(0, damage - (item.data.data.ap || 0));
              }
              item.data.data.wounds.push(damage);
              await actor.updateOwnedItem({
                _id: item._id,
                data: { wounds: item.data.data.wounds.slice() },
              });
              if (applyDamageToTotalHp) {
                const currentTotalHp = actor.data.data.attributes.hitPoints.value;
                await actor.update({
                  "data.attributes.hitPoints.value": currentTotalHp! - damage,
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
    const item = actor.getOwnedItem(itemId);
    if (item.data.type !== ItemTypeEnum.HitLocation) {
      logBug("Edit Wounds did not point to a Hit Location Item", item);
      return;
    }
    let dialogContent = "";

    item.data.data.wounds.forEach(
      (wound: number, i: number) =>
        (dialogContent += `<input type="number" name="damage${i}" value="${wound}"/>`)
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
            callback: async (html: JQuery | HTMLElement) => {
              if (item.data.type !== ItemTypeEnum.HitLocation) {
                logBug("Edit Wounds did not point to a Hit Location Item Dialog", item);
                return;
              }
              const htmlJQ = html as JQuery;
              const htmlEl = (html as JQuery)[0] as HTMLElement;

              const applyDamageToTotalHp: boolean = (htmlEl.querySelector(
                "[name=toTotalHp]"
              ) as HTMLInputElement).checked;
              const woundsSumBefore = item.data.data.wounds.reduce(
                (acc: number, v: number) => acc + v,
                0
              );
              item.data.data.wounds = htmlJQ
                .find("input")
                .toArray()
                .map((w) => Number(w.value));

              await actor.updateOwnedItem({
                _id: item._id,
                data: { wounds: item.data.data.wounds.slice() },
              });
              if (applyDamageToTotalHp) {
                const currentTotalHp = actor.data.data.attributes.hitPoints.value!;
                const woundsSumAfter = item.data.data.wounds.reduce(
                  (acc: number, v: number) => acc + v,
                  0
                );
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

import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  HitLocationItemData,
  HitLocationsEnum,
  HitLocationTypesEnum,
  limbHealthStatuses,
} from "../../data-model/item-data/hitLocationData";
import { RqgActor } from "../../actors/rqgActor";
import { logBug } from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";
import { HealthEnum } from "../../data-model/actor-data/attributes";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { DamageCalculations } from "./damageCalculations";

export class HitLocationSheet extends RqgItemSheet {
  static get defaultOptions(): BaseEntitySheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.HitLocation],
      template: "systems/rqg/items/hit-location-item/hitLocationSheet.html",
      width: 320,
      height: 250,
    } as any);
  }

  getData(): HitLocationItemData {
    const sheetData = super.getData() as HitLocationItemData;
    const data = sheetData.data;
    data.hitLocationNamesAll = Object.values(HitLocationsEnum);
    data.hitLocationTypes = Object.values(HitLocationTypesEnum);
    data.limbHealthStatuses = Object.values(limbHealthStatuses);

    return sheetData;
  }

  static showAddWoundDialog(actor: RqgActor, hitLocationItemId: string): void {
    const hitLocation = actor.getOwnedItem(hitLocationItemId) as Item<HitLocationItemData>;
    const dialogContent =
      '<form><input type="number" id="inflictDamagePoints" name="damage"><br><label><input type="checkbox" name="toTotalHp" checked> Apply to total HP</label><br><label><input type="checkbox" name="subtractAP" checked> Subtract AP</label><br></form>';
    new Dialog(
      {
        title: `Add damage to ${hitLocation.name}`,
        content: dialogContent,
        default: "submit",
        render: () => {
          $("#inflictDamagePoints").focus();
        },
        buttons: {
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: "Add wound",
            callback: async (html: JQuery | HTMLElement) =>
              await HitLocationSheet.submitAddWoundDialog(html as JQuery, hitLocation),
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

  static showHealWoundDialog(actor: RqgActor, hitLocationItemId: string) {
    const hitLocation = actor.getOwnedItem(hitLocationItemId);
    if (hitLocation.data.type !== ItemTypeEnum.HitLocation) {
      logBug("Edit Wounds did not point to a Hit Location Item", hitLocation);
      return;
    }
    let dialogContent = "<form>";

    hitLocation.data.data.wounds.forEach(
      (wound, i) =>
        (dialogContent += `<input type="radio" name="wound" value="${i}" ${
          !i && "checked"
        }> ${wound}</label><br>`)
    );
    dialogContent +=
      '<br><label>Heal <input id="healWoundPoints" type="number" name="heal" min=0 max=99> points</label><br><br></form>';

    new Dialog(
      {
        title: `Heal wound in ${hitLocation.name}`,
        content: dialogContent,
        default: "submit",
        render: () => {
          $("#healWoundPoints").focus();
        },
        buttons: {
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: "Heal wound",
            callback: async (html: JQuery | HTMLElement) =>
              await HitLocationSheet.submitHealWoundDialog(
                html as JQuery,
                hitLocation as Item<HitLocationItemData>
              ),
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

  private static async submitAddWoundDialog(html: JQuery, hitLocation: Item<HitLocationItemData>) {
    const formData = new FormData(html.find("form")[0]);
    // @ts-ignore entries
    const data = Object.fromEntries(formData.entries());
    const applyDamageToTotalHp: boolean = !!data.toTotalHp;
    const subtractAP: boolean = !!data.subtractAP;
    let damage = Number(data.damage);
    const actor = hitLocation.actor as RqgActor;
    if (subtractAP) {
      const ap = hitLocation.data.data.ap;
      if (ap != null) {
        damage = Math.max(0, damage - ap);
      } else {
        logBug(
          `Hit location ${hitLocation.name} doesn't have a calculated total armor point`,
          hitLocation
        );
      }
    }
    const { hitLocationUpdates, actorUpdates, notification } = DamageCalculations.addWound(
      damage,
      applyDamageToTotalHp,
      hitLocation.data,
      actor.data
    );

    notification && ui.notifications?.info(notification, { permanent: true });
    hitLocationUpdates && (await hitLocation.update(hitLocationUpdates));
    actorUpdates && (await actor.update(actorUpdates));
    // TODO implement abdomen -> legs useless effect
    // damageEffects.otherHitLocations.forEach((update) =>
    //   actor.getOwnedItem(update.id).update(update)
    // );
  }

  private static async submitHealWoundDialog(
    html: JQuery,
    hitLocation: Item<HitLocationItemData>
  ): Promise<void> {
    const formData = new FormData(html.find("form")[0]);
    // @ts-ignore formData.entries
    const data = Object.fromEntries(formData.entries());
    const actor = hitLocation.actor as RqgActor;
    const hpValue = hitLocation.data.data.hp.value;
    const hpMax = hitLocation.data.data.hp.max;
    if (hpValue == null || hpMax == null) {
      logBug(`Hitlocation ${hitLocation.name} don't have hp value or max`, hitLocation);
      return;
    }
    if (actor == null) {
      logBug(`Couldn't find actor from hitLocation ${hitLocation.name}`, hitLocation);
      return;
    }
    const healWoundIndex: number = Number(data.wound);
    let healPoints: number = Number(data.heal);
    const actorUpdateData: DeepPartial<RqgActorData> = {
      data: {},
    };
    const wounds = hitLocation.data.data.wounds;
    let limbHealthState = hitLocation.data.data.limbHealthState;

    healPoints = Math.min(wounds[healWoundIndex], healPoints); // Dont' heal more than wound damage
    wounds[healWoundIndex] -= healPoints;

    if (healPoints >= 6 && limbHealthState === "severed") {
      limbHealthState = "wounded"; // Remove the "severed" state, but the actual state will be calculated below
    }

    const woundsSumAfter = wounds.reduce((acc, w) => acc + w, 0);
    if (woundsSumAfter === 0 && limbHealthState !== "severed") {
      limbHealthState = "healthy";
    } else if (woundsSumAfter < hpMax && limbHealthState !== "severed") {
      limbHealthState = "wounded";
    }

    await actor.updateOwnedItem({
      _id: hitLocation._id,
      data: {
        wounds: wounds.slice(),
        limbHealthState: limbHealthState,
      },
    });

    const actorTotalHp = actor.data.data.attributes.hitPoints.value;
    const actorMaxHp = actor.data.data.attributes.hitPoints.max;
    if (actorTotalHp == null || actorMaxHp == null) {
      logBug(`Couldn't find actor total hp (max or current value)`, actor);
      return;
    }

    const totalHpAfter = Math.min(actorTotalHp + healPoints, actorMaxHp);
    HitLocationSheet.actorHitPointsUpdate(actorUpdateData, totalHpAfter);
    HitLocationSheet.actorHealthUpdate(
      actorUpdateData,
      actor.getOwnedItem(hitLocation._id) as Item<HitLocationItemData>
    );

    await actor.update(actorUpdateData);
  }

  private static actorHitPointsUpdate(
    actorUpdateData: DeepPartial<RqgActorData>,
    newHp: number
  ): void {
    mergeObject(actorUpdateData, { data: { attributes: { hitPoints: { value: newHp } } } });
  }

  private static actorHealthUpdate(
    actorUpdateData: DeepPartial<RqgActorData>,
    item: Item<HitLocationItemData>
  ): void {
    if (
      (item &&
        item.data.data.hitLocationType === HitLocationTypesEnum.Limb &&
        item.data.data.hp.value) ||
      0 > 0
    ) {
      mergeObject(actorUpdateData, {
        data: { attributes: { health: HealthEnum.Wounded } },
      });
    }
  }
}

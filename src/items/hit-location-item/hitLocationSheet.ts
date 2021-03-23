import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  HitLocationData,
  HitLocationsEnum,
  HitLocationTypesEnum,
  limbHealthStatuses,
} from "../../data-model/item-data/hitLocationData";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";
import { RqgActor } from "../../actors/rqgActor";
import { RqgItemSheet } from "../RqgItemSheet";
import { HealthEnum } from "../../data-model/actor-data/attributes";

export class HitLocationSheet extends RqgItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplication.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.HitLocation],
      template: "systems/rqg/items/hit-location-item/hitLocationSheet.html",
      width: 320,
      height: 250,
    });
  }

  // Wrong type definition super.getData returns ItemData<DataType> ??? I think
  getData(): any {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: HitLocationData = sheetData.item.data;
    sheetData.hitLocationNamesAll = Object.values(HitLocationsEnum);
    sheetData.hitLocationTypes = Object.values(HitLocationTypesEnum);
    sheetData.limbHealthStatuses = Object.values(limbHealthStatuses);

    return sheetData;
  }

  static showAddWoundDialog(actor: RqgActor, hitLocationItemId: string) {
    const hitLocation: Item<HitLocationData> = actor.getOwnedItem(hitLocationItemId);
    const dialogContent =
      '<form><input type="number" id="inflictDamagePoints" name="damage"><br><label><input type="checkbox" name="toTotalHp" checked> Apply to total HP</label><br><label><input type="checkbox" name="subtractAP" checked> Subtract AP</label><br></form>';
    new Dialog(
      {
        title: `Add damage to ${hitLocation.name}`,
        content: dialogContent,
        default: "submit",
        // @ts-ignore
        render: () => {
          $("#inflictDamagePoints").focus();
        },
        buttons: {
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: "Add wound",
            callback: async (html) =>
              await HitLocationSheet.submitAddWoundDialog(html, hitLocation),
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

  // TODO showHealWoundDialog
  static showHealWoundDialog(actor: RqgActor, hitLocationItemId: string): void {
    const hitLocation: Item<HitLocationData> = actor.getOwnedItem(hitLocationItemId);
    let dialogContent = "<form>Wounds<br>";

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
        // @ts-ignore
        render: () => {
          $("#healWoundPoints").focus();
        },
        buttons: {
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: "Heal wound",
            callback: async (html) =>
              await HitLocationSheet.submitHealWoundDialog(html, hitLocation),
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

  private static async submitAddWoundDialog(html, item) {
    const formData = new FormData(html.find("form")[0]);
    const data = Object.fromEntries(formData.entries());
    const applyDamageToTotalHp: boolean = !!data.toTotalHp;
    const subtractAP: boolean = !!data.subtractAP;
    let damage = Number(data.damage);
    const actorUpdateData: ActorData<RqgActorData> = {
      data: {},
    } as ActorData<RqgActorData>;

    let msg;

    if (subtractAP) {
      damage = Math.max(0, damage - item.data.data.ap);
    }
    if (item.data.data.hitLocationType === HitLocationTypesEnum.Limb) {
      const fullDamage = damage;
      damage = damage = Math.min(item.data.data.hp.max * 2, damage); // Max damage to THP inflicted by limb wound is 2*HP
      msg =
        item.data.data.limbHealthState === "severed"
          ? `${item.name} is gone and cannot be hit anymore, reroll to get a new hit location!`
          : HitLocationSheet.calcLimbDamageEffects(item, damage, fullDamage, actorUpdateData);
      // TODO Whisper chat to GM?
    } else {
      msg = await HitLocationSheet.calcLocationDamageEffects(item, damage, actorUpdateData);
    }
    msg && ui.notifications.info(msg, { permanent: true });
    await item.actor.updateOwnedItem({
      _id: item._id,
      data: {
        wounds: item.data.data.wounds.slice(),
        limbHealthState: item.data.data.limbHealthState,
      },
    });
    if (applyDamageToTotalHp) {
      const currentTotalHp = item.actor.data.data.attributes.hitPoints.value;
      const newTotalHp = currentTotalHp - damage;
      HitLocationSheet.actorHitPointsUpdate(actorUpdateData, newTotalHp);
    }
    await item.actor.update(actorUpdateData);
  }

  private static calcLimbDamageEffects(
    item: RqgItem,
    damage: number, // Limited to 2*HP
    fullDamage: number,
    actorUpdateData: ActorData<RqgActorData>
  ): string {
    const actorName = item.actor.token?.name || item.actor.name;
    let notificationMsg;
    if (
      damage > 0 &&
      limbHealthStatuses.indexOf(item.data.data.limbHealthState) <
        limbHealthStatuses.indexOf("wounded")
    ) {
      item.data.data.limbHealthState = "wounded";
    }
    if (
      item.data.data.hp.value - fullDamage <= 0 &&
      limbHealthStatuses.indexOf(item.data.data.limbHealthState) <
        limbHealthStatuses.indexOf("useless")
    ) {
      notificationMsg = `${actorName}s ${item.name} is useless and cannot hold anything / support standing. You can fight with whatever limbs are still functional.`;
      item.data.data.limbHealthState = "useless";
    }
    if (fullDamage >= item.data.data.hp.max * 2) {
      notificationMsg = `${actorName} is functionally incapacitated: you can no longer fight until healed and am in shock. You may try to heal yourself.`;
      mergeObject(actorUpdateData, {
        // @ts-ignore sparse data
        data: { attributes: { health: HealthEnum.Shock } },
      });
      item.actor.token?.toggleEffect(
        // @ts-ignore testing
        CONFIG.statusEffects[CONFIG.statusEffects.findIndex((e) => e.id === "unconscious")].icon
      );
    }
    if (fullDamage >= item.data.data.hp.max * 3) {
      notificationMsg = `${actorName}s ${item.name} is severed or irrevocably maimed. Only a 6 point heal applied within ten
                              minutes can restore a severed limb, assuming all parts are available.`;
      item.data.data.limbHealthState = "severed";
    }
    const currentLimbDamage = item.data.data.hp.max - item.data.data.hp.value;
    const limbWound = Math.min(item.data.data.hp.max * 2 - currentLimbDamage, damage);
    item.data.data.wounds.push(limbWound);
    return notificationMsg;
  }

  private static async calcLocationDamageEffects(item, damage, actorUpdateData): Promise<string> {
    const actorName = item.actor.token?.name || item.actor.name;
    let notificationMsg;
    // A big hit to Abdomen affects connected limbs, but instant death sized damage should override it
    if (
      item.data.data.hitLocationType === HitLocationTypesEnum.Abdomen &&
      item.data.data.hp.value - damage <= 0 &&
      damage < item.data.data.hp.max * 3
    ) {
      const attachedLimbs = item.actor.items.filter(
        (i) => i.data.type === ItemTypeEnum.HitLocation && i.data.data.connectedTo === item.name
      );
      const otherLimbsUpdate = attachedLimbs.map((l) => {
        return {
          _id: l._id,
          data: {
            limbHealthState: "useless",
          },
        };
      });
      await item.actor.updateEmbeddedEntity("OwnedItem", otherLimbsUpdate);
      ui.notifications.info(
        `Both legs are useless and ${actorName} falls to the ground. ${actorName} may fight from the ground
                      in subsequent melee rounds. Will bleed to death, if not healed or treated with First Aid within ten minutes.`,
        { permanent: true }
      );
      item.actor.token?.toggleEffect(
        // @ts-ignore testing
        CONFIG.statusEffects[CONFIG.statusEffects.findIndex((e) => e.id === "prone")].icon
      );
    }

    if (damage >= item.data.data.hp.max * 3) {
      notificationMsg = `${actorName} dies instantly.`;
      mergeObject(actorUpdateData, {
        // @ts-ignore sparse data
        data: { attributes: { health: HealthEnum.Dead } },
      });
      // TODO This doesn't set the combatant in the combat tracker as dead - it only adds the dead token effect
      item.actor.token?.toggleEffect(
        // @ts-ignore
        CONFIG.statusEffects[CONFIG.statusEffects.findIndex((e) => e.id === "dead")].icon
      );
    } else if (damage >= item.data.data.hp.max * 2) {
      notificationMsg = `${actorName} becomes unconscious and begins to lose 1 hit point per melee round from bleeding unless healed or treated with First Aid.`;
      mergeObject(actorUpdateData, {
        // @ts-ignore sparse data
        data: { attributes: { health: HealthEnum.Unconscious } },
      });
      item.actor.token?.toggleEffect(
        // @ts-ignore testing
        CONFIG.statusEffects[CONFIG.statusEffects.findIndex((e) => e.id === "unconscious")].icon
      );
    } else if (item.data.data.hp.value - damage <= 0) {
      if (item.data.data.hitLocationType === HitLocationTypesEnum.Head) {
        notificationMsg = `${actorName} is unconscious and must be healed or treated with First Aid within five minutes (one full turn) or die`;
        mergeObject(actorUpdateData, {
          // @ts-ignore sparse data
          data: { attributes: { health: HealthEnum.Unconscious } },
        });
        item.actor.token?.toggleEffect(
          // @ts-ignore testing
          CONFIG.statusEffects[CONFIG.statusEffects.findIndex((e) => e.id === "unconscious")].icon
        );
      } else if (item.data.data.hitLocationType === HitLocationTypesEnum.Chest) {
        notificationMsg = `${actorName} falls and is too busy coughing blood to do anything. Will bleed to death in ten minutes
                      unless the bleeding is stopped by First Aid, and cannot take any action, including healing.`;
        mergeObject(actorUpdateData, {
          // @ts-ignore sparse data
          data: { attributes: { health: HealthEnum.Shock } }, // TODO Not the same as shock from limb wound !!!
        });
        item.actor.token?.toggleEffect(
          // @ts-ignore testing
          CONFIG.statusEffects[CONFIG.statusEffects.findIndex((e) => e.id === "unconscious")].icon
        );
      }
    } else if (damage > 0) {
      item.data.data.limbHealthState = "wounded"; // TODO using limbState as hit location state!!! rename it???
    }

    item.data.data.wounds.push(damage);
    return notificationMsg;
  }

  private static async submitHealWoundDialog(html, item) {
    const formData = new FormData(html.find("form")[0]);
    const data = Object.fromEntries(formData.entries());
    const healWoundIndex: number = Number(data.wound);
    let healPoints: number = Number(data.heal);
    const actorUpdateData: ActorData<RqgActorData> = {
      data: {},
    } as ActorData<RqgActorData>;
    const wounds = item.data.data.wounds;
    let limbHealthState = item.data.data.limbHealthState;

    healPoints = Math.min(wounds[healWoundIndex], healPoints); // Dont' heal more than wound damage
    wounds[healWoundIndex] -= healPoints;

    if (healPoints >= 6 && limbHealthState === "severed") {
      limbHealthState = "wounded"; // Remove the "severed" state, but the actual state will be calculated below
    }

    const woundsSumAfter = wounds.reduce((acc, w) => acc + w, 0);
    if (woundsSumAfter === 0 && limbHealthState !== "severed") {
      limbHealthState = "healthy";
    } else if (woundsSumAfter < item.data.data.hp.max && limbHealthState !== "severed") {
      limbHealthState = "wounded";
    }

    await item.actor.updateOwnedItem({
      _id: item._id,
      data: {
        wounds: wounds.slice(),
        limbHealthState: limbHealthState,
      },
    });

    const actorTotalHp = item.actor.data.data.attributes.hitPoints.value;
    const actorMaxHp = item.actor.data.data.attributes.hitPoints.max;
    const totalHpAfter = Math.min(actorTotalHp + healPoints, actorMaxHp);
    HitLocationSheet.actorHitPointsUpdate(actorUpdateData, totalHpAfter);
    HitLocationSheet.actorHealthUpdate(actorUpdateData, item.actor.getOwnedItem(item._id));

    await item.actor.update(actorUpdateData);
  }

  private static actorHitPointsUpdate(actorUpdateData, newHp: number): void {
    mergeObject(actorUpdateData, { data: { attributes: { hitPoints: { value: newHp } } } });
  }

  private static actorHealthUpdate(actorUpdateData, item): void {
    if (
      item &&
      item.data.data.hitLocationType === HitLocationTypesEnum.Limb &&
      item.data.data.hp.value > 0
    ) {
      mergeObject(actorUpdateData, {
        // @ts-ignore sparse data
        data: { attributes: { health: HealthEnum.Wounded } },
      });
    }
  }
}

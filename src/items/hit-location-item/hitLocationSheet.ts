import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  HitLocationItemData,
  HitLocationsEnum,
  HitLocationTypesEnum,
  limbHealthStatuses,
} from "../../data-model/item-data/hitLocationData";
import { RqgActor } from "../../actors/rqgActor";
import { logBug } from "../../system/util";
import { HealthEnum } from "../../data-model/actor-data/attributes";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";

export class HitLocationSheet extends ItemSheet<HitLocationItemData> {
  static get defaultOptions(): BaseEntitySheet.Options {
    // @ts-ignore mergeObject
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.HitLocation],
      template: "systems/rqg/items/hit-location-item/hitLocationSheet.html",
      width: 320,
      height: 250,
    });
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
    const actorUpdateData: DeepPartial<RqgActorData> = {
      data: {},
    };

    let msg;

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
    if (hitLocation.data.data.hitLocationType === HitLocationTypesEnum.Limb) {
      const fullDamage = damage;
      const maxHp = hitLocation.data.data.hp.max;
      if (maxHp) {
        damage = damage = Math.min(maxHp * 2, damage); // Max damage to THP inflicted by limb wound is 2*HP
        msg =
          hitLocation.data.data.limbHealthState === "severed"
            ? `${hitLocation.name} is gone and cannot be hit anymore, reroll to get a new hit location!`
            : HitLocationSheet.calcLimbDamageEffects(
                hitLocation,
                damage,
                fullDamage,
                actorUpdateData
              );
        // TODO Whisper chat to GM?
      } else {
        logBug(`Hit location ${hitLocation.name} doesn't have a max hp`, hitLocation);
      }
    } else {
      msg = await HitLocationSheet.calcLocationDamageEffects(hitLocation, damage, actorUpdateData);
    }
    msg && ui.notifications?.info(msg, { permanent: true });
    await actor.updateOwnedItem({
      _id: hitLocation._id,
      data: {
        wounds: hitLocation.data.data.wounds.slice(),
        limbHealthState: hitLocation.data.data.limbHealthState,
      },
    });
    if (applyDamageToTotalHp) {
      const currentTotalHp = actor.data.data.attributes.hitPoints.value;
      if (currentTotalHp) {
        const newTotalHp = currentTotalHp - damage;
        HitLocationSheet.actorHitPointsUpdate(actorUpdateData, newTotalHp);
      } else {
        logBug(`Actor ${actor.name} don't have a calculated hitpoint value`, actor);
      }
    }
    await actor.update(actorUpdateData);
  }

  private static calcLimbDamageEffects(
    hitLocation: Item<HitLocationItemData>,
    damage: number, // Limited to 2*HP
    fullDamage: number,
    actorUpdateData: DeepPartial<RqgActorData>
  ): string {
    const hpValue = hitLocation.data.data.hp.value;
    const hpMax = hitLocation.data.data.hp.max;
    if (hpValue == null || hpMax == null) {
      logBug(`Hitlocation ${hitLocation.name} don't have hp value or max`, hitLocation);
      return "";
    }
    const actor = hitLocation.actor as RqgActor;
    if (actor == null) {
      logBug(`Couldn't find actor from hitLocation ${hitLocation.name}`, hitLocation);
      return "";
    }
    const actorName = actor.token?.name || actor.name;
    let notificationMsg = "";
    if (
      damage > 0 &&
      limbHealthStatuses.indexOf(hitLocation.data.data.limbHealthState) <
        limbHealthStatuses.indexOf("wounded")
    ) {
      hitLocation.data.data.limbHealthState = "wounded";
    }
    if (
      hpValue - fullDamage <= 0 &&
      limbHealthStatuses.indexOf(hitLocation.data.data.limbHealthState) <
        limbHealthStatuses.indexOf("useless")
    ) {
      notificationMsg = `${actorName}s ${hitLocation.name} is useless and cannot hold anything / support standing. You can fight with whatever limbs are still functional.`;
      hitLocation.data.data.limbHealthState = "useless";
    }
    if (fullDamage >= hpMax * 2) {
      notificationMsg = `${actorName} is functionally incapacitated: you can no longer fight until healed and am in shock. You may try to heal yourself.`;
      mergeObject(actorUpdateData, {
        data: { attributes: { health: HealthEnum.Shock } },
      });
      actor.token?.toggleEffect(
        CONFIG.statusEffects[CONFIG.statusEffects.findIndex((e) => e.id === "unconscious")].icon
      );
    }
    if (fullDamage >= hpMax * 3) {
      notificationMsg = `${actorName}s ${hitLocation.name} is severed or irrevocably maimed. Only a 6 point heal applied within ten
                              minutes can restore a severed limb, assuming all parts are available.`;
      hitLocation.data.data.limbHealthState = "severed";
    }
    const currentLimbDamage = hpMax - hpValue;
    const limbWound = Math.min(hpMax * 2 - currentLimbDamage, damage);
    hitLocation.data.data.wounds.push(limbWound);
    return notificationMsg;
  }

  private static async calcLocationDamageEffects(
    hitLocation: Item<HitLocationItemData>,
    damage: number,
    actorUpdateData: DeepPartial<RqgActorData>
  ): Promise<string> {
    const actor = hitLocation.actor as RqgActor;
    if (actor == null) {
      logBug(`Couldn't find actor from hitLocation ${hitLocation.name}`, hitLocation);
      return "";
    }
    const actorName = actor.token?.name || actor.name;
    const hpValue = hitLocation.data.data.hp.value;
    const hpMax = hitLocation.data.data.hp.max;
    if (hpValue == null || hpMax == null) {
      logBug(`Hitlocation ${hitLocation.name} don't have hp value or max`, hitLocation);
      return "";
    }

    let notificationMsg = "";
    // A big hit to Abdomen affects connected limbs, but instant death sized damage should override it
    if (
      hitLocation.data.data.hitLocationType === HitLocationTypesEnum.Abdomen &&
      hpValue - damage <= 0 &&
      damage < hpMax * 3
    ) {
      const attachedLimbs = actor.items.filter(
        (i) =>
          i.data.type === ItemTypeEnum.HitLocation && i.data.data.connectedTo === hitLocation.name
      );
      const otherLimbsUpdate = attachedLimbs.map((l) => {
        return {
          _id: l._id,
          data: {
            limbHealthState: "useless",
          },
        };
      });
      await actor.updateEmbeddedEntity("OwnedItem", otherLimbsUpdate);
      ui.notifications?.info(
        `Both legs are useless and ${actorName} falls to the ground. ${actorName} may fight from the ground
                      in subsequent melee rounds. Will bleed to death, if not healed or treated with First Aid within ten minutes.`,
        { permanent: true }
      );
      actor.token?.toggleEffect(
        CONFIG.statusEffects[CONFIG.statusEffects.findIndex((e) => e.id === "prone")].icon
      );
    }

    if (damage >= hpMax * 3) {
      notificationMsg = `${actorName} dies instantly.`;
      mergeObject(actorUpdateData, {
        data: { attributes: { health: HealthEnum.Dead } },
      });
      // TODO This doesn't set the combatant in the combat tracker as dead - it only adds the dead token effect
      actor.token?.toggleEffect(
        CONFIG.statusEffects[CONFIG.statusEffects.findIndex((e) => e.id === "dead")].icon
      );
    } else if (damage >= hpMax * 2) {
      notificationMsg = `${actorName} becomes unconscious and begins to lose 1 hit point per melee round from bleeding unless healed or treated with First Aid.`;
      mergeObject(actorUpdateData, {
        data: { attributes: { health: HealthEnum.Unconscious } },
      });
      actor.token?.toggleEffect(
        CONFIG.statusEffects[CONFIG.statusEffects.findIndex((e) => e.id === "unconscious")].icon
      );
    } else if (hpValue - damage <= 0) {
      if (hitLocation.data.data.hitLocationType === HitLocationTypesEnum.Head) {
        notificationMsg = `${actorName} is unconscious and must be healed or treated with First Aid within five minutes (one full turn) or die`;
        mergeObject(actorUpdateData, {
          data: { attributes: { health: HealthEnum.Unconscious } },
        });
        actor.token?.toggleEffect(
          CONFIG.statusEffects[CONFIG.statusEffects.findIndex((e) => e.id === "unconscious")].icon
        );
      } else if (hitLocation.data.data.hitLocationType === HitLocationTypesEnum.Chest) {
        notificationMsg = `${actorName} falls and is too busy coughing blood to do anything. Will bleed to death in ten minutes
                      unless the bleeding is stopped by First Aid, and cannot take any action, including healing.`;
        mergeObject(actorUpdateData, {
          data: { attributes: { health: HealthEnum.Shock } }, // TODO Not the same as shock from limb wound !!!
        });
        actor.token?.toggleEffect(
          CONFIG.statusEffects[CONFIG.statusEffects.findIndex((e) => e.id === "unconscious")].icon
        );
      }
    } else if (damage > 0) {
      hitLocation.data.data.limbHealthState = "wounded"; // TODO using limbState as hit location state!!! rename it???
    }

    hitLocation.data.data.wounds.push(damage);
    return notificationMsg;
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
    if (!actorTotalHp || !actorMaxHp) {
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

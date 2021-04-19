import {
  hitLocationHealthStatuses,
  HitLocationItemData,
  HitLocationTypesEnum,
} from "../data-model/item-data/hitLocationData";
import { CharacterActorData, RqgActorData } from "../data-model/actor-data/rqgActorData";
import { logBug } from "./util";
import { ActorHealthState, actorHealthStatuses } from "../data-model/actor-data/attributes";
import { DeepPartial } from "snowpack";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";

export interface DamageEffects {
  hitLocationUpdates: HitLocationItemData;
  actorUpdates: RqgActorData;
  /** info to the user  */
  notification: string;
  /** make limbs useless */
  uselessLegs: any[];
}

/**
 * Calculate the effects to apply to hitLocations and actor from inflicting damage.
 */
export class DamageCalculations {
  /**
   * Calculate effects of adding `damage` points of damage to `hitLocationData` on actor `actorData`
   * @param damage
   * @param applyDamageToTotalHp
   * @param hitLocationData
   * @param actorData
   */
  public static addWound(
    damage: number,
    applyDamageToTotalHp: boolean,
    hitLocationData: HitLocationItemData,
    actorData: CharacterActorData
  ): DamageEffects {
    if (hitLocationData.data.hitLocationType === HitLocationTypesEnum.Limb) {
      return DamageCalculations.calcLimbDamageEffects(
        hitLocationData,
        damage,
        actorData,
        applyDamageToTotalHp
      );
    } else {
      return DamageCalculations.calcLocationDamageEffects(
        hitLocationData,
        damage,
        actorData,
        applyDamageToTotalHp
      );
    }
  }

  private static applyDamageToActorTotalHp(damage: number, actorData: RqgActorData): RqgActorData {
    const currentTotalHp = actorData.data.attributes.hitPoints.value;
    const actorUpdateData: DeepPartial<RqgActorData> = {
      data: { attributes: { hitPoints: { value: 0 } } },
    };
    if (currentTotalHp) {
      actorUpdateData.data!.attributes!.hitPoints!.value = currentTotalHp - damage;
    } else {
      logBug(`Actor ${actorData.name} don't have a calculated hitpoint value`, actorUpdateData);
    }
    return actorUpdateData as RqgActorData;
  }

  private static calcLimbDamageEffects(
    hitLocationData: HitLocationItemData,
    fullDamage: number,
    actorData: RqgActorData,
    applyDamageToTotalHp: boolean
  ): DamageEffects {
    const damageEffects: DamageEffects = {
      hitLocationUpdates: {} as HitLocationItemData,
      actorUpdates: {} as CharacterActorData,
      notification: "",
      uselessLegs: [],
    };

    if (hitLocationData.data.hitLocationHealthState === "severed") {
      damageEffects.notification = `${hitLocationData.name} is gone and cannot be hit anymore, reroll to get a new hit location!`;
      return damageEffects;
    }
    const maxHp = hitLocationData.data.hp.max;
    if (!maxHp) {
      logBug(`Hit location ${hitLocationData.name} doesn't have a max hp`, hitLocationData);
      return damageEffects;
    }
    const damage = Math.min(maxHp * 2, fullDamage); // Max damage to THP inflicted by limb wound is 2*HP
    const hpValue = hitLocationData.data.hp.value;
    const hpMax = hitLocationData.data.hp.max;
    if (hpValue == null || hpMax == null) {
      logBug(`Hitlocation ${hitLocationData.name} don't have hp value or max`, hitLocationData);
      return damageEffects;
    }

    const actorName = actorData.token?.name || actorData.name;

    // TODO simplify if-structure!
    if (
      damage > 0 &&
      hitLocationHealthStatuses.indexOf(hitLocationData.data.hitLocationHealthState) <
        hitLocationHealthStatuses.indexOf("wounded")
    ) {
      mergeObject(damageEffects.hitLocationUpdates, {
        data: { hitLocationHealthState: "wounded", actorHealthImpact: "wounded" },
      } as any);
    }
    if (
      hpValue - fullDamage <= 0 &&
      hitLocationHealthStatuses.indexOf(hitLocationData.data.hitLocationHealthState) <
        hitLocationHealthStatuses.indexOf("useless")
    ) {
      damageEffects.notification = `${actorName}s ${hitLocationData.name} is useless and cannot hold anything / support standing. You can fight with whatever limbs are still functional.`;
      mergeObject(damageEffects.hitLocationUpdates, {
        data: { hitLocationHealthState: "useless" },
      } as any);
    }
    if (fullDamage >= hpMax * 2) {
      damageEffects.notification = `${actorName} is functionally incapacitated: you can no longer fight until healed and am in shock. You may try to heal yourself.`;
      mergeObject(damageEffects.hitLocationUpdates, {
        data: { hitLocationHealthState: "useless", actorHealthImpact: "shock" },
      } as any);
    }
    if (fullDamage >= hpMax * 3) {
      damageEffects.notification = `${actorName}s ${hitLocationData.name} is severed or irrevocably maimed. Only a 6 point heal applied within ten minutes can restore a severed limb, assuming all parts are available. ${actorName} is functionally incapacitated: and can no longer fight until healed and am in shock. You may try to heal yourself.`;
      mergeObject(damageEffects.hitLocationUpdates, {
        data: { hitLocationHealthState: "severed" },
      } as any);
    }
    const currentLimbDamage = hpMax - hpValue;
    const limbWound = Math.min(hpMax * 2 - currentLimbDamage, damage);
    const wounds = hitLocationData.data.wounds.concat([limbWound]);
    mergeObject(damageEffects.hitLocationUpdates, {
      data: { wounds: wounds },
    } as any);
    if (applyDamageToTotalHp) {
      mergeObject(damageEffects.actorUpdates, this.applyDamageToActorTotalHp(damage, actorData));
    }
    return damageEffects;
  }

  private static calcLocationDamageEffects(
    hitLocationData: HitLocationItemData,
    damage: number,
    actorData: RqgActorData,
    applyDamageToTotalHp: boolean
  ): DamageEffects {
    const damageEffects: DamageEffects = {
      hitLocationUpdates: {} as HitLocationItemData,
      actorUpdates: {} as CharacterActorData,
      notification: "",
      uselessLegs: [],
    };

    const actorName = actorData.token?.name || actorData.name;
    const hpValue = hitLocationData.data.hp.value;
    const hpMax = hitLocationData.data.hp.max;
    if (!hitLocationData.data.hitLocationType) {
      logBug(
        `Hitlocation ${hitLocationData.name} on actor ${actorName} does not have a specified hitLocationType`,
        hitLocationData
      );
      return damageEffects;
    }
    if (hpValue == null || hpMax == null) {
      logBug(`Hitlocation ${hitLocationData.name} don't have hp value or max`, hitLocationData);
      return damageEffects;
    }

    if (damage > 0) {
      mergeObject(damageEffects.hitLocationUpdates, {
        data: {
          actorHealthImpact: "wounded",
          hitLocationHealthState: "wounded",
          wounds: [...hitLocationData.data.wounds, damage],
        },
      } as any);
    }

    // A big hit to Abdomen affects connected limbs, but instant death sized damage should override it
    if (
      hitLocationData.data.hitLocationType === HitLocationTypesEnum.Abdomen &&
      hpValue - damage <= 0 &&
      damage < hpMax * 3
    ) {
      const attachedLimbs = actorData.items.filter(
        (i) => i.type === ItemTypeEnum.HitLocation && i.data.connectedTo === hitLocationData.name
      );
      damageEffects.uselessLegs = attachedLimbs.map((limb) => {
        return {
          _id: limb._id,
          data: {
            hitLocationHealthState: "useless",
          },
        };
      });
      damageEffects.notification = `Both legs are useless and ${actorName} falls to the ground. ${actorName} may fight from the ground in subsequent melee rounds. Will bleed to death, if not healed or treated with First Aid within ten minutes.`;
    }

    if (damage >= hpMax * 3) {
      damageEffects.notification = `${actorName} dies instantly.`;
      mergeObject(damageEffects.hitLocationUpdates, {
        data: { actorHealthImpact: "dead" },
      } as any);
    } else if (damage >= hpMax * 2) {
      damageEffects.notification = `${actorName} becomes unconscious and begins to lose 1 hit point per melee round from bleeding unless healed or treated with First Aid.`;
      mergeObject(damageEffects.hitLocationUpdates, {
        data: { actorHealthImpact: "unconscious" },
      } as any);
    } else if (hpValue - damage <= 0) {
      if (hitLocationData.data.hitLocationType === HitLocationTypesEnum.Head) {
        mergeObject(damageEffects.hitLocationUpdates, {
          data: { actorHealthImpact: "unconscious" },
        } as any);

        damageEffects.notification = `${actorName} is unconscious and must be healed or treated with First Aid within five minutes (one full turn) or die`;
      } else if (hitLocationData.data.hitLocationType === HitLocationTypesEnum.Chest) {
        damageEffects.notification = `${actorName} falls and is too busy coughing blood to do anything. Will bleed to death in ten minutes unless the bleeding is stopped by First Aid, and cannot take any action, including healing.`;
        mergeObject(damageEffects.hitLocationUpdates, {
          data: { actorHealthImpact: "shock" },
        } as any);
      }
    }

    if (applyDamageToTotalHp) {
      mergeObject(damageEffects.actorUpdates, this.applyDamageToActorTotalHp(damage, actorData));
    }
    return damageEffects;
  }

  static getCombinedActorHealth(actorData: RqgActorData): ActorHealthState {
    const healthEffects = actorData.data.attributes.health;
    const totalHitPoints = actorData.data.attributes.hitPoints.value;
    if (totalHitPoints == null) {
      logBug(`Actor hit points value ${totalHitPoints} is missing`, actorData);
      return healthEffects;
    }

    if (totalHitPoints <= 0) {
      return "dead";
    } else if (totalHitPoints <= 2) {
      return "unconscious";
    } else {
      return actorData.items
        .filter((i) => i.type === ItemTypeEnum.HitLocation)
        .map((h) => (h as HitLocationItemData).data.actorHealthImpact)
        .reduce(
          (acc, val) =>
            actorHealthStatuses.indexOf(val) > actorHealthStatuses.indexOf(acc) ? val : acc,
          "healthy"
        );
    }
  }
}

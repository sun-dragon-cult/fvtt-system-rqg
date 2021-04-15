import { HitLocationItemData, HitLocationTypesEnum } from "../data-model/item-data/hitLocationData";
import { logBug } from "./util";
import { CharacterActorData, RqgActorData } from "../data-model/actor-data/rqgActorData";
import { HealthEnum } from "../data-model/actor-data/attributes";

export interface HealingEffects {
  hitLocationUpdates: HitLocationItemData;
  actorUpdates: RqgActorData;
  removeTokenEffects: string[];
  /** make limbs useful again */
  usefulLegs: any[];
}

/**
 * Calculate the effects to apply to hitLocations and actor from healing previous damage.
 */
export class HealingCalculations {
  static healWound(
    healPoints: number,
    healWoundIndex: number,
    hitLocationData: HitLocationItemData,
    actorData: CharacterActorData
  ): HealingEffects {
    const healingEffects: HealingEffects = {
      hitLocationUpdates: {} as HitLocationItemData,
      actorUpdates: {} as CharacterActorData,
      removeTokenEffects: [],
      usefulLegs: [],
    };
    if (hitLocationData.data.wounds.length <= healWoundIndex) {
      logBug(`Trying to heal a wound that doesn't exist.`, healWoundIndex, hitLocationData);
      return healingEffects;
    }

    const hpValue = hitLocationData.data.hp.value;
    const hpMax = hitLocationData.data.hp.max;
    if (hpValue == null || hpMax == null) {
      logBug(`Hitlocation ${hitLocationData.name} don't have hp value or max`, hitLocationData);
      return healingEffects;
    }
    const wounds = hitLocationData.data.wounds.slice();
    let limbHealthState = hitLocationData.data.limbHealthState;

    healPoints = Math.min(wounds[healWoundIndex], healPoints); // Dont' heal more than wound damage
    wounds[healWoundIndex] -= healPoints;
    // mergeObject(healingEffects.hitLocationUpdates, {
    //   data: { wounds: wounds },
    // } as any);

    if (healPoints >= 6 && limbHealthState === "severed") {
      limbHealthState = "wounded"; // Remove the "severed" state, but the actual state will be calculated below
    }

    const woundsSumAfter = wounds.reduce((acc, w) => acc + w, 0);
    if (woundsSumAfter === 0 && limbHealthState !== "severed") {
      limbHealthState = "healthy";
    } else if (woundsSumAfter < hpMax) {
      if (limbHealthState !== "severed") {
        limbHealthState = "wounded";
      }
      // To bring actor out of shock / unconsciousness etc when hit location hp is positive
      mergeObject(healingEffects.actorUpdates, {
        data: { attributes: { health: HealthEnum.Wounded } },
      } as any);
    }

    mergeObject(healingEffects.hitLocationUpdates, {
      data: {
        wounds: wounds,
        limbHealthState: limbHealthState,
      },
    } as any);

    const actorTotalHp = actorData.data.attributes.hitPoints.value;
    const actorMaxHp = actorData.data.attributes.hitPoints.max;
    if (actorTotalHp == null || actorMaxHp == null) {
      logBug(`Couldn't find actor total hp (max or current value)`, actorData);
      return healingEffects;
    }

    const totalHpAfter = Math.min(actorTotalHp + healPoints, actorMaxHp);
    mergeObject(healingEffects.actorUpdates, {
      data: { attributes: { hitPoints: { value: totalHpAfter } } },
    } as any);

    HealingCalculations.actorHealthUpdate(healingEffects.actorUpdates, hitLocationData);
    return healingEffects;
  }

  private static actorHealthUpdate(
    actorUpdateData: DeepPartial<RqgActorData>,
    item: HitLocationItemData
  ): void {
    if (
      (item && item.data.hitLocationType === HitLocationTypesEnum.Limb && item.data.hp.value) ||
      0 > 0
    ) {
      mergeObject(actorUpdateData, {
        data: { attributes: { health: HealthEnum.Wounded } },
      });
    }
  }
}

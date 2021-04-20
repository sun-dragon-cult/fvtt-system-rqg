import { HitLocationItemData, HitLocationTypesEnum } from "../data-model/item-data/hitLocationData";
import { logBug } from "./util";
import { CharacterActorData, RqgActorData } from "../data-model/actor-data/rqgActorData";
import { ActorHealthState } from "../data-model/actor-data/attributes";

export interface HealingEffects {
  hitLocationUpdates: HitLocationItemData;
  actorUpdates: RqgActorData;
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
      usefulLegs: [],
    };
    if (hitLocationData.data.wounds.length <= healWoundIndex) {
      logBug(`Trying to heal a wound that doesn't exist.`, true, healWoundIndex, hitLocationData);
      return healingEffects;
    }

    const hpValue = hitLocationData.data.hp.value;
    const hpMax = hitLocationData.data.hp.max;
    if (hpValue == null || hpMax == null) {
      logBug(
        `Hitlocation ${hitLocationData.name} don't have hp value or max`,
        true,
        hitLocationData
      );
      return healingEffects;
    }
    const wounds = hitLocationData.data.wounds.slice();
    let hitLocationHealthState = hitLocationData.data.hitLocationHealthState || "healthy";
    let actorHealthImpact: ActorHealthState = hitLocationData.data.actorHealthImpact || "healthy";

    if (healPoints >= 6 && hitLocationHealthState === "severed") {
      hitLocationHealthState = "wounded"; // Remove the "severed" state, but the actual state will be calculated below
    }

    healPoints = Math.min(wounds[healWoundIndex], healPoints); // Don't heal more than wound damage
    wounds[healWoundIndex] -= healPoints;

    const woundsSumAfter = wounds.reduce((acc, w) => acc + w, 0);
    if (woundsSumAfter === 0) {
      actorHealthImpact = "healthy";
      if (hitLocationHealthState !== "severed") {
        hitLocationHealthState = "healthy";
      }
    } else if (woundsSumAfter < hpMax) {
      actorHealthImpact = "wounded";
      if (hitLocationHealthState !== "severed") {
        hitLocationHealthState = "wounded";
      }
    }

    mergeObject(healingEffects.hitLocationUpdates, {
      data: {
        wounds: wounds,
        actorHealthImpact: actorHealthImpact,
        hitLocationHealthState: hitLocationHealthState,
      },
    } as any);

    const actorTotalHp = actorData.data.attributes.hitPoints.value;
    const actorMaxHp = actorData.data.attributes.hitPoints.max;
    if (actorTotalHp == null || actorMaxHp == null) {
      logBug(`Couldn't find actor total hp (max or current value)`, true, actorData);
      return healingEffects;
    }

    const totalHpAfter = Math.min(actorTotalHp + healPoints, actorMaxHp);
    mergeObject(healingEffects.actorUpdates, {
      data: { attributes: { hitPoints: { value: totalHpAfter } } },
    } as any);

    return healingEffects;
  }
}

import { ActorHealthState } from "../data-model/actor-data/attributes";
import { assertItemType, RqgError } from "./util";
import {
  HitLocationDataSource,
  HitLocationHealthState,
} from "../data-model/item-data/hitLocationData";
import { CharacterDataSource } from "../data-model/actor-data/rqgActorData";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { ItemDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";
import { RqgActor } from "../actors/rqgActor";
import { RqgItem } from "../items/rqgItem";

export interface HealingEffects {
  /** Updates to the hitlocation item's wounds, health and actor health impact */
  hitLocationUpdates: DeepPartial<HitLocationDataSource>;
  /** Updates to the actor health */
  actorUpdates: DeepPartial<CharacterDataSource>;
  /** Updates to make limbs useful again */
  usefulLegs: DeepPartial<ItemDataConstructorData>[];
}

/**
 * Calculate the effects to apply to hitLocations and actor from healing previous damage.
 */
export class HealingCalculations {
  static healWound(
    healPoints: number,
    healWoundIndex: number,
    hitLocation: RqgItem,
    actor: RqgActor,
  ): HealingEffects {
    assertItemType(hitLocation.type, ItemTypeEnum.HitLocation);
    const healingEffects: HealingEffects = {
      hitLocationUpdates: {},
      actorUpdates: {},
      usefulLegs: [], // Not used yet
    };

    if (!Number.isInteger(healWoundIndex) || hitLocation.system.wounds.length <= healWoundIndex) {
      const msg = `Trying to heal a wound that doesn't exist.`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, healWoundIndex, hitLocation);
    }

    const hpMax = hitLocation.system.hitPoints.max ?? CONFIG.RQG.minTotalHitPoints;
    const wounds = hitLocation.system.wounds.slice();
    let hitLocationHealthState: HitLocationHealthState =
      hitLocation.system.hitLocationHealthState || "healthy";
    let actorHealthImpact: ActorHealthState = hitLocation.system.actorHealthImpact || "healthy";

    if (healPoints >= 6 && hitLocationHealthState === "severed") {
      hitLocationHealthState = "wounded"; // Remove the "severed" state, but the actual state will be calculated below
    }

    healPoints = Math.min(wounds[healWoundIndex], healPoints); // Don't heal more than wound damage
    wounds[healWoundIndex] -= healPoints;

    const woundsSumAfter = wounds.reduce((acc: number, w: number) => acc + w, 0);
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
      system: {
        wounds: wounds,
        actorHealthImpact: actorHealthImpact,
        hitLocationHealthState: hitLocationHealthState,
      },
    });

    const actorTotalHp = actor.system.attributes.hitPoints.value ?? 0;
    const actorMaxHp = actor.system.attributes.hitPoints.max ?? CONFIG.RQG.minTotalHitPoints;

    const totalHpAfter = Math.min(actorTotalHp + healPoints, actorMaxHp);
    mergeObject(healingEffects.actorUpdates, {
      system: { attributes: { hitPoints: { value: totalHpAfter } } },
    });

    return healingEffects;
  }
}

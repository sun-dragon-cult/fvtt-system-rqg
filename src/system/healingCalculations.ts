import { ActorHealthState } from "../data-model/actor-data/attributes";
import { assertItemType, RqgError } from "./util";
import {
  HitLocationDataSource,
  HitLocationHealthState,
} from "../data-model/item-data/hitLocationData";
import { CharacterDataSource } from "../data-model/actor-data/rqgActorData";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ActorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { ItemDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";

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
    hitLocationData: ItemData,
    actorData: ActorData
  ): HealingEffects {
    assertItemType(hitLocationData.type, ItemTypeEnum.HitLocation);
    const healingEffects: HealingEffects = {
      hitLocationUpdates: {},
      actorUpdates: {},
      usefulLegs: [], // Not used yet
    };
    if (hitLocationData.data.wounds.length <= healWoundIndex) {
      const msg = `Trying to heal a wound that doesn't exist.`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, healWoundIndex, hitLocationData);
    }

    const hpValue = hitLocationData.data.hp.value;
    const hpMax = hitLocationData.data.hp.max;
    if (hpValue == null || hpMax == null) {
      const msg = `Hitlocation ${hitLocationData.name} don't have hp value or max`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, hitLocationData);
    }
    const wounds = hitLocationData.data.wounds.slice();
    let hitLocationHealthState: HitLocationHealthState =
      hitLocationData.data.hitLocationHealthState || "healthy";
    let actorHealthImpact: ActorHealthState = hitLocationData.data.actorHealthImpact || "healthy";

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
      data: {
        wounds: wounds,
        actorHealthImpact: actorHealthImpact,
        hitLocationHealthState: hitLocationHealthState,
      },
    });

    const actorTotalHp = actorData.data.attributes.hitPoints.value;
    const actorMaxHp = actorData.data.attributes.hitPoints.max;
    if (actorTotalHp == null || actorMaxHp == null) {
      const msg = `Couldn't find actor total hp (max or current value)`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, actorData);
    }

    const totalHpAfter = Math.min(actorTotalHp + healPoints, actorMaxHp);
    mergeObject(healingEffects.actorUpdates, {
      data: { attributes: { hitPoints: { value: totalHpAfter } } },
    });

    return healingEffects;
  }
}

import type { ActorHealthState } from "../../data-model/actor-data/attributes";
import { assertDocumentSubType, isDocumentSubType, RqgError } from "../../system/util";
import type { HitLocationItem } from "@item-model/hit-location-data-model.ts";
import {
  HitLocationTypesEnum,
  type HitLocationHealthState,
} from "@item-model/hit-location-enums.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "../rqg-item";
import { systemId } from "../../system/config";

import type { DeepPartial } from "fvtt-types/utils";

export interface HealingEffects {
  /** Updates to the hitlocation item's wounds, health and actor health impact */
  hitLocationUpdates: Item.UpdateData;
  /** Updates to the actor health */
  actorUpdates: Actor.UpdateData;
  /** Updates to make limbs useful again */
  usefulLegs: DeepPartial<Item.Source>[];
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
    assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);
    assertDocumentSubType<HitLocationItem>(hitLocation, ItemTypeEnum.HitLocation);
    const healingEffects: HealingEffects = {
      hitLocationUpdates: {},
      actorUpdates: {},
      usefulLegs: [],
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

    if (wounds[healWoundIndex]) {
      healPoints = Math.min(wounds[healWoundIndex], healPoints); // Don't heal more than wound damage
      wounds[healWoundIndex] -= healPoints;
    }

    // Remove healed-out wounds so arrays do not accumulate 0 entries.
    const prunedWounds = wounds.filter((w) => w > 0);

    const woundsSumAfter = prunedWounds.reduce((acc: number, w: number) => acc + w, 0);
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

    // A healed abdomen wound that drops below the useless-legs threshold restores any
    // connected legs that were only made useless by the abdomen wound (not by their own damage).
    if (
      hitLocation.system.hitLocationType === HitLocationTypesEnum.Abdomen &&
      woundsSumAfter < hpMax
    ) {
      const hitLocationRqid = hitLocation.flags?.[systemId]?.documentRqidFlags?.id;
      const connectedLimbs = actor.items.filter(
        (i) =>
          isDocumentSubType<HitLocationItem>(i, ItemTypeEnum.HitLocation) &&
          i.system.connectedTo === hitLocationRqid,
      ) as HitLocationItem[];

      for (const limb of connectedLimbs) {
        if (limb.system.hitLocationHealthState !== "useless") {
          continue;
        }
        const limbHpMax = limb.system.hitPoints.max ?? CONFIG.RQG.minTotalHitPoints;
        const limbDamage = limb.system.wounds.reduce((acc: number, w: number) => acc + w, 0);
        if (limbDamage >= limbHpMax) {
          continue; // Limb is independently useless from its own damage
        }
        healingEffects.usefulLegs.push({
          _id: limb.id ?? "",
          system: {
            hitLocationHealthState: limbDamage === 0 ? "healthy" : "wounded",
          },
        });
      }
    }

    foundry.utils.mergeObject(healingEffects.hitLocationUpdates, {
      system: {
        wounds: prunedWounds,
        actorHealthImpact: actorHealthImpact,
        hitLocationHealthState: hitLocationHealthState,
      },
    });

    const actorTotalHp = actor.system.attributes.hitPoints.value ?? 0;
    const actorMaxHp = actor.system.attributes.hitPoints.max ?? CONFIG.RQG.minTotalHitPoints;

    const totalHpAfter = Math.min(actorTotalHp + healPoints, actorMaxHp);
    foundry.utils.mergeObject(healingEffects.actorUpdates, {
      system: { attributes: { hitPoints: { value: totalHpAfter } } },
    });

    return healingEffects;
  }
}

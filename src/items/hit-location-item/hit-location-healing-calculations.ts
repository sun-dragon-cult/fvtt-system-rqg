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

    if (!Number.isInteger(healWoundIndex) || hitLocation.system.wounds.length <= healWoundIndex) {
      const msg = `Trying to heal a wound that doesn't exist.`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, healWoundIndex, hitLocation);
    }

    const wounds = hitLocation.system.wounds.slice();
    let hitLocationHealthState: HitLocationHealthState =
      hitLocation.system.hitLocationHealthState || "healthy";

    // A single application of 6+ points of magical healing can restore a severed limb (Core
    // p.148: "Only a 6-point Heal spell... can restore a severed limb"). Natural healing
    // (healLocationNaturally) never does this - RAW ties it specifically to a burst of magical
    // healing, not gradual weekly recovery.
    if (healPoints >= 6 && hitLocationHealthState === "severed") {
      hitLocationHealthState = "wounded"; // the actual state will be recalculated below
    }

    let healPointsApplied = 0;
    if (wounds[healWoundIndex]) {
      healPointsApplied = Math.min(wounds[healWoundIndex], healPoints); // Don't heal more than wound damage
      wounds[healWoundIndex] -= healPointsApplied;
    }

    return HealingCalculations.applyHealedWounds(
      wounds,
      healPointsApplied,
      hitLocationHealthState,
      hitLocation,
      actor,
    );
  }

  /**
   * Natural healing (#436, Core p.148-149): distribute `weeklyHealPoints` across all of
   * `hitLocation`'s wounds - "spread evenly among those wounds, with any additional points going
   * to the lightest injury." Unlike healWound, never restores a severed/useless location's
   * *function*: Core p.148 is explicit that such a location's hit points can still be restored by
   * any healing, but only magic capable of regrowing limbs restores its use - so this never
   * applies healWound's >=6-point un-sever exception, which is specific to a burst of magical
   * healing, not gradual natural recovery.
   */
  static healLocationNaturally(
    weeklyHealPoints: number,
    hitLocation: RqgItem,
    actor: RqgActor,
  ): HealingEffects {
    assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);
    assertDocumentSubType<HitLocationItem>(hitLocation, ItemTypeEnum.HitLocation);

    const wounds = hitLocation.system.wounds.slice();
    if (wounds.length === 0 || weeklyHealPoints <= 0) {
      return { hitLocationUpdates: {}, actorUpdates: {}, usefulLegs: [] };
    }

    const share = Math.floor(weeklyHealPoints / wounds.length);
    const remainder = weeklyHealPoints - share * wounds.length;
    let lightestWoundIndex = 0;
    for (let i = 1; i < wounds.length; i++) {
      if ((wounds[i] ?? 0) < (wounds[lightestWoundIndex] ?? 0)) {
        lightestWoundIndex = i;
      }
    }

    let healPointsApplied = 0;
    for (let i = 0; i < wounds.length; i++) {
      const woundShare = share + (i === lightestWoundIndex ? remainder : 0);
      const applied = Math.min(wounds[i] ?? 0, woundShare);
      wounds[i] = (wounds[i] ?? 0) - applied;
      healPointsApplied += applied;
    }

    const hitLocationHealthState: HitLocationHealthState =
      hitLocation.system.hitLocationHealthState || "healthy";

    return HealingCalculations.applyHealedWounds(
      wounds,
      healPointsApplied,
      hitLocationHealthState,
      hitLocation,
      actor,
    );
  }

  /**
   * Shared tail for both healing paths above: prune healed-out wounds, derive
   * hitLocationHealthState/actorHealthImpact (never un-severing on its own - callers that want
   * that, i.e. healWound's magical >=6-point exception, must pre-adjust hitLocationHealthState
   * before calling this), restore connected "useless" legs when an abdomen heals below its
   * useless-threshold, and bump the actor's aggregate hitPoints.value.
   */
  private static applyHealedWounds(
    wounds: number[],
    healPointsApplied: number,
    hitLocationHealthState: HitLocationHealthState,
    hitLocation: RqgItem,
    actor: RqgActor,
  ): HealingEffects {
    assertDocumentSubType<HitLocationItem>(hitLocation, ItemTypeEnum.HitLocation);
    const healingEffects: HealingEffects = {
      hitLocationUpdates: {},
      actorUpdates: {},
      usefulLegs: [],
    };

    const hpMax = hitLocation.system.hitPoints.max ?? CONFIG.RQG.minTotalHitPoints;
    let actorHealthImpact: ActorHealthState = hitLocation.system.actorHealthImpact || "healthy";

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

    const totalHpAfter = Math.min(actorTotalHp + healPointsApplied, actorMaxHp);
    foundry.utils.mergeObject(healingEffects.actorUpdates, {
      system: { attributes: { hitPoints: { value: totalHpAfter } } },
    });

    return healingEffects;
  }
}

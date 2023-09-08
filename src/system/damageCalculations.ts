import {
  HitLocationDataProperties,
  hitLocationHealthStatuses,
  HitLocationTypesEnum,
} from "../data-model/item-data/hitLocationData";
import { RqgActorDataProperties } from "../data-model/actor-data/rqgActorData";
import { ActorHealthState, actorHealthStatuses } from "../data-model/actor-data/attributes";
import { DeepPartial } from "snowpack";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { assertItemType, RqgError } from "./util";
import { RqgItem } from "../items/rqgItem";
import { RqgActor } from "../actors/rqgActor";

export interface DamageEffects {
  hitLocationUpdates: DeepPartial<HitLocationDataProperties>;
  actorUpdates: DeepPartial<RqgActorDataProperties>;
  /** info to the user  */
  notification: string;
  /** make limbs useless */
  uselessLegs: DeepPartial<HitLocationDataProperties>[];
}

/**
 * Calculate the effects to apply to hitLocations and actor from inflicting damage.
 */
export class DamageCalculations {
  /**
   * Calculate effects of adding `damage` points of damage to `hitLocationData` on actor `actorData`
   */
  public static addWound(
    damage: number,
    applyDamageToTotalHp: boolean,
    hitLocation: RqgItem,
    actor: RqgActor,
    speakerName: string,
  ): DamageEffects {
    assertItemType(hitLocation.type, ItemTypeEnum.HitLocation);

    if (hitLocation.system.hitLocationType === HitLocationTypesEnum.Limb) {
      return DamageCalculations.calcLimbDamageEffects(
        hitLocation,
        damage,
        actor,
        applyDamageToTotalHp,
        speakerName,
      );
    } else {
      return DamageCalculations.calcLocationDamageEffects(
        hitLocation,
        damage,
        actor,
        applyDamageToTotalHp,
        speakerName,
      );
    }
  }

  private static applyDamageToActorTotalHp(damage: number, actor: RqgActor): DeepPartial<RqgActor> {
    if (actor.system.attributes.hitPoints.max != null) {
      const currentTotalHp = actor.system.attributes.hitPoints.value;
      const actorUpdateData: DeepPartial<RqgActor> = {
        system: { attributes: { hitPoints: { value: 0 } } },
      };
      if (currentTotalHp == null) {
        const msg = `Actor ${actor.name} don't have a calculated hitpoint value`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, actorUpdateData);
      }
      actorUpdateData.system!.attributes!.hitPoints!.value = currentTotalHp - damage;
      return actorUpdateData;
    }

    return {} as DeepPartial<RqgActor>;
  }

  private static calcLimbDamageEffects(
    hitLocation: RqgItem,
    fullDamage: number,
    actor: RqgActor,
    applyDamageToTotalHp: boolean,
    speakerName: string,
  ): DamageEffects {
    assertItemType(hitLocation.type, ItemTypeEnum.HitLocation);
    const damageEffects: DamageEffects = {
      hitLocationUpdates: {},
      actorUpdates: {},
      notification: "",
      uselessLegs: [],
    };

    if (hitLocation.system.hitLocationHealthState === "severed") {
      damageEffects.notification = `${hitLocation.name} is gone and cannot be hit anymore, reroll to get a new hit location!`;
      return damageEffects;
    }
    const maxHp = hitLocation.system.hitPoints.max;
    if (maxHp == null) {
      const msg = `Hit location ${hitLocation.name} doesn't have a max hp`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, hitLocation);
    }
    const damage = Math.min(maxHp * 2, fullDamage); // Max damage to THP inflicted by limb wound is 2*HP
    const hpValue = hitLocation.system.hitPoints.value;
    const hpMax = hitLocation.system.hitPoints.max;
    if (hpValue == null || hpMax == null) {
      const msg = `Hitlocation ${hitLocation.name} don't have hp value or max`;
      ui.notifications?.error(msg);
      throw new RqgError(msg);
    }
    const totalDamage = hpMax - hpValue + damage;

    // TODO simplify if-structure!
    if (
      totalDamage > 0 &&
      hitLocationHealthStatuses.indexOf(hitLocation.system.hitLocationHealthState) <
        hitLocationHealthStatuses.indexOf("wounded")
    ) {
      mergeObject(damageEffects.hitLocationUpdates, {
        system: { hitLocationHealthState: "wounded", actorHealthImpact: "wounded" },
      } as any);
    }
    if (
      totalDamage >= hpMax &&
      hitLocationHealthStatuses.indexOf(hitLocation.system.hitLocationHealthState) <
        hitLocationHealthStatuses.indexOf("useless")
    ) {
      damageEffects.notification = `${speakerName}'s ${hitLocation.name} is useless and cannot hold anything / support standing. ${speakerName} can still fight with whatever limbs are still functional.`;
      mergeObject(damageEffects.hitLocationUpdates, {
        system: { hitLocationHealthState: "useless" },
      } as any);
    }
    if (fullDamage >= hpMax * 2) {
      damageEffects.notification = `${speakerName} is functionally incapacitated, can no longer fight until healed and is in shock. Self healing may be attempted.`;
      mergeObject(damageEffects.hitLocationUpdates, {
        system: { hitLocationHealthState: "useless", actorHealthImpact: "shock" },
      } as any);
    }
    if (fullDamage >= hpMax * 3) {
      damageEffects.notification = `${speakerName}'s ${hitLocation.name} is severed or irrevocably maimed. Only a 6 point heal applied within ten minutes can restore a severed limb, assuming all parts are available. ${speakerName} is functionally incapacitated and can no longer fight until healed and is in shock. Self healing is still possible.`;
      mergeObject(damageEffects.hitLocationUpdates, {
        system: { hitLocationHealthState: "severed" },
      } as any);
    }
    const currentLimbDamage = hpMax - hpValue;
    const limbWound = Math.min(hpMax * 2 - currentLimbDamage, damage);
    const wounds = hitLocation.system.wounds.concat([limbWound]);
    mergeObject(damageEffects.hitLocationUpdates, {
      system: { wounds: wounds },
    } as any);
    if (applyDamageToTotalHp) {
      mergeObject(damageEffects.actorUpdates, this.applyDamageToActorTotalHp(damage, actor));
    }
    return damageEffects;
  }

  private static calcLocationDamageEffects(
    hitLocation: RqgItem,
    damage: number,
    actor: RqgActor,
    applyDamageToTotalHp: boolean,
    speakerName: string,
  ): DamageEffects {
    const damageEffects: DamageEffects = {
      hitLocationUpdates: {},
      actorUpdates: {},
      notification: "",
      uselessLegs: [],
    };
    assertItemType(hitLocation.type, ItemTypeEnum.HitLocation);
    const hpValue = hitLocation.system.hitPoints.value;
    const hpMax = hitLocation.system.hitPoints.max;
    if (!hitLocation.system.hitLocationType) {
      const msg = `Hitlocation ${hitLocation.name} on actor ${speakerName} does not have a specified hitLocationType`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, hitLocation);
    }
    if (hpValue == null || hpMax == null) {
      const msg = `Hitlocation ${hitLocation.name} don't have hp value or max`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, hitLocation);
    }
    const totalDamage = hpMax - hpValue + damage;

    if (totalDamage > 0) {
      mergeObject(damageEffects.hitLocationUpdates, {
        system: {
          actorHealthImpact: "wounded",
          hitLocationHealthState: "wounded",
          wounds: [...hitLocation.system.wounds, damage],
        },
      } as any);
    }

    // A big hit to Abdomen affects connected limbs, but instant death sized damage should override it
    if (
      hitLocation.system.hitLocationType === HitLocationTypesEnum.Abdomen &&
      totalDamage >= hpMax &&
      totalDamage < hpMax * 3
    ) {
      const attachedLimbs = actor.items.filter(
        (i: RqgItem) =>
          i.type === ItemTypeEnum.HitLocation && i.system.connectedTo === hitLocation.name,
      );
      damageEffects.uselessLegs = attachedLimbs.map((limb) => {
        return {
          _id: limb.id,
          system: {
            hitLocationHealthState: "useless",
          },
        };
      });
      damageEffects.notification = `Both legs are useless and ${speakerName} falls to the ground. ${speakerName} may fight from the ground in subsequent melee rounds. Will bleed to death, if not healed or treated with First Aid within ten minutes.`;
    }

    if (totalDamage >= hpMax * 3) {
      damageEffects.notification = `${speakerName} dies instantly.`;
      mergeObject(damageEffects.hitLocationUpdates, {
        system: { actorHealthImpact: "dead" },
      } as any);
    } else if (totalDamage >= hpMax * 2) {
      damageEffects.notification = `${speakerName} becomes unconscious and begins to lose 1 hit point per melee round from bleeding unless healed or treated with First Aid.`;
      mergeObject(damageEffects.hitLocationUpdates, {
        system: { actorHealthImpact: "unconscious" },
      } as any);
    } else if (totalDamage >= hpMax) {
      if (hitLocation.system.hitLocationType === HitLocationTypesEnum.Head) {
        mergeObject(damageEffects.hitLocationUpdates, {
          system: { actorHealthImpact: "unconscious" },
        } as any);

        damageEffects.notification = `${speakerName} is unconscious and must be healed or treated with First Aid within five minutes (one full turn) or die`;
      } else if (hitLocation.system.hitLocationType === HitLocationTypesEnum.Chest) {
        damageEffects.notification = `${speakerName} falls and is too busy coughing blood to do anything. Will bleed to death in ten minutes unless the bleeding is stopped by First Aid, and cannot take any action, including healing.`;
        mergeObject(damageEffects.hitLocationUpdates, {
          system: { actorHealthImpact: "shock" },
        } as any);
      }
    }

    if (applyDamageToTotalHp) {
      mergeObject(damageEffects.actorUpdates, this.applyDamageToActorTotalHp(damage, actor));
    }
    return damageEffects;
  }

  static getCombinedActorHealth(actor: RqgActor): ActorHealthState {
    const maxHitPoints = actor.system.attributes.hitPoints.max;

    const currentMagicPoints = actor.system.attributes.magicPoints.value || 0;

    if (maxHitPoints == null) {
      return "healthy";
    }
    const totalHitPoints = actor.system.attributes.hitPoints.value;
    if (totalHitPoints == null) {
      const msg = `Actor hit points value ${totalHitPoints} is missing in actor ${actor.name}`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, actor);
    }
    const baseHealth: ActorHealthState = totalHitPoints < maxHitPoints ? "wounded" : "healthy";

    if (totalHitPoints <= 0) {
      return "dead";
    } else if (totalHitPoints <= 2) {
      return "unconscious";
    } else if (currentMagicPoints <= 0) {
      return "unconscious";
    } else {
      return actor.items.reduce((acc: ActorHealthState, item: RqgItem) => {
        if (item.type !== ItemTypeEnum.HitLocation) {
          return acc;
        } else {
          const actorHealthImpact = item.system.actorHealthImpact;
          return actorHealthStatuses.indexOf(actorHealthImpact) > actorHealthStatuses.indexOf(acc)
            ? actorHealthImpact
            : acc;
        }
      }, baseHealth);
    }
  }
}

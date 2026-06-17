import { DamageCalculations } from "./hit-location-damage-calculations";
import { HealingCalculations, type HealingEffects } from "./hit-location-healing-calculations";
import { assertDocumentSubType } from "../../system/util";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data.ts";
import type { HitLocationItem } from "@item-model/hit-location-data-model.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "../rqg-item";

export function applyTestDamage(
  damage: number,
  applyDamageToTotalHp: boolean,
  hitLocation: HitLocationItem,
  actor: CharacterActor,
) {
  const damageEffects = DamageCalculations.addWound(
    damage,
    applyDamageToTotalHp,
    hitLocation,
    actor,
    { alias: "Pelle Plutt" } as ChatMessage.SpeakerData,
  );
  foundry.utils.mergeObject(hitLocation, damageEffects.hitLocationUpdates);
  foundry.utils.mergeObject(actor, damageEffects.actorUpdates);
  actor.system.attributes.health = DamageCalculations.getCombinedActorHealth(actor);
  hitLocation.system.hitPoints.value =
    hitLocation.system.hitPoints.max! -
    hitLocation.system.wounds.reduce((acc: number, val: number) => acc + val, 0);
  return damageEffects;
}

export function applyTestHealing(
  healPoints: number,
  healWoundIndex: number,
  hitLocation: RqgItem,
  actor: RqgActor,
): HealingEffects {
  assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);
  assertDocumentSubType<HitLocationItem>(hitLocation, ItemTypeEnum.HitLocation);
  const healingEffects = HealingCalculations.healWound(
    healPoints,
    healWoundIndex,
    hitLocation,
    actor,
  );
  foundry.utils.mergeObject(hitLocation, healingEffects.hitLocationUpdates);
  foundry.utils.mergeObject(actor, healingEffects.actorUpdates);
  actor.system.attributes.health = DamageCalculations.getCombinedActorHealth(actor);
  hitLocation.system.hitPoints.value =
    hitLocation.system.hitPoints.max! -
    hitLocation.system.wounds.reduce((acc: number, val: number) => acc + val, 0);
  return healingEffects;
}

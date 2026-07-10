import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { HitLocationItem } from "@item-model/hit-location-data-model.ts";
import { damageType, type DamageType } from "@item-model/weapon-enums.ts";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data.ts";
import { assertDocumentSubType, localize, requireValue } from "../../system/util";
import { HealingCalculations } from "./hit-location-healing-calculations";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "../rqg-item";

export type ApplyWoundToHitLocationOptions = {
  subtractArmorPoints?: boolean;
  applyDamageToTotalHp?: boolean;
  damageType?: DamageType;
  wasDamagedReducedByParry?: boolean;
  attackSuccessLevel?: AbilitySuccessLevelEnum;
};

export async function applyWoundToHitLocation(
  item: RqgItem,
  damage: number,
  options: ApplyWoundToHitLocationOptions = {},
): Promise<void> {
  assertDocumentSubType<HitLocationItem>(item, ItemTypeEnum.HitLocation);
  if (!Number.isFinite(damage) || damage < 0) {
    return;
  }

  const actor = item.parent as RqgActor | undefined;
  assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);

  const subtractArmorPoints = options.subtractArmorPoints ?? true;
  const applyDamageToTotalHp = options.applyDamageToTotalHp ?? true;

  await actor.applyDamage(
    damage,
    item.system.dieFrom,
    !subtractArmorPoints,
    applyDamageToTotalHp,
    options.damageType ?? damageType.Impale,
    options.wasDamagedReducedByParry ?? false,
    options.attackSuccessLevel,
  );
}

export async function healWoundOnHitLocation(
  item: RqgItem,
  healWoundIndex: number,
  healPoints: number,
): Promise<boolean> {
  assertDocumentSubType<HitLocationItem>(item, ItemTypeEnum.HitLocation);
  const actor = item.parent as RqgActor | undefined;
  assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);

  requireValue(
    item.system.hitPoints.value,
    localize("RQG.Item.HitLocation.Notification.NoValueOnHitLocation", {
      hitLocationName: item.name,
    }),
  );
  requireValue(
    item.system.hitPoints.max,
    localize("RQG.Item.HitLocation.Notification.NoMaxOnHitLocation", {
      hitLocationName: item.name,
    }),
  );

  const { hitLocationUpdates, actorUpdates, usefulLegs } = HealingCalculations.healWound(
    healPoints,
    healWoundIndex,
    item,
    actor,
  );

  if (hitLocationUpdates) {
    await item.update(hitLocationUpdates as any);
  }
  if (actorUpdates) {
    await actor.update(actorUpdates as any);
  }

  for (const update of usefulLegs) {
    if (update != null && update._id != null) {
      const usefulLeg = actor.items.get(update._id);
      if (usefulLeg) {
        await usefulLeg.update(update as any);
      }
    }
  }

  const updatedWounds = (hitLocationUpdates as any)?.system?.wounds;
  if (Array.isArray(updatedWounds)) {
    return updatedWounds.length > 0;
  }

  const currentWounds = item.system.wounds;
  return Array.isArray(currentWounds) && currentWounds.length > 0;
}

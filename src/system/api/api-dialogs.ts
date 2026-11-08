import type { RqgActor } from "@actors/rqg-actor.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { AddWoundInitial } from "../../items/hit-location-item/hit-location-add-wound-dialog";
import {
  showHitLocationAddWoundDialog,
  showHitLocationHealWoundDialog,
} from "../../items/hit-location-item/hit-location-wound-dialogs";
import { type ActorRef, type ItemRef, resolveActor, resolveItem } from "./api-resolve";

/** @public since 6.2.0 */
export type WoundDialogOptions = {
  /** Defaults to the hit location's actor, else the selected token or assigned character */
  actor?: ActorRef;
};

/** @public since 6.2.0 */
export type AddWoundOptions = WoundDialogOptions & AddWoundInitial;

/**
 * Open the Add Wound dialog for one of the actor's hit locations, as the sheet does, starting with
 * the given damage and toggles.
 */
export async function addWound(hitLocation: ItemRef, options: AddWoundOptions = {}): Promise<void> {
  const { actor: actorRef, ...initial } = options;
  const actor = woundedActor(hitLocation, actorRef);
  const item = resolveItem(actor, hitLocation, [ItemTypeEnum.HitLocation]);
  await showHitLocationAddWoundDialog(actor, item.id ?? "", initial);
}

/** Open the Heal Wounds dialog for the actor, with `hitLocation` (if given) picked. */
export async function healWounds(
  hitLocation?: ItemRef,
  options: WoundDialogOptions = {},
): Promise<void> {
  const actor = woundedActor(hitLocation, options.actor);
  const item =
    hitLocation == null ? undefined : resolveItem(actor, hitLocation, [ItemTypeEnum.HitLocation]);
  await showHitLocationHealWoundDialog(actor, item?.id ?? "");
}

function woundedActor(hitLocation: ItemRef | undefined, actorRef: ActorRef | undefined): RqgActor {
  if (actorRef == null && hitLocation != null && typeof hitLocation !== "string") {
    const owner = hitLocation.actor as RqgActor | null;
    if (owner) {
      return owner;
    }
  }
  return resolveActor(actorRef).actor;
}

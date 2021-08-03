import { RqgActorData } from "../../data-model/actor-data/rqgActorData";

// Return an array of active Effects Ids to be deleted because Armor is no longer calculated as an AE
export function removeArmorActiveEffects(actorData: RqgActorData): string[] {
  return actorData.effects
    ? actorData.effects.filter((e: any) => e.label === "Armor").map((e) => e._id)
    : [];
}

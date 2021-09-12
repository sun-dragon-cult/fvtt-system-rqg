import { ActorDataSource } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";

// TODO Remove this migration
// Return an array of active Effects Ids to be deleted because Armor is no longer calculated as an AE
export function removeArmorActiveEffects(actorData: Partial<ActorDataSource>): string[] {
  return (
    actorData?.effects
      ?.filter((e) => e.label === "Armor")
      .map((e) => e._id ?? "")
      .filter((e) => !!e) || []
  );
  // TODO  why is ?? "" needed - can't filter out null?
}

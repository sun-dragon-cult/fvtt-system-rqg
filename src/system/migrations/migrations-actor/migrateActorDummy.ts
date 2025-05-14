import type { ActorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";
import { ActorTypeEnum } from "../../../data-model/actor-data/rqgActorData";
import { ActorUpdate } from "../applyMigrations";

// Dummy Actor Migrator
export function migrateActorDummy(actorData: ActorData): ActorUpdate {
  let updateData = {};
  // eslint-disable-next-line
  if (false && actorData.type === ActorTypeEnum.Character) {
    updateData = {
      system: {
        background: {
          // @ts-expect-errors system ???
          species: (actorData.background as any).race,
          [`-=race`]: null,
        },
      },
    };
  }
  return updateData;
}

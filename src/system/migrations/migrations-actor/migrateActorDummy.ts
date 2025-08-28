import { ActorTypeEnum } from "../../../data-model/actor-data/rqgActorData";
import type { ActorUpdate } from "../applyMigrations";

// Dummy Actor Migrator
export function migrateActorDummy(actorData: ActorData): ActorUpdate {
  let updateData = {};
  // eslint-disable-next-line
  if (false && actorData.type === ActorTypeEnum.Character) {
    updateData = {
      system: {
        background: {
          species: (actorData.background as any).race,
          [`-=race`]: null,
        },
      },
    };
  }
  return updateData;
}

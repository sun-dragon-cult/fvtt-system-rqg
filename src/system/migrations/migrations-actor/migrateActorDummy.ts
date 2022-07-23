import { ActorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";
import { ActorTypeEnum } from "../../../data-model/actor-data/rqgActorData";
import { deleteKeyPrefix } from "../../util";
import { ActorUpdate } from "../applyMigrations";

// Dummy Actor Migrator
export function migrateActorDummy(actorData: ActorData): ActorUpdate {
  let updateData = {};
  if (false && actorData.type === ActorTypeEnum.Character) {
    updateData = {
      data: {
        background: {
          species: (actorData.data.background as any).race,
          [`${deleteKeyPrefix}race`]: null,
        },
      },
    };
  }
  return updateData;
}

import { ActorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";
import { ActorUpdate } from "../migrate";
import { ActorTypeEnum } from "../../data-model/actor-data/rqgActorData";
import { deleteKeyPrefix } from "../util";

// Rename background.race => background.species
export function migrateRenameCharacterRace(actorData: ActorData): ActorUpdate {
  let updateData = {};
  if (
    actorData.type === ActorTypeEnum.Character &&
    (actorData.data?.background as any)?.race != null
  ) {
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

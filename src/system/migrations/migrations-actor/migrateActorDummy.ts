import {
  ActorTypeEnum,
  type CharacterActor,
  type RqgActorDataSource,
} from "../../../data-model/actor-data/rqgActorData";
import { isDocumentSubType } from "../../util.ts";

// Dummy Actor Migrator

export function migrateActorDummy(actorData: RqgActorDataSource): Actor.UpdateData {
  let updateData: Actor.UpdateData = {};

  if (isDocumentSubType<CharacterActor>(actorData as any, ActorTypeEnum.Character)) {
    updateData = {
      system: {
        background: {
          species: (actorData.system.background as any).race,
          [`-=race`]: null,
        },
      },
    };
  }
  return updateData;
}

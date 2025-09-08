import {
  ActorTypeEnum,
  type CharacterActor,
  type RqgActorDataSource,
} from "../../../data-model/actor-data/rqgActorData";
import { assertDocumentSubType, isDocumentSubType } from "../../util.ts";

// Dummy Actor Migrator
export function migrateActorDummy(actorData: RqgActorDataSource): Actor.UpdateData {
  let updateData = {};
  // eslint-disable-next-line
  if (false && isDocumentSubType<CharacterActor>(actorData as any, ActorTypeEnum.Character)) {
    assertDocumentSubType<CharacterActor>(actorData as any, ActorTypeEnum.Character);
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

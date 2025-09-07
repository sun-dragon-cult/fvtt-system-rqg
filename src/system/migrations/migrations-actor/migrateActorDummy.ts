import {
  ActorTypeEnum,
  type CharacterActor,
  type RqgActorDataSource,
} from "../../../data-model/actor-data/rqgActorData";
import { assertDocumentSubType } from "../../util.ts";

// Dummy Actor Migrator
export function migrateActorDummy(actorData: RqgActorDataSource): Actor.UpdateData {
  let updateData = {};
  // eslint-disable-next-line
  if (false && actorData.type === ActorTypeEnum.Character.toString()) {
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

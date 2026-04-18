import { ActorTypeEnum, type CharacterActor } from "../../../data-model/actor-data/rqgActorData";
import { isDocumentSubType } from "../../util.ts";
import type { RqgActor } from "@actors/rqgActor.ts";

// Dummy Actor Migrator

export function migrateActorDummy(actorData: RqgActor): Actor.UpdateData {
  let updateData: Actor.UpdateData = {};

  // eslint-disable-next-line no-constant-condition, no-constant-binary-expression
  if (false && isDocumentSubType<CharacterActor>(actorData as any, ActorTypeEnum.Character)) {
    updateData = {
      system: {
        background: {
          species: (actorData.system.background as any).race,
          [`-=race`]: null,
        },
      },
    } as any; // Migration uses Foundry's `-=field` delete syntax which doesn't exist in DataModel types
  }
  return updateData;
}

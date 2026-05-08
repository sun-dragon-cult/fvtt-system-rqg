import { ActorTypeEnum, type CharacterActor } from "../../../data-model/actor-data/rqgActorData";
import { isDocumentSubType } from "../../util.ts";
import type { RqgActor } from "@actors/rqgActor.ts";

// Dummy Actor Migrator

export function migrateActorDummy(actorData: RqgActor): Actor.UpdateData {
  let updateData: Actor.UpdateData = {};

  // eslint-disable-next-line no-constant-condition, no-constant-binary-expression
  if (false && isDocumentSubType<CharacterActor>(actorData, ActorTypeEnum.Character)) {
    const race = (actorData.system.background as { race?: string }).race;
    const backgroundUpdate: Record<string, unknown> = {
      species: race,
      race: _del,
    };
    updateData = {
      system: {
        background: backgroundUpdate,
      },
    } as Actor.UpdateData;
  }
  return updateData;
}

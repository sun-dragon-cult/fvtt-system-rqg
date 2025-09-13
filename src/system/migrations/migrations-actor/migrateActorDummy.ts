import { type RqgActorDataSource } from "../../../data-model/actor-data/rqgActorData";

// Dummy Actor Migrator
export function migrateActorDummy(actorData: RqgActorDataSource): Actor.UpdateData {
  const updateData = {};

  // if (isDocumentSubType<CharacterActor>(actorData as any, ActorTypeEnum.Character)) {
  //   updateData = {
  //     system: {
  //       background: {
  //         species: (actorData.system.background as any).race,
  //         [`-=race`]: null,
  //       },
  //     },
  //   };
  // }
  return updateData;
}

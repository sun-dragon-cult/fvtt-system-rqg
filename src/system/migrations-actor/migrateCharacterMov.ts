import { ActorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";
import { ActorUpdate } from "../migrate";
import { ActorTypeEnum } from "../../data-model/actor-data/rqgActorData";
import { LocomotionEnum } from "../../data-model/actor-data/attributes";
import { deleteKeyPrefix } from "../util";

// Refactor MOV / Locomotion
export function migrateCharacterMov(actorData: ActorData): ActorUpdate {
  if (
    actorData.type === ActorTypeEnum.Character &&
    (getType(actorData.data?.attributes?.move) === "number" ||
      actorData.data?.attributes?.move == null)
  ) {
    const previousMove: number = (actorData.data?.attributes?.move as unknown as number) ?? 8;
    const swimMove = (actorData.data?.background as any)?.race === "Human" ? 2 : undefined;
    return {
      data: {
        attributes: {
          move: {
            currentLocomotion: LocomotionEnum.Walk,
            [LocomotionEnum.Walk]: { value: previousMove, carryingFactor: 1 },
            [LocomotionEnum.Swim]: { value: swimMove, carryingFactor: 0.5 },
            [LocomotionEnum.Fly]: { value: undefined, carryingFactor: undefined },
          },
          [`${deleteKeyPrefix}maximumEncumbrance`]: null,
          [`${deleteKeyPrefix}equippedEncumbrance`]: null,
          [`${deleteKeyPrefix}travelEncumbrance`]: null,
        },
      },
    };
  }
  return {};
}

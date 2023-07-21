import { defaultResource, Resource } from "../shared/resource";

export const actorHealthStatuses = ["healthy", "wounded", "shock", "unconscious", "dead"] as const;
export type ActorHealthState = (typeof actorHealthStatuses)[number];

export enum LocomotionEnum {
  Walk = "walk",
  Swim = "swim",
  Fly = "fly",
}

// Values calculated in RqgActor.prepareData with help from RqgCalculations
export class Attributes {
  constructor(
    public magicPoints: Resource,
    public hitPoints: Resource,

    public move: {
      currentLocomotion: LocomotionEnum;
      [LocomotionEnum.Walk]: { value: number | undefined; carryingFactor: number | undefined }; // 8 & 1 for humans
      [LocomotionEnum.Swim]: { value: number | undefined; carryingFactor: number | undefined }; // 4 & 0,5 for humans
      [LocomotionEnum.Fly]: { value: number | undefined; carryingFactor: number | undefined }; // undefined for humans
      /** Derived: move[move.currentLocomotion].value - travelEncumbrancePenalty */
      travel?: number;
      /** Derived: move[move.currentLocomotion].value - equippedEncumbrancePenalty */
      equipped?: number;
      /** Derived: move[move.currentLocomotion].value */
      value?: number;
    },
    public heroPoints: number,
    /** If true then skill category modifiers are all 0. Useful for dinosaurs etc. to set reasonable skill values. */
    public isCreature: boolean,
    public health: ActorHealthState,
    public encumbrance?: {
      max: number; // Math.round(Math.min(str, (str + con) / 2)) * move[move.currentLocomotion].carryingFactor
      travel: number; // sum all carried
      equipped: number; // sum all equipped
    },
    public healingRate?: number,
    public damageBonus?: string, // For example "1d4"
    public spiritCombatDamage?: string, // For example "1d4"
    public sizStrikeRank?: number,
    public dexStrikeRank?: number,
  ) {}
}

export const defaultAttributes = new Attributes(
  defaultResource,
  defaultResource,
  {
    currentLocomotion: LocomotionEnum.Walk,
    [LocomotionEnum.Walk]: {
      value: 8,
      carryingFactor: 1,
    },
    [LocomotionEnum.Swim]: {
      value: 2,
      carryingFactor: 0.5,
    },
    [LocomotionEnum.Fly]: {
      value: undefined,
      carryingFactor: undefined,
    },
  },
  0,
  false,
  "healthy",
);

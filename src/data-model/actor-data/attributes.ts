import { emptyResource, Resource } from "../shared/resource";

export const actorHealthStatuses = ["healthy", "wounded", "shock", "unconscious", "dead"] as const;
export type ActorHealthState = typeof actorHealthStatuses[number];

// Values calculated in RqgActor.prepareData with help from RqgCalculations
export class Attributes {
  constructor(
    public magicPoints: Resource,
    public hitPoints: Resource,
    public move: number, // 8 for humans
    public heroPoints: number,
    public health: ActorHealthState,
    public healingRate?: number,
    public damageBonus?: string, // For example "1d4"
    public spiritCombatDamage?: string, // For example "1d4"
    public maximumEncumbrance?: number,
    public equippedEncumbrance?: number,
    public travelEncumbrance?: number,
    public sizStrikeRank?: number,
    public dexStrikeRank?: number
  ) {}
}

export const emptyAttributes = new Attributes(emptyResource, emptyResource, 8, 0, "healthy");

import { emptyResource, Resource } from "../shared/resource";

export class Attributes {
  constructor(
    public magicPoints: Resource, // Max added by ActorSheet.prepareData
    public hitPoints: Resource, // Max added by ActorSheet.prepareData
    public healingRate?: number, // Added by ActorSheet.prepareData
    public damageBonus?: string, // For example "1D4" Added by ActorSheet.prepareData
    public spiritCombatDamage?: string, // Added by ActorSheet.prepareData
    public maximumEncumbrance?: number, // Added by ActorSheet.prepareData
    public sizStrikeRank?: number, // Added by ActorSheet.prepareData
    public dexStrikeRank?: number, // Added by ActorSheet.prepareData
    public movementRate?: number // Added by ActorSheet.prepareData
  ) {}
}

export const emptyAttributes = new Attributes(emptyResource, emptyResource);

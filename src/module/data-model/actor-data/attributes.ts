import { emptyTracked, Tracked } from "../shared/tracked";

export class Attributes {
  constructor(
    public magicPoints: Tracked,
    public hitPoints: Tracked,
    public healingRate?: number,
    public damageBonus?: string, // For example "1D4"
    public spiritCombatDamage?: string,
    public maximumEncumbrance?: number,
    public sizStrikeRank?: number,
    public dexStrikeRank?: number
  ) {}
}

export const emptyAttributes = new Attributes(emptyTracked, emptyTracked);

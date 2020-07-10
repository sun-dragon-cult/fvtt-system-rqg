import {Tracked} from "../shared/tracked";

export class Attributes {
  constructor(
    public magicPoints: Tracked,
    public hitPoints: Tracked,
    public healingRate?: number,
    public damageBonus?: number,
    public spiritCombatDamage?: number,
    public maximumEncumbrance?: number,
    public sizStrikeRank?: number,
    public dexStrikeRank?: number
  ) {
  };
}

const emptyTracked = new Tracked();
export const emptyAttributes = new Attributes(emptyTracked, emptyTracked);

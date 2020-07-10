import {Ability} from "../shared/ability";

export class PowerRunes {
  constructor(
    public man: Ability,
    public beast: Ability,
    public fertility: Ability,
    public death: Ability,
    public harmony: Ability,
    public disorder: Ability,
    public truth: Ability,
    public illusion: Ability,
    public stasis: Ability,
    public movement: Ability) {
  };
}

const emptyAbility = new Ability();
export const basicPowerRunes = new PowerRunes(emptyAbility, emptyAbility, emptyAbility, emptyAbility, emptyAbility, emptyAbility, emptyAbility, emptyAbility, emptyAbility, emptyAbility);

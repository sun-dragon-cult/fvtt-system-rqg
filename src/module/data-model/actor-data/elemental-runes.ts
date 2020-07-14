import {Ability} from "../shared/ability";

export class ElementalRunes {
  constructor(
    public fire: Ability,
    public darkness: Ability,
    public water: Ability,
    public earth: Ability,
    public air: Ability,
    public moon: Ability) {
  };
}

const emptyAbility = new Ability();
export const basicElementalRunes = new ElementalRunes(emptyAbility, emptyAbility, emptyAbility, emptyAbility, emptyAbility, emptyAbility);

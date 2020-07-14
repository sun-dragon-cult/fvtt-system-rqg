import {Ability} from "../shared/ability";

export class Characteristics {
  constructor(
    public strength: Ability,
    public constitution: Ability,
    public size: Ability,
    public dexterity: Ability,
    public intelligence: Ability,
    public power: Ability,
    public charisma: Ability
  ) {
  };
}

// Check if experience exists to see if the Characteristic can be raised with experience (show checkbox)
const emptyExp = new Ability(0, false);
const emptyNoExp = new Ability();
export const emptyHumanoidCharacteristics = new Characteristics(emptyNoExp, emptyNoExp, emptyNoExp, emptyNoExp, emptyNoExp, emptyExp, emptyNoExp);

export interface Characteristic {
  value: number;
  formula: string;
  hasExperience?: boolean;
}

export interface Characteristics {
  strength: Characteristic;
  constitution: Characteristic;
  size: Characteristic;
  dexterity: Characteristic;
  intelligence: Characteristic;
  power: Characteristic;
  charisma: Characteristic;
}

// Check if experience exists to see if the Characteristic can be raised with experience (show checkbox)
const emptyExp: Characteristic = { value: 0, formula: "3d6", hasExperience: false };
const emptyNoExp: Characteristic = { value: 0, formula: "3d6" };
const emptyNoExpGreater: Characteristic = { value: 0, formula: "2d6+6" };
export const emptyCharacteristics: Characteristics = {
  strength: emptyNoExp,
  constitution: emptyNoExp,
  size: emptyNoExpGreater,
  dexterity: emptyNoExp,
  intelligence: emptyNoExpGreater,
  power: emptyExp,
  charisma: emptyNoExp,
};

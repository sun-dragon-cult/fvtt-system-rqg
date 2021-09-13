export interface Characteristic {
  value: number;
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
const emptyExp: Characteristic = { value: 11, hasExperience: false };
const emptyNoExp: Characteristic = { value: 11 };
export const emptyCharacteristics: Characteristics = {
  strength: emptyNoExp,
  constitution: emptyNoExp,
  size: emptyNoExp,
  dexterity: emptyNoExp,
  intelligence: emptyNoExp,
  power: emptyExp,
  charisma: emptyNoExp,
};

export interface Characteristic {
  value: number | undefined;
  formula: string | undefined;
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

// // Check if experience exists to see if the Characteristic can be raised with experience (show checkbox)
// const defaultExp: Characteristic = { value: 0, formula: "3d6", hasExperience: false };
// const defaultNoExp: Characteristic = { value: 0, formula: "3d6" };
// const defaultNoExpGreater: Characteristic = { value: 0, formula: "2d6+6" };
// export const defaultCharacteristics: Characteristics = {
//   strength: defaultNoExp,
//   constitution: defaultNoExp,
//   size: defaultNoExpGreater,
//   dexterity: defaultNoExp,
//   intelligence: defaultNoExpGreater,
//   power: defaultExp,
//   charisma: defaultNoExp,
// };

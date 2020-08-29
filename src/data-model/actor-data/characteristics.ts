export class Characteristic {
  constructor(public value: number = 0, public experience?: boolean) {}
}

export class Characteristics {
  constructor(
    public strength: Characteristic,
    public constitution: Characteristic,
    public size: Characteristic,
    public dexterity: Characteristic,
    public intelligence: Characteristic,
    public power: Characteristic,
    public charisma: Characteristic
  ) {}
}

// Check if experience exists to see if the Characteristic can be raised with experience (show checkbox)
const emptyExp = new Characteristic(0, false);
const emptyNoExp = new Characteristic();
export const emptyCharacteristics = new Characteristics(
  emptyNoExp,
  emptyNoExp,
  emptyNoExp,
  emptyNoExp,
  emptyNoExp,
  emptyExp,
  emptyNoExp
);

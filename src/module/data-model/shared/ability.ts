export interface IAbility {
  value: number, // TODO Switch to chance ? Works for skills & runes, but not so much for characteristics...
  experience?: boolean
}

export class Ability implements IAbility{
  constructor(
    public value: number = 0,
    public experience?: boolean) {
  }
}

export const emptyAbility = new Ability();

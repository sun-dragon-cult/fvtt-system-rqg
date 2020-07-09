// TODO Embryo for a typed model to replace? template.json

export declare class ActorDataRqg implements ActorData {
  characteristics: Characteristics;
  hitLocations: Array<HitLocation>; // Different races can have different hit locations
  attributes: Attributes;
  elements: ElementalRunes;
  powers: PowerRunes;
  currentMagicPoints: number; // TODO Move somewhere?
  currentHitPoints: number; // TODO Move somewhere?
  constructor(pubcharacteristics: Characteristics, hitLocations: Array<HitLocation>, attributes: Attributes,
              elements: ElementalRunes, powers: PowerRunes, currentMagicPoints: number, currentHitPoints: number);

  data: any;
  flags: any;
  img: string;
  name: string;
  token: Token;
  type: string;
}

export declare class Characteristics {
  strength: Characteristic;
  constitution: Characteristic;
  size: Characteristic;
  dexterity: Characteristic;
  intelligence: Characteristic;
  power: Characteristic;
  charisma: Characteristic;
  constructor(strength: Characteristic, constitution: Characteristic, size: Characteristic, dexterity: Characteristic,
              intelligence: Characteristic, power: Characteristic, charisma: Characteristic);
}

export declare class Characteristic extends Ability {
  readonly min: number;
  readonly max: number;
  constructor(min: number, max: number, value: number, experience: boolean);
}

export declare class HitLocation {
  readonly name: string;
  ap: number;
  readonly hp: number;
  damage: number;
  readonly dieFrom: number;
  readonly dieTo: number;
  constructor(name: string, ap: number, hp: number, damage: number, dieFrom: number, dieTo: number);
}

// All are calculated from characteristics
export declare class Attributes {
  readonly magicPoints: number;
  readonly hitPoints: number;
  readonly healingRate: number;
  readonly damageBonus: number;
  readonly spiritCombatDamage: number;
  readonly maximumEncumbrance: number;
  readonly sizStrikeRank: number;
  readonly dexStrikeRank: number;
  constructor(magicPoints: number, hitPoints: number, healingRate: number, damageBonus: number, spiritCombatDamage: number,
              maximumEncumbrance: number, sizStrikeRank: number, dexStrikeRank: number);
}

export declare class ElementalRunes {
  fire: RuneAbility;
  darkness: RuneAbility;
  water: RuneAbility;
  earth: RuneAbility;
  air: RuneAbility;
  moon: RuneAbility;
  constructor(fire: RuneAbility, darkness: RuneAbility, water: RuneAbility, earth: RuneAbility, air: RuneAbility, moon: RuneAbility);
}

export declare class PowerRunes {
  man: RuneAbility;
  beast: RuneAbility;
  fertility: RuneAbility;
  death: RuneAbility;
  harmony: RuneAbility;
  disorder: RuneAbility;
  truth: RuneAbility;
  illusion: RuneAbility;
  stasis: RuneAbility;
  movement: RuneAbility;
  constructor(man: RuneAbility, beast: RuneAbility, fertility: RuneAbility, death: RuneAbility, harmony: RuneAbility,
              disorder: RuneAbility, truth: RuneAbility, illusion: RuneAbility, stasis: RuneAbility, movement: RuneAbility);
}

export declare class RuneAbility extends Ability {
  readonly runeIconUrl: string;
  constructor(runeIconUrl: string, value: number, experience?: boolean);
}

export declare abstract class Ability {
  value: number;
  experience?: boolean;
}


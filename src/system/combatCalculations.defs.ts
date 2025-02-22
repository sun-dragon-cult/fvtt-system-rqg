export enum WeaponDesignation {
  None = "none",
  AttackingWeapon = "attackingWeapon",
  ParryWeapon = "parryWeapon",
}

export enum DamageDegree {
  None = "none",
  Normal = "normal",
  Special = "special",
  MaxSpecial = "maxSpecial",
}

/***************************************************
 *** From the rules Attack & Parry Results table ***
 ***************************************************/

/**
 * 2D array of what weapon is damaged, based on AbilitySuccessLevel. From the rules Attack & Parry Results table.
 * Defined as [attack success][parry success]
 * Does not include data for the unsupported HyperCritical & SpecialCritical
 */
// prettier-ignore
export const parryDamagedWeaponTable: readonly (WeaponDesignation | undefined)[][] = [
  // HypCrit, SpecCrit,  Critical,                          Special,                           Success,                           Failure,                Fumble Parry
  [undefined, undefined, undefined,                         undefined,                         undefined,                         undefined,              undefined], // HyperCritical Attack
  [undefined, undefined, undefined,                         undefined,                         undefined,                         undefined,              undefined], // SpecialCritical Attack
  [undefined, undefined, WeaponDesignation.ParryWeapon,     WeaponDesignation.ParryWeapon,     WeaponDesignation.ParryWeapon,     WeaponDesignation.None, WeaponDesignation.None], // Critical Attack
  [undefined, undefined, WeaponDesignation.AttackingWeapon, WeaponDesignation.ParryWeapon,     WeaponDesignation.ParryWeapon,     WeaponDesignation.None, WeaponDesignation.None], // Special Attack
  [undefined, undefined, WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.ParryWeapon,     WeaponDesignation.None, WeaponDesignation.None], // Success Attack
  [undefined, undefined, WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.None, WeaponDesignation.None], // Failure Attack
  [undefined, undefined, WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.None, WeaponDesignation.None], // Fumble Attack
] as const;

/**
 * 2D array of what weapon is doing damage, based on AbilitySuccessLevel. From the rules Attack & Parry Results table.
 * Defined as [attack success][parry success]
 * Does not include data for the unsupported HyperCritical & SpecialCritical
 */
// prettier-ignore
export const weaponForDamageTable: readonly (WeaponDesignation | undefined)[][] = [
  // HypCrit, SpecCrit,  Critical,                          Special,                           Success,                           Failure,                           Fumble Parry
  [undefined, undefined, undefined,                         undefined,                         undefined,                         undefined,                         undefined], // HyperCritical Attack
  [undefined, undefined, undefined,                         undefined,                         undefined,                         undefined,                         undefined], // SpecialCritical Attack
  [undefined, undefined, WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon], // Critical Attack
  [undefined, undefined, WeaponDesignation.ParryWeapon,     WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon], // Special Attack
  [undefined, undefined, WeaponDesignation.ParryWeapon,     WeaponDesignation.ParryWeapon,     WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon], // Success Attack
  [undefined, undefined, WeaponDesignation.ParryWeapon,     WeaponDesignation.ParryWeapon,     WeaponDesignation.ParryWeapon,     WeaponDesignation.None,            WeaponDesignation.AttackingWeapon], // Failure Attack
  [undefined, undefined, WeaponDesignation.ParryWeapon,     WeaponDesignation.ParryWeapon,     WeaponDesignation.ParryWeapon,     WeaponDesignation.None,            WeaponDesignation.None], // Fumble Attack
] as const;

/**
 * 2D array of ignore AP info, based on AbilitySuccessLevel. From the rules Attack & Parry Results table.
 * Defined as [attack success][parry success]
 * Does not include data for the unsupported HyperCritical & SpecialCritical
 */
// prettier-ignore
export const parryIgnoreApTable: readonly (boolean | undefined)[][] = [
  // HypCrit, SpecCrit,  Critical,  Special,   Success,   Failure,   Fumble Dodge
  [undefined, undefined, undefined, undefined, undefined, undefined, undefined], // HyperCritical Attack
  [undefined, undefined, undefined, undefined, undefined, undefined, undefined], // SpecialCritical Attack
  [undefined, undefined, false,     true,      true,      true,      true], // Critical Attack
  [undefined, undefined, false,     false,     false,     false,     false], // Special Attack
  [undefined, undefined, false,     false,     false,     false,     false], // Success Attack
  [undefined, undefined, false,     false,     false,     false,     false], // Failure Attack
  [undefined, undefined, false,     false,     false,     false,     false], // Fumble Attack
] as const;

/**
 * 2D array of damage amount info, based on AbilitySuccessLevel. From the rules Attack & Parry Results table.
 * Defined as [attack success][parry success]
 * Does not include data for the unsupported HyperCritical & SpecialCritical
 */
// prettier-ignore
export const parryDamageDegreeTable: readonly (DamageDegree | undefined)[][] = [
  // HypCrit, SpecCrit,  Critical,             Special,                 Success,                 Failure,                 Fumble Parry
  [undefined, undefined, undefined,            undefined,               undefined,               undefined,               undefined], // HyperCritical Attack
  [undefined, undefined, undefined,            undefined,               undefined,               undefined,               undefined], // SpecialCritical Attack
  [undefined, undefined, DamageDegree.Normal,  DamageDegree.MaxSpecial, DamageDegree.MaxSpecial, DamageDegree.MaxSpecial, DamageDegree.MaxSpecial], // Critical Attack
  [undefined, undefined, DamageDegree.Normal,  DamageDegree.Normal,     DamageDegree.Special,    DamageDegree.Special,    DamageDegree.Special],    // Special Attack
  [undefined, undefined, DamageDegree.Special, DamageDegree.Normal,     DamageDegree.Normal,     DamageDegree.Normal,     DamageDegree.Normal],     // Success Attack
  [undefined, undefined, DamageDegree.Special, DamageDegree.Special,    DamageDegree.Normal,     DamageDegree.None,       DamageDegree.Normal],     // Failure Attack
  [undefined, undefined, DamageDegree.Special, DamageDegree.Special,    DamageDegree.Normal,     DamageDegree.None,       DamageDegree.None],       // Fumble Attack
] as const;

/***************************************************
 *** From the rules Dodge Results table ***
 ***************************************************/

/**
 * 2D array of ignore AP info, based on AbilitySuccessLevel. From the rules Dodge Results table.
 * Defined as [attack success][dodge success]
 * Does not include data for the unsupported HyperCritical & SpecialCritical
 */
// prettier-ignore
export const dodgeIgnoreApTable: readonly (boolean | undefined)[][] = [
  // HypCrit, SpecCrit,  Critical,  Special,   Success,   Failure,   Fumble Dodge
  [undefined, undefined, undefined, undefined, undefined, undefined, undefined], // HyperCritical Attack
  [undefined, undefined, undefined, undefined, undefined, undefined, undefined], // SpecialCritical Attack
  [undefined, undefined, false,     false,     true,      true,      true], // Critical Attack
  [undefined, undefined, false,     false,     false,     false,     false], // Special Attack
  [undefined, undefined, false,     false,     false,     false,     false], // Success Attack
  [undefined, undefined, false,     false,     false,     false,     false], // Failure Attack
  [undefined, undefined, false,     false,     false,     false,     false], // Fumble Attack
] as const;

/**
 * 2D array of damage amount info, based on AbilitySuccessLevel. From the rules Dodge Results table.
 * Defined as [attack success][dodge success]
 * Does not include data for the unsupported HyperCritical & SpecialCritical
 */
// prettier-ignore
export const dodgeDamageDegreeTable: readonly (DamageDegree | undefined)[][] = [
  // HypCrit, SpecCrit,  Critical,          Special,              Success,              Failure,                 Fumble Dodge
  [undefined, undefined, undefined,         undefined,            undefined,            undefined,               undefined], // HyperCritical Attack
  [undefined, undefined, undefined,         undefined,            undefined,            undefined,               undefined], // SpecialCritical Attack
  [undefined, undefined, DamageDegree.None, DamageDegree.Special, DamageDegree.Special, DamageDegree.MaxSpecial, DamageDegree.MaxSpecial], // Critical Attack
  [undefined, undefined, DamageDegree.None, DamageDegree.None,    DamageDegree.Special, DamageDegree.Special,    DamageDegree.Special],    // Special Attack
  [undefined, undefined, DamageDegree.None, DamageDegree.None,    DamageDegree.None,    DamageDegree.Normal,     DamageDegree.Normal],     // Success Attack
  [undefined, undefined, DamageDegree.None, DamageDegree.None,    DamageDegree.None,    DamageDegree.None,       DamageDegree.None],       // Failure Attack
  [undefined, undefined, DamageDegree.None, DamageDegree.None,    DamageDegree.None,    DamageDegree.None,       DamageDegree.None],       // Fumble Attack
] as const;

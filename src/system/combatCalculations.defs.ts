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
 */
// prettier-ignore
export const parryDamagedWeaponTable: readonly (WeaponDesignation)[][] = [
// Critical,                          Special,                           Success,                           Failure,                Fumble Parry
  [WeaponDesignation.ParryWeapon,     WeaponDesignation.ParryWeapon,     WeaponDesignation.ParryWeapon,     WeaponDesignation.None, WeaponDesignation.None], // Critical Attack
  [WeaponDesignation.AttackingWeapon, WeaponDesignation.ParryWeapon,     WeaponDesignation.ParryWeapon,     WeaponDesignation.None, WeaponDesignation.None], // Special Attack
  [WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.ParryWeapon,     WeaponDesignation.None, WeaponDesignation.None], // Success Attack
  [WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.None, WeaponDesignation.None], // Failure Attack
  [WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.None, WeaponDesignation.None], // Fumble Attack
] as const;

/**
 * 2D array of what weapon is doing damage, based on AbilitySuccessLevel. From the rules Attack & Parry Results table.
 * Defined as [attack success][parry success]
 */
// prettier-ignore
export const weaponForDamageTable: readonly (WeaponDesignation)[][] = [
// Critical,                          Special,                           Success,                           Failure,                           Fumble Parry
  [WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon], // Critical Attack
  [WeaponDesignation.ParryWeapon,     WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon], // Special Attack
  [WeaponDesignation.ParryWeapon,     WeaponDesignation.ParryWeapon,     WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon, WeaponDesignation.AttackingWeapon], // Success Attack
  [WeaponDesignation.ParryWeapon,     WeaponDesignation.ParryWeapon,     WeaponDesignation.ParryWeapon,     WeaponDesignation.None,            WeaponDesignation.AttackingWeapon], // Failure Attack
  [WeaponDesignation.ParryWeapon,     WeaponDesignation.ParryWeapon,     WeaponDesignation.ParryWeapon,     WeaponDesignation.None,            WeaponDesignation.None],            // Fumble Attack
] as const;

/**
 * 2D array of ignore AP info, based on AbilitySuccessLevel. From the rules Attack & Parry Results table.
 * Defined as [attack success][parry success]
 */
// prettier-ignore
export const parryIgnoreApTable: readonly (boolean)[][] = [
// Critical,  Special,   Success,   Failure,   Fumble Dodge
  [false,     true,      true,      true,      true], // Critical Attack
  [false,     false,     false,     false,     false], // Special Attack
  [false,     false,     false,     false,     false], // Success Attack
  [false,     false,     false,     false,     false], // Failure Attack
  [false,     false,     false,     false,     false], // Fumble Attack
] as const;

/**
 * 2D array of damage amount info, based on AbilitySuccessLevel. From the rules Attack & Parry Results table.
 * Defined as [attack success][parry success]
 */
// prettier-ignore
export const parryDamageDegreeTable: readonly (DamageDegree)[][] = [
// Critical,             Special,                 Success,                 Failure,                 Fumble Parry
  [DamageDegree.Normal,  DamageDegree.MaxSpecial, DamageDegree.MaxSpecial, DamageDegree.MaxSpecial, DamageDegree.MaxSpecial], // Critical Attack
  [DamageDegree.Normal,  DamageDegree.Normal,     DamageDegree.Special,    DamageDegree.Special,    DamageDegree.Special],    // Special Attack
  [DamageDegree.Special, DamageDegree.Normal,     DamageDegree.Normal,     DamageDegree.Normal,     DamageDegree.Normal],     // Success Attack
  [DamageDegree.Special, DamageDegree.Special,    DamageDegree.Normal,     DamageDegree.None,       DamageDegree.Normal],     // Failure Attack
  [DamageDegree.Special, DamageDegree.Special,    DamageDegree.Normal,     DamageDegree.None,       DamageDegree.None],       // Fumble Attack
] as const;

/***************************************************
 *** From the rules Dodge Results table ***
 ***************************************************/

/**
 * 2D array of ignore AP info, based on AbilitySuccessLevel. From the rules Dodge Results table.
 * Defined as [attack success][dodge success]
 */
// prettier-ignore
export const dodgeIgnoreApTable: readonly (boolean)[][] = [
// Critical,  Special,   Success,   Failure,   Fumble Dodge
  [false,     false,     true,      true,      true],  // Critical Attack
  [false,     false,     false,     false,     false], // Special Attack
  [false,     false,     false,     false,     false], // Success Attack
  [false,     false,     false,     false,     false], // Failure Attack
  [false,     false,     false,     false,     false], // Fumble Attack
] as const;

/**
 * 2D array of damage amount info, based on AbilitySuccessLevel. From the rules Dodge Results table.
 * Defined as [attack success][dodge success]
 */
// prettier-ignore
export const dodgeDamageDegreeTable: readonly (DamageDegree)[][] = [
// Critical,          Special,              Success,              Failure,                 Fumble Dodge
  [DamageDegree.None, DamageDegree.Special, DamageDegree.Special, DamageDegree.MaxSpecial, DamageDegree.MaxSpecial], // Critical Attack
  [DamageDegree.None, DamageDegree.None,    DamageDegree.Special, DamageDegree.Special,    DamageDegree.Special],    // Special Attack
  [DamageDegree.None, DamageDegree.None,    DamageDegree.None,    DamageDegree.Normal,     DamageDegree.Normal],     // Success Attack
  [DamageDegree.None, DamageDegree.None,    DamageDegree.None,    DamageDegree.None,       DamageDegree.None],       // Failure Attack
  [DamageDegree.None, DamageDegree.None,    DamageDegree.None,    DamageDegree.None,       DamageDegree.None],       // Fumble Attack
] as const;

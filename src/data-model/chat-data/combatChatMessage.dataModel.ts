export enum ChatMessageTypes {
  Combat = "combat",
}

const {
  // @ts-expect-error data fields not yet defined in types
  BooleanField,
  // @ts-expect-error data fields not yet defined in types
  NumberField,
  // @ts-expect-error data fields not yet defined in types
  DocumentUUIDField,
  // @ts-expect-error data fields not yet defined in types
  JSONField,
  // @ts-expect-error data fields not yet defined in types
  HTMLField,
  // @ts-expect-error data fields not yet defined in types
  SchemaField,
  // @ts-expect-error data fields not yet defined in types
  StringField,
} = foundry.data.fields;

// TODO: This is a temporary fix until the data model is fully implemented
const attackState = ["Attacked", "Defended", "DamageRolled"] as const;
const usageType = ["oneHand", "twoHand", "offHand", "missile"] as const;
const weaponDesignation = ["none", "attackingWeapon", "parryWeapon"] as const;

// @ts-expect-error TypeDataModel
export class CombatChatMessageData extends foundry.abstract.TypeDataModel {
  constructor(data = {}, options = {}) {
    super(data, options);
  }

  static defineSchema() {
    return {
      attackState: new StringField({
        blank: false,
        nullable: false,
        initial: attackState[0],
        choices: attackState,
      }),
      attackingTokenOrActorUuid: new DocumentUUIDField({
        blank: false,
        nullable: false,
        required: true,
      }),
      defendingTokenOrActorUuid: new DocumentUUIDField({
        blank: false,
        nullable: true,
        initial: undefined,
        required: false,
      }),

      attackRoll: new JSONField({
        blank: false,
        nullable: false,
        required: true,
      }),
      attackCombatManeuver: new SchemaField({
        // TODO should reference CombatManeuver dataModel eventually
        name: new StringField({ blank: false, nullable: false }),
        damageType: new StringField({ blank: false, nullable: false }),
        description: new StringField({ blank: false, nullable: false }),
      }),
      attackExtraDamage: new StringField({ blank: false, nullable: true, initial: undefined }),
      attackDamageBonus: new StringField({ blank: false, nullable: true, initial: undefined }),
      actorDamagedApplied: new BooleanField({ blank: false, nullable: false, initial: false }),
      weaponDamageApplied: new BooleanField({ blank: false, nullable: false, initial: false }),
      attackWeaponUuid: new DocumentUUIDField({ blank: false, nullable: true, required: true }),

      // TODO should be a reference to the weapon usageType dataModel eventually
      attackWeaponUsage: new StringField({ blank: false, nullable: false, choices: usageType }),

      // TODO should be a reference to the weapon usageType dataModel eventually
      defenceWeaponUsage: new StringField({
        blank: false,
        nullable: true,
        initial: undefined,
        choices: usageType,
      }),
      outcomeDescription: new HTMLField({
        blank: false,
        nullable: true,
        initial: undefined,
        required: false,
      }),
      defenceRoll: new JSONField({}),

      attackerFumbled: new BooleanField({ blank: false, nullable: false, initial: false }),
      defenderFumbled: new BooleanField({ blank: false, nullable: false, initial: false }),

      damageRoll: new JSONField({
        blank: false,
        nullable: true,
        required: false,
        initial: undefined,
      }),

      hitLocationRoll: new JSONField({
        blank: false,
        nullable: true,
        required: false,
        initial: undefined,
      }),
      ignoreDefenderAp: new BooleanField({ blank: false, nullable: false, initial: false }),
      weaponDamage: new NumberField({ integer: true, min: 0, nullable: true, initial: undefined }),
      defenderHitLocationDamage: new NumberField({
        integer: true,
        min: 0,
        nullable: true,
        initial: undefined,
      }),
      damagedWeaponUuid: new DocumentUUIDField({
        blank: false,
        nullable: true,
        initial: undefined,
        required: false,
      }),
      attackerFumbleOutcome: new HTMLField({
        blank: false,
        nullable: true,
        initial: undefined,
        required: false,
      }),
      defenderFumbleOutcome: new HTMLField({
        blank: false,
        nullable: true,
        initial: undefined,
        required: false,
      }),
      weaponDoingDamage: new StringField({
        blank: false,
        nullable: true,
        initial: undefined,
        choices: weaponDesignation,
      }),
    };
  }
}

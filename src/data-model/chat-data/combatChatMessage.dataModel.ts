import { attackState, usageType, weaponDesignation } from "./combatChatMessage.defs.ts";

const {
  BooleanField,
  NumberField,
  DocumentUUIDField,
  JSONField,
  HTMLField,
  SchemaField,
  StringField,
} = foundry.data.fields;

const combatChatMessageSchema = {
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
} as const;

type combatDataType = typeof combatChatMessageSchema;

export class CombatChatMessageData extends foundry.abstract.TypeDataModel<combatDataType, any> {
  // constructor(data = {}, options = {}) {
  //   super(data, options);
  // }

  static override defineSchema() {
    return combatChatMessageSchema;
  }
}

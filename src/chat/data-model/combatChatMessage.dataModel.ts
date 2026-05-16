import { attackState, usageType, weaponDesignation } from "./combatChatMessage.defs.ts";
import { enumChoices } from "../../data-model/shared/enumChoices";
import { combatManeuverSchemaField } from "../../data-model/shared/combatManeuverSchemaField";

const { BooleanField, NumberField, DocumentUUIDField, JSONField, HTMLField, StringField } =
  foundry.data.fields;

const combatChatMessageSchema = {
  attackState: new StringField({
    blank: false,
    nullable: false,
    initial: attackState[0],
    choices: enumChoices(attackState, "RQG.Chat.Combat.AttackState."),
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
  attackCombatManeuver: combatManeuverSchemaField({
    name: { blank: false, nullable: false },
    damageType: { blank: false, nullable: false },
    description: { blank: false, nullable: false },
  }),
  attackExtraDamage: new StringField({ blank: false, nullable: true, initial: undefined }),
  attackDamageBonus: new StringField({ blank: false, nullable: true, initial: undefined }),
  actorDamagedApplied: new BooleanField({ blank: false, nullable: false, initial: false }),
  weaponDamageApplied: new BooleanField({ blank: false, nullable: false, initial: false }),
  attackWeaponUuid: new DocumentUUIDField({ blank: false, nullable: true, required: true }),

  // TODO move weapon usage choices to a shared runtime source used by both item and chat schemas.
  attackWeaponUsage: new StringField({
    blank: false,
    nullable: false,
    choices: enumChoices(usageType, (v) => `RQG.Game.WeaponUsage.${v}-full`),
  }),

  // TODO move weapon usage choices to a shared runtime source used by both item and chat schemas.
  defenceWeaponUsage: new StringField({
    blank: false,
    nullable: true,
    initial: undefined,
    choices: enumChoices(usageType, (v) => `RQG.Game.WeaponUsage.${v}-full`),
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
    choices: enumChoices(weaponDesignation, "RQG.Chat.Combat.WeaponDesignation."),
  }),
} as const;

type combatDataType = typeof combatChatMessageSchema;

export class CombatChatMessageData extends foundry.abstract.TypeDataModel<combatDataType, any> {
  static override defineSchema() {
    return combatChatMessageSchema;
  }
}

import { rqidLinkSchemaField } from "./rqidLinkField";
import { SpellConcentrationEnum, SpellDurationEnum, SpellRangeEnum } from "../item-data/spell";

const { BooleanField, NumberField, StringField } = foundry.data.fields;

/**
 * Returns the Foundry data field definitions shared by all spell item types
 * (runeMagic, spiritMagic). Mirrors the Spell interface.
 */
export function spellSchemaFields() {
  return {
    points: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
    castingRange: new StringField({
      blank: true,
      nullable: false,
      initial: SpellRangeEnum.Ranged,
      choices: Object.values(SpellRangeEnum),
    }),
    duration: new StringField({
      blank: true,
      nullable: false,
      initial: SpellDurationEnum.Temporal,
      choices: Object.values(SpellDurationEnum),
    }),
    concentration: new StringField({
      blank: false,
      nullable: false,
      initial: SpellConcentrationEnum.Passive,
      choices: Object.values(SpellConcentrationEnum),
    }),
    isRitual: new BooleanField({ nullable: false, initial: false }),
    isEnchantment: new BooleanField({ nullable: false, initial: false }),
    descriptionRqidLink: rqidLinkSchemaField({ nullable: true }),
  } as const;
}

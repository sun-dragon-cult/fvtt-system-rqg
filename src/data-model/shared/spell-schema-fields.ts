import { rqidLinkSchemaField } from "./rqid-link-field";
import {
  SpellConcentrationEnum,
  SpellDurationEnum,
  SpellEffectTierEnum,
  SpellRangeEnum,
  SpellResistedByEnum,
  SpellTargetKindEnum,
} from "../item-data/spell";
import { enumChoices } from "./enum-choices";

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
      choices: enumChoices(SpellRangeEnum, (v) => `RQG.Item.Spell.RangeEnum.${v || "None"}`),
    }),
    duration: new StringField({
      blank: true,
      nullable: false,
      initial: SpellDurationEnum.Temporal,
      choices: enumChoices(SpellDurationEnum, (v) => `RQG.Item.Spell.DurationEnum.${v || "None"}`),
    }),
    concentration: new StringField({
      blank: false,
      nullable: false,
      initial: SpellConcentrationEnum.Passive,
      choices: enumChoices(SpellConcentrationEnum, "RQG.Item.Spell.ConcentrationEnum."),
    }),
    isRitual: new BooleanField({ nullable: false, initial: false }),
    isEnchantment: new BooleanField({ nullable: false, initial: false }),
    resistedBy: new StringField({
      blank: false,
      nullable: false,
      initial: SpellResistedByEnum.None,
      choices: enumChoices(SpellResistedByEnum, "RQG.Item.Spell.ResistedByEnum."),
    }),
    // #1080's survey enums - declared so content is authored once, ahead of #1079's application
    // machinery that will actually consume them.
    targetKind: new StringField({
      blank: false,
      nullable: false,
      initial: SpellTargetKindEnum.None,
      choices: enumChoices(SpellTargetKindEnum, "RQG.Item.Spell.TargetKindEnum."),
    }),
    effectTier: new StringField({
      blank: false,
      nullable: false,
      initial: SpellEffectTierEnum.None,
      choices: enumChoices(SpellEffectTierEnum, "RQG.Item.Spell.EffectTierEnum."),
    }),
    descriptionRqidLink: rqidLinkSchemaField({ nullable: true }),
  } as const;
}

/**
 * Coerces legacy string-typed values on the boolean spell fields (e.g. "true," left over from
 * an old compendium-authoring typo where a trailing comma turned the YAML boolean into a string)
 * back into real booleans, so they survive schema validation instead of silently collapsing to
 * the field's `false` default.
 */
export function migrateSpellBooleanFields(source: Record<string, unknown>): void {
  for (const key of ["isRitual", "isEnchantment"] as const) {
    const value = source[key];
    if (typeof value === "string") {
      source[key] = value.trim().replace(/,$/, "") === "true";
    }
  }
}

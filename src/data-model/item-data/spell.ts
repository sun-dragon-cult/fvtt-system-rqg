import type { RqidLink } from "../shared/rqid-link";
import type { SpiritMagicItem } from "@item-model/spirit-magic-data-model.ts";
import type { RuneMagicItem } from "@item-model/rune-magic-data-model.ts";

/** For now a spell is either Spirit Magic or Rune Magic. Sorcery can be added here later. */
export type SpellItem = SpiritMagicItem | RuneMagicItem;
export const spellItemTypes = ["spiritMagic", "runeMagic"] as const; // Can't use ItemTypeEnum here because it is not initialized yet

export const SpellRangeEnum = {
  None: "",
  Self: "self",
  Touch: "touch",
  Ranged: "ranged", // Rune: 160m, Spirit: 50m, Sorcery: 10m
  Special: "special",
} as const;
export type SpellRangeEnum = (typeof SpellRangeEnum)[keyof typeof SpellRangeEnum];

export const SpellDurationEnum = {
  None: "",
  Instant: "instant",
  Temporal: "temporal", // Rune: 15 min, Spirit: 2 min (10 MR), sorcery: 5 min
  Focused: "focused", // Active for as long as the caster focuses
  Permanent: "permanent", // Ritual (Enchantment)
  Special: "special", // Length of pregnancy / 12 hours / variable etc
} as const;
export type SpellDurationEnum = (typeof SpellDurationEnum)[keyof typeof SpellDurationEnum];

export const SpellConcentrationEnum = {
  Passive: "passive",
  Active: "active",
} as const;
export type SpellConcentrationEnum =
  (typeof SpellConcentrationEnum)[keyof typeof SpellConcentrationEnum];

// How an unwilling target can stop a spell taking effect. Only `None` and `ResistanceRoll` are
// implemented; the rest are declared so content is authored once, and are inert (treated as "no
// automated step") until their own issues wire them up - see #1068.
export const SpellResistedByEnum = {
  None: "none",
  // one resistance roll, single target
  ResistanceRoll: "resistanceRoll",
  // caster rolls one d100; every target in the radius is checked against that one roll
  ResistanceRollArea: "resistanceRollArea",
  // a separate resistance roll per target in the area
  ResistanceRollPerTarget: "resistanceRollPerTarget",
  // gated on winning one round of spirit combat (target typically willing/weak - e.g. Bind Ghost)
  SpiritCombatRound: "spiritCombatRound",
  // gated on driving the target to 0 magic points in spirit combat (e.g. Spirit Binding, Control X)
  SpiritCombatDefeat: "spiritCombatDefeat",
} as const;
export type SpellResistedByEnum = (typeof SpellResistedByEnum)[keyof typeof SpellResistedByEnum];

// Se core book p247
export interface Spell {
  /** Learned strength */
  points: number;
  castingRange: SpellRangeEnum;
  duration: SpellDurationEnum;
  concentration: SpellConcentrationEnum; // All Sorcery is Active
  isRitual: boolean;
  /** Requires POW sacrifice by caster (possibly from others see core book p249) */
  isEnchantment: boolean;
  /** How an unwilling target can resist the spell after a successful cast (p.145-147, 254) */
  resistedBy: SpellResistedByEnum;
  descriptionRqidLink: RqidLink | undefined;
}

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

// What a spell's effect attaches to - decides where #1079's Active Effect gets created (or
// whether one can be at all). Frozen from the #1080 survey against RBM + Core's sample sorcery
// list, not derived from Bladesharp alone - see #1080 for the corpus sample that ruled out a
// smaller enum. Three kinds break the "target is a token" assumption on purpose:
// `spellOrEffect` (Dispel Magic, Countermagic - no item/actor binding, always macro tier),
// `creates` (summonings, Create Fissure - the spell makes a new document, nothing pre-existing is
// bound), and `area` (no Region/MeasuredTemplate binding exists yet, so this is a marker for
// future work, never a #1079 selector target). Only `weapon`, `object`, `hitLocation` (item-bound)
// and `self`/`creature`/`spirit` (actor-bound) have a #1079 selector today.
export const SpellTargetKindEnum = {
  None: "none", // no meaningful target concept at all (rare - most "no target" spells are `self`)
  Self: "self", // always the caster's own actor
  Creature: "creature", // a targeted living actor
  Spirit: "spirit", // a targeted spirit/undead/otherworldly entity actor
  Weapon: "weapon", // an equipped weapon item, filtered by damage class etc
  Object: "object", // a non-weapon physical item (gear/armor)
  HitLocation: "hitLocation", // a specific hit location on the target actor
  Area: "area", // an area of ground, not bound to any actor/item document
  Radius: "radius", // every actor matching a filter within a radius of the caster
  SpellOrEffect: "spellOrEffect", // targets another spell/Active Effect on the target
  Creates: "creates", // the spell creates a document rather than affecting one
  Ritual: "ritual", // a social/ritual state change with no mechanical binding
} as const;
export type SpellTargetKindEnum = (typeof SpellTargetKindEnum)[keyof typeof SpellTargetKindEnum];

// How much of #1079's application machinery a spell's effect goes through. Data on the spell, not
// a code branch - most spells are not `macro`. See #1079 for the mechanism behind each tier.
export const SpellEffectTierEnum = {
  None: "none", // nothing to automate (Truespeak, Divination, most rituals)
  Reminder: "reminder", // GM-adjudicated effect worth tracking - chat note + duration only
  Declarative: "declarative", // Active Effect from the effects pack (Bladesharp, Protection...)
  Macro: "macro", // rqid-referenced Macro (Sever Spirit, Turn Undead, Heal Wound, summonings)
} as const;
export type SpellEffectTierEnum = (typeof SpellEffectTierEnum)[keyof typeof SpellEffectTierEnum];

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
  /** What the spell's effect attaches to (#1080) */
  targetKind: SpellTargetKindEnum;
  /** How much of #1079's application machinery this spell's effect goes through */
  effectTier: SpellEffectTierEnum;
  descriptionRqidLink: RqidLink | undefined;
}

import { equippedStatuses, physicalItemProperties } from "../item-data/i-physical-item";
import { enumChoices } from "./enum-choices";
import { rqidLinkSchemaField } from "./rqid-link-field";

const { ArrayField, BooleanField, DocumentUUIDField, NumberField, SchemaField, StringField } =
  foundry.data.fields;

/**
 * Returns the Foundry data field definitions shared by all physical item types
 * (gear, armor, weapon). Mirrors the IPhysicalItem interface.
 */
export function physicalItemSchemaFields() {
  return {
    physicalItemType: new StringField({
      blank: false,
      nullable: false,
      initial: "unique",
      choices: enumChoices(physicalItemProperties, "RQG.Item.Gear.PhysicalItemTypeEnum."),
    }),
    quantity: new NumberField({ integer: true, min: 0, nullable: false, initial: 1 }),
    description: new StringField({ blank: true, nullable: false, initial: "" }),
    gmNotes: new StringField({ blank: true, nullable: false, initial: "" }),
    location: new StringField({ blank: true, nullable: false, initial: "" }),
    isContainer: new BooleanField({ nullable: false, initial: false }),
    attunedTo: new StringField({ blank: true, nullable: false, initial: "" }),
    encumbrance: new NumberField({ min: 0, integer: false, nullable: false, initial: 1 }),
    equippedStatus: new StringField({
      blank: false,
      nullable: false,
      initial: "carried",
      choices: enumChoices(equippedStatuses, "RQG.Item.EquippedStatus."),
    }),
    price: new SchemaField({
      real: new NumberField({ min: 0, integer: false, nullable: false, initial: 0 }),
      estimated: new NumberField({ min: 0, nullable: false, initial: 0 }),
    }),
    // Magic points stored in the item (e.g. a POW-storing crystal, Core p.263), spendable as an
    // alternative source when casting Spirit/Rune Magic. See #956. "identified" gates whether the
    // player-facing item sheet reveals this at all, and whether it counts as a usable source -
    // a found crystal shouldn't announce itself as a Magic Point battery until the GM marks it
    // identified (e.g. via Analyze Magic or similar). Deliberately separate from the
    // pre-existing "attunedTo" flavor-text field (attunement and identification are different
    // concepts). This identified-flag pattern can be reused for other item secrets later (e.g.
    // spell matrices).
    storedMagicPoints: new SchemaField({
      value: new NumberField({ integer: true, nullable: true, initial: 0 }),
      max: new NumberField({ integer: true, nullable: false, initial: 0 }),
      identified: new BooleanField({ nullable: false, initial: false }),
    }),
    // Spirits trapped in this item via a Binding Enchantment (Core p.249, #999) - an item can
    // hold more than one (e.g. a tiara set with several bound crystals).
    boundSpiritActorUuids: new ArrayField(
      new DocumentUUIDField({ blank: false, nullable: false, required: true }),
    ),
    // Spirit Magic spell(s) stored via a Spell Matrix Enchantment (Core p.264-265, #959) - anyone
    // in physical contact with this item can cast any of them at their own POW×5% using their own
    // Magic Points, regardless of whether they know it themselves. An item can hold more than one
    // matrix spell (e.g. one 4-point spell and one 1-point spell enchanted separately). Each entry
    // is deliberately not a full spell copy: `points` is the level enchanted into that matrix slot
    // (fixed once, but GM-editable to allow correcting mistakes - see item-common-physical.hbs),
    // while the spell's other mechanics (range/duration/concentration/isVariable/...) never diverge
    // per matrix instance, so they're resolved live from `spellRqidLink.rqid` via
    // resolveMatrixSpellItem (spell-matrix.ts) instead of being duplicated here.
    // `sort` orders this entry among the actor's own Spirit Magic spells.
    matrixSpells: new ArrayField(
      new SchemaField({
        spellRqidLink: rqidLinkSchemaField({ nullable: true }),
        points: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
        sort: new NumberField({ integer: true, nullable: false, initial: 0 }),
      }),
    ),
  } as const;
}

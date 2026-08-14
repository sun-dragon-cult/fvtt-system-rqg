import { equippedStatuses, physicalItemProperties } from "../item-data/i-physical-item";
import { enumChoices } from "./enum-choices";

const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

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
  } as const;
}

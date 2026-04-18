import { equippedStatuses, physicalItemProperties } from "../item-data/IPhysicalItem";
import { enumChoices } from "./enumChoices";

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
  } as const;
}

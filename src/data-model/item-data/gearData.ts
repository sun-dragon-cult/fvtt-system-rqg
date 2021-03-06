import { emptyPrice, EquippedStatus, IPhysicalItem, PhysicalItemType } from "./IPhysicalItem";

export type GearData = IPhysicalItem & {
  // --- Derived / Convenience Data Below ---
  equippedStatuses?: Array<EquippedStatus>; // For sheet dropdown
  physicalItemTypes?: Array<PhysicalItemType>; // For sheet dropdown
};

export const emptyGear: GearData = {
  description: "",
  gmNotes: "",
  quantity: 1,
  price: emptyPrice,
  encumbrance: 1,
  equippedStatus: "carried",
  location: "",
  isContainer: false,
  attunedTo: "",
  physicalItemType: "unique",
};

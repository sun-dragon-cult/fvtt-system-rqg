import { EquippedStatus, IPhysicalItem, PhysicalItemType } from "./IPhysicalItem";

export type GearData = IPhysicalItem & {
  description: string;
  quantity: number;
  encumbrance: number;
  isContainer: boolean;
  // --- Derived / Convenience Data Below ---
  equippedStatuses?: Array<EquippedStatus>; // For sheet dropdown
  physicalItemTypes?: Array<PhysicalItemType>; // For sheet dropdown
};

export const emptyGear: GearData = {
  description: "",
  quantity: 1,
  price: 0,
  encumbrance: 1,
  equippedStatus: "carried",
  location: "",
  isContainer: false,
  physicalItemType: "unique",
};

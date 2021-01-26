import { EquippedStatus, IPhysicalItem } from "./IPhysicalItem";

export type GearData = IPhysicalItem & {
  description: string;
  quantity: number;
  encumbrance: number;
  // --- Derived / Convenience Data Below ---
  equippedStatuses?: Array<EquippedStatus>; // For sheet dropdown
};

export const emptyGear: GearData = {
  description: "",
  quantity: 1,
  price: 0,
  encumbrance: 1,
  equippedStatus: "carried",
};

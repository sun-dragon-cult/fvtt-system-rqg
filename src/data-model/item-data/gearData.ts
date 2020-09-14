import { IPhysicalItem } from "./IPhysicalItem";

export type GearData = IPhysicalItem & {
  description: string;
  quantity: number;
  encumbrance: number;
};

export const emptyGear: GearData = {
  description: "",
  quantity: 1,
  encumbrance: 1,
  equipped: false,
};

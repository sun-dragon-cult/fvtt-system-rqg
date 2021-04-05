export const equippedStatuses = ["notCarried", "carried", "equipped"] as const;
export type EquippedStatus = typeof equippedStatuses[number];

export const physicalItemTypes = ["unique", "currency", "consumable"];
export type PhysicalItemType = typeof physicalItemTypes[number];

interface Price {
  real: number;
  estimated: number;
}

export interface IPhysicalItem {
  physicalItemType: PhysicalItemType;
  quantity?: number; // Used for currency & consumables like arrows, torches, food rations. 1 for others
  description: string;
  gmNotes: string;
  location: string;
  isContainer: boolean;
  attunedTo: string; // Name of the character attuned to it, or empty if not attuned
  encumbrance: number;
  equippedStatus: EquippedStatus;
  price: Price; // Price in Lunars
}

export const emptyPrice: Price = {
  real: 0,
  estimated: 0,
};

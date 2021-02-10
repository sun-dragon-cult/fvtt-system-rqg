export const equippedStatuses = ["notCarried", "carried", "equipped"] as const;
export type EquippedStatus = typeof equippedStatuses[number];

export const physicalItemTypes = ["unique", "currency", "consumable"];
export type PhysicalItemType = typeof physicalItemTypes[number];

export interface IPhysicalItem {
  physicalItemType: PhysicalItemType;
  quantity?: number; // Used for currency & consumables like arrows, torches, food rations. 1 for others
  location: string;
  encumbrance: number;
  equippedStatus: EquippedStatus;
  price?: number; // Price in Lunars
}

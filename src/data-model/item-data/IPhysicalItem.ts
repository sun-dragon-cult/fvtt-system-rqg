export const equippedStatuses = ["notCarried", "carried", "equipped"] as const;
export type EquippedStatus = typeof equippedStatuses[number];

export const isCarried = (status: EquippedStatus): boolean => equippedStatuses.indexOf(status) > 0; // carried or equipped

export interface IPhysicalItem {
  quantity?: number;
  encumbrance: number;
  equippedStatus?: EquippedStatus;
  price?: number; // Price in Lunars
}

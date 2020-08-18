export interface IPhysicalItem {
  quantity: number;
  encumbrance: number;
  equipped: boolean; // For active effects etc
  // attuned: boolean; from DnD5e for Active Effects?
  // identified: boolean; from DnD5e for Foriens Unidentified Items?
}

export interface IPhysicalItem {
  quantity?: number;
  encumbrance: number;
  isEquipped?: boolean; // Not every physical Item can be isEquipped?
  // attuned: boolean; from DnD5e for Active Effects?
  // identified: boolean; from DnD5e for Foriens Unidentified Items?
}

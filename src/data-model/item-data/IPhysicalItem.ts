export interface IPhysicalItem {
  quantity?: number;
  encumbrance: number;
  equipped?: boolean; // Not every physical Item can be equipped?
  // attuned: boolean; from DnD5e for Active Effects?
  // identified: boolean; from DnD5e for Foriens Unidentified Items?
}

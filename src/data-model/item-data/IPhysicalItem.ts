export interface IPhysicalItem {
  quantity?: number;
  encumbrance: number;
  isEquipped?: boolean; // Not every physical Item can be isEquipped?
  price?: number; // Price in Lunars
}

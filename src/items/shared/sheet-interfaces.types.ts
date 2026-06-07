// TODO *** move these interfaces somewhere else ***
// TODO STÄMMER DET HÄR???

export interface DocumentSheetData {
  id: string;
  uuid: string;
  name: string;
  img: string;
  /** game.user.isGM */
  isGM: boolean;
  /** duplicate of `document.system` */
  system: unknown;
  /** Used for the Tiny MCE editor to hide or show toolbar */
  isEditable?: boolean;
}

export interface ActorSheetData extends DocumentSheetData {
  isPC: boolean;
  showCharacteristicRatings: boolean;
  /** Add `document.effects` here */
  effects: unknown;
}

export interface ItemSheetData extends DocumentSheetData {
  /** Used, among other things, to decide if Active Effects tab should be shown */
  isEmbedded: boolean;
}

export interface EffectsItemSheetData extends ItemSheetData {
  /** Add `document.effects` here */
  effects: unknown;
}

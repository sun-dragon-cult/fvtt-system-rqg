export interface IAbility {
  /** The effective % chance of this ability with all modifiers added in */
  chance?: number;
  /** Is it possible to learn this ability by doing (setting hasExperience=true)? Otherwise the only way to increase the learned chance is by study */
  canGetExperience: boolean;
  /** Has this ability been successfully used and therefore up for an improvement roll */
  hasExperience?: boolean;
}

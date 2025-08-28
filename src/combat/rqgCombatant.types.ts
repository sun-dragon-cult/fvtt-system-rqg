import type { RqgCombatant } from "./rqgCombatant.ts";

export type NewCombatant = {
  tokenId: any;
  sceneId: any;
  actorId: any;
  initiative: number;
};

declare module "fvtt-types/configuration" {
  interface DocumentClassConfig {
    Combatant: typeof RqgCombatant;
  }

  interface ConfiguredCombatant<SubType extends Combatant.SubType> {
    document: RqgCombatant<SubType>;
  }
}

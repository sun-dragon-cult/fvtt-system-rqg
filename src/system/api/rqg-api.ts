import { pickSpellLocation, moveTokenNear } from "../spell-effects/pick-spell-location";
import { applyAreaEffect, createArea } from "../spell-effects/spell-area";
import { chooseWounds } from "../../items/hit-location-item/hit-location-heal-wound-dialog";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";
import { removeSpellEffects } from "../spell-effects/remove-spell-effects";
import { metersToPixels } from "../spell-effects/scene-distance";
import { barrierPriorities } from "../spell-effects/spell-barriers";
import { castPoints, effectRemovalCost, listSpellEffects } from "../spell-effects/spell-rules";
import { summon } from "../spell-effects/summon";
import { dealSpellDamage } from "../spell-effects/spell-damage";
import { postMagicMissiles as postAttackMagicMissiles } from "../../applications/attack-flow/magic-missiles";
import type { MissileFiredScope } from "../spell-effects/spell-behavior";
import * as rolls from "./api-rolls";
import { addWound, healWounds } from "./api-dialogs";
import { openDataModelRepairDialog } from "./data-model-repair";
import { applyWorldMigrations, openRqidBatchEditor } from "./maintenance-api";
import { Rqid } from "./rqid-api";

/**
 * The public API, available as `game.system.api`. Breaking changes to it are noted in the
 * changelog. User documentation: https://sun-dragon-cult.github.io/rqg-system/api
 */
export function createRqgApi() {
  return {
    rolls: {
      ability: rolls.ability,
      characteristic: rolls.characteristic,
      reputation: rolls.reputation,
      attack: rolls.attack,
      spiritMagic: rolls.spiritMagic,
      runeMagic: rolls.runeMagic,
      /** Compare with `roll.successLevel`, lower is better. */
      SuccessLevel: AbilitySuccessLevelEnum,
    },
    maintenance: {
      applyWorldMigrations,
      openDataModelRepairDialog,
      openRqidBatchEditor,
    },
    // Bound, since several of these call other Rqid statics through `this`
    rqid: {
      fromRqid: Rqid.fromRqid.bind(Rqid),
      fromRqidRegex: Rqid.fromRqidRegex.bind(Rqid),
      fromRqidRegexBest: Rqid.fromRqidRegexBest.bind(Rqid),
      fromRqidCount: Rqid.fromRqidCount.bind(Rqid),
      getDefaultRqid: Rqid.getDefaultRqid.bind(Rqid),
      setRqid: Rqid.setRqid.bind(Rqid),
      setDefaultRqid: Rqid.setDefaultRqid.bind(Rqid),
      renderRqidDocument: Rqid.renderRqidDocument.bind(Rqid),
    },
    dialogs: {
      chooseWounds,
      addWound,
      healWounds,
    },
    spellEffects: {
      list: listSpellEffects,
      removeSpellEffects,
      castPoints,
      barrierPriorities,
      effectRemovalCost,
      summon,
      dealDamage: dealSpellDamage,
      createArea,
      pickLocation: pickSpellLocation,
      moveTokenNear,
      applyAreaEffect,
      metersToPixels,
      postMagicMissiles: (scope: MissileFiredScope, count: number) =>
        postAttackMagicMissiles(scope.attack.chatMessage, count),
    },
  };
}

export type RqgApi = ReturnType<typeof createRqgApi>;

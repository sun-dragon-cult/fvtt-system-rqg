import type { ItemTypeEnum } from "@item-model/item-types.ts";
import {
  DEFAULT_RQID_BATCH_ITEM_TYPES,
  RqidBatchEditor,
} from "../../applications/rqid-batch-editor/rqid-batch-editor";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";
import { applyDefaultWorldMigrations } from "../migrations/migrate-world";
import { removeSpellEffects } from "../spell-effects/remove-spell-effects";
import { castStrength, effectRemovalCost, listSpellEffects } from "../spell-effects/spell-rules";
import * as query from "./api-query";
import * as rolls from "./api-rolls";
import { openDataModelRepairDialog } from "./data-model-repair";
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
    },
    query: {
      abilities: query.abilities,
      weaponUsages: query.weaponUsages,
      spells: query.spells,
    },
    /** Compare with `roll.successLevel`, lower is better. */
    SuccessLevel: AbilitySuccessLevelEnum,
    migration: {
      applyWorldMigrations: applyDefaultWorldMigrations,
      openDataModelRepairDialog,
      /**
       * Show an application that lets you set rqid for items.
       */
      openRqidBatchEditor: async (...itemTypes: string[]): Promise<void> => {
        const itemTypeEnums = (
          itemTypes.length
            ? itemTypes.map((it) => it as ItemTypeEnum)
            : DEFAULT_RQID_BATCH_ITEM_TYPES
        ) as Item.SubType[];
        await RqidBatchEditor.factory(...itemTypeEnums);
      },
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
    spellEffects: {
      list: listSpellEffects,
      removeSpellEffects,
      castStrength,
      effectRemovalCost,
    },
  };
}

export type RqgApi = ReturnType<typeof createRqgApi>;

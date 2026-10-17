import { spellBehavior } from "../system/spell-effects/spell-behavior";
import { Rqid } from "../system/api/rqid-api";
import { spellProvenanceFields } from "../active-effect/data-model/rqg-active-effect-data-model";
import { removeAreaEffects, type SpellAreaScope } from "../system/spell-effects/spell-area";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";

const { RegionBehaviorType } = foundry.data.regionBehaviors;
const { SchemaField } = foundry.data.fields;

const defineSpellAreaRegionBehaviorSchema = () => ({
  // The spell's provenance, as on the effects it makes
  spell: new SchemaField(spellProvenanceFields()),
});

type SpellAreaRegionBehaviorSchema = ReturnType<typeof defineSpellAreaRegionBehaviorSchema>;

type AreaHook = "onAreaEnter" | "onAreaExit";

/**
 * A spell's area (#1168), made by `spellEffects.createArea`: runs the spell behavior's
 * `onAreaEnter` and `onAreaExit` when tokens cross it, and `onAreaEnter` for those already inside
 * when it appears. Runs on the active GM's client, since the spells change other people's actors.
 */
export class SpellAreaRegionBehavior extends RegionBehaviorType<SpellAreaRegionBehaviorSchema> {
  static override defineSchema() {
    return defineSpellAreaRegionBehaviorSchema();
  }

  static init(): void {
    const regionBehaviorConfig = CONFIG.RegionBehavior;
    regionBehaviorConfig.dataModels["spellArea"] = SpellAreaRegionBehavior;
    regionBehaviorConfig.typeIcons["spellArea"] = "fa-solid fa-hand-sparkles";
    (regionBehaviorConfig.typeLabels as any)["spellArea"] = "TYPES.RegionBehavior.spellArea";
  }

  // A token moving across the boundary, even straight through, is a crossing (TOKEN_MOVE_IN/OUT).
  // TOKEN_ENTER/EXIT without a movement are tokens there when the area appeared, or placed or
  // removed; with one they repeat the move events.
  static override events = {
    [CONST.REGION_EVENTS.TOKEN_MOVE_IN]: async function (
      this: SpellAreaRegionBehavior,
      event: any,
    ) {
      await this.dispatch("onAreaEnter", event.data.token, true);
    },
    [CONST.REGION_EVENTS.TOKEN_MOVE_OUT]: async function (
      this: SpellAreaRegionBehavior,
      event: any,
    ) {
      await this.dispatch("onAreaExit", event.data.token, true);
    },
    [CONST.REGION_EVENTS.TOKEN_ENTER]: async function (this: SpellAreaRegionBehavior, event: any) {
      if (!event.data.movement) {
        await this.dispatch("onAreaEnter", event.data.token, false);
      }
    },
    [CONST.REGION_EVENTS.TOKEN_EXIT]: async function (this: SpellAreaRegionBehavior, event: any) {
      if (!event.data.movement) {
        await this.dispatch("onAreaExit", event.data.token, false);
      }
    },
  } as any;

  private async dispatch(hook: AreaHook, token: TokenDocument, crossed: boolean): Promise<void> {
    const region = this.region;
    const actor = token?.actor as RqgActor | null | undefined;
    if (!game.users?.activeGM?.isSelf || !region || !actor) {
      return;
    }
    // A deleted unlinked token took its effects with it
    if (actor.isToken && !region.parent?.tokens.has(token.id ?? "")) {
      return;
    }
    // Leaving an area always takes its effects off, whatever the spell does besides
    if (hook === "onAreaExit") {
      await removeAreaEffects(actor, region.uuid ?? "");
    }
    const provenance = this.spell;
    const run = spellBehavior(provenance.spellRqid)?.[hook];
    if (!run) {
      return;
    }
    // The cast spell may be gone from the caster since; its compendium copy has the same rules
    const spell = ((await fromUuid(provenance.spellUuid)) ??
      (await Rqid.fromRqid(provenance.spellRqid, undefined, true))) as RqgItem | null;
    if (!spell) {
      return;
    }
    const scope: SpellAreaScope = {
      spell: spell,
      cast: { ...provenance, casterSuccessLevel: provenance.casterSuccessLevel ?? undefined },
      region: region as RegionDocument,
      token: token,
      actor: actor,
      crossed: crossed,
    };
    await run(scope);
  }
}

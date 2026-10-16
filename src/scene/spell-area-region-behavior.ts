import { spellBehavior } from "../system/spell-effects/spell-behavior";
import { Rqid } from "../system/api/rqid-api";
import type { SpellAreaScope } from "../system/spell-effects/spell-area";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";

const { RegionBehaviorType } = foundry.data.regionBehaviors;
const { NumberField, SchemaField, StringField } = foundry.data.fields;

const defineSpellAreaRegionBehaviorSchema = () => ({
  // The spell's provenance, as on the effects it makes
  spell: new SchemaField({
    spellRqid: new StringField({ blank: true, nullable: false, initial: "" }),
    spellName: new StringField({ blank: true, nullable: false, initial: "" }),
    spellUuid: new StringField({ blank: true, nullable: false, initial: "" }),
    casterUuid: new StringField({ blank: true, nullable: false, initial: "" }),
    castMessageId: new StringField({ blank: true, nullable: false, initial: "" }),
    level: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
    magicPointsSpent: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
    runePointsSpent: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
    casterSuccessLevel: new NumberField({ integer: true, nullable: true, initial: null }),
  }),
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

  static override events = {
    [CONST.REGION_EVENTS.TOKEN_ENTER]: async function (this: SpellAreaRegionBehavior, event: any) {
      await this.dispatch("onAreaEnter", event.data.token, true);
    },
    [CONST.REGION_EVENTS.TOKEN_EXIT]: async function (this: SpellAreaRegionBehavior, event: any) {
      await this.dispatch("onAreaExit", event.data.token, true);
    },
    [CONST.REGION_EVENTS.BEHAVIOR_ACTIVATED]: async function (this: SpellAreaRegionBehavior) {
      for (const token of this.region?.tokens ?? []) {
        await this.dispatch("onAreaEnter", token, false);
      }
    },
  } as any;

  private async dispatch(hook: AreaHook, token: TokenDocument, crossed: boolean): Promise<void> {
    const region = this.region;
    const actor = token?.actor as RqgActor | null | undefined;
    if (!game.users?.activeGM?.isSelf || !region || !actor) {
      return;
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
      cast: {
        casterUuid: provenance.casterUuid,
        castMessageId: provenance.castMessageId,
        level: provenance.level,
        magicPointsSpent: provenance.magicPointsSpent,
        runePointsSpent: provenance.runePointsSpent,
        casterSuccessLevel: provenance.casterSuccessLevel ?? undefined,
      },
      region: region as RegionDocument,
      token: token,
      actor: actor,
      crossed: crossed,
    };
    await run(scope);
  }
}

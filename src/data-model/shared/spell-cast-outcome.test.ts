import { beforeAll, describe, expect, it } from "vitest";
import {
  buildCastTargetOutcomes,
  deriveResistanceRequestTargetOutcome,
  getSpellCastOutcome,
} from "./spell-cast-outcome";
import { SpellResistedByEnum } from "../item-data/spell";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";

const { Critical, Success, Failure } = AbilitySuccessLevelEnum;
const caster = "Scene.s.Token.caster";

describe("buildCastTargetOutcomes", () => {
  const build = (
    castSuccessLevel: AbilitySuccessLevelEnum,
    resistedBy: SpellResistedByEnum,
    targets: { tokenUuid: string; isCaster: boolean }[],
  ) =>
    buildCastTargetOutcomes({
      castSuccessLevel,
      resistedBy,
      targets,
      casterTokenOrActorUuid: caster,
    });

  it("defaults to the caster, cast on themselves, when nothing is targeted", () => {
    expect(build(Success, SpellResistedByEnum.None, [])).toEqual([
      {
        targetTokenOrActorUuid: caster,
        state: "affected",
        resolvedBy: "selfCast",
        casterSuccessLevel: Success,
      },
    ]);
  });

  it("defaults to the caster for a resistanceRoll spell, whose caster confirmed the self cast", () => {
    expect(build(Success, SpellResistedByEnum.ResistanceRoll, [])[0]).toMatchObject({
      targetTokenOrActorUuid: caster,
      state: "affected",
      resolvedBy: "selfCast",
    });
  });

  it.each([
    SpellResistedByEnum.ResistanceRollArea,
    SpellResistedByEnum.ResistanceRollPerTarget,
    SpellResistedByEnum.SpiritCombatRound,
    SpellResistedByEnum.SpiritCombatDefeat,
  ])("records no targets for an untargeted %s cast, rather than hitting the caster", (mode) => {
    expect(build(Success, mode, [])).toEqual([]);
  });

  it("marks every target unaffected when the cast failed, whatever resists it", () => {
    const outcomes = build(Failure, SpellResistedByEnum.ResistanceRoll, [
      { tokenUuid: "Token.a", isCaster: false },
      { tokenUuid: caster, isCaster: true },
    ]);

    expect(outcomes.map((o) => [o.state, o.resolvedBy])).toEqual([
      ["unaffected", "castFailed"],
      ["unaffected", "castFailed"],
    ]);
  });

  it("marks an unresisted spell's targets affected, the caster's own token as a self cast", () => {
    const outcomes = build(Critical, SpellResistedByEnum.None, [
      { tokenUuid: "Token.a", isCaster: false },
      { tokenUuid: caster, isCaster: true },
    ]);

    expect(outcomes.map((o) => [o.state, o.resolvedBy, o.casterSuccessLevel])).toEqual([
      ["affected", "castOnly", Critical],
      ["affected", "selfCast", Critical],
    ]);
  });

  it.each([
    SpellResistedByEnum.ResistanceRoll,
    SpellResistedByEnum.ResistanceRollArea,
    SpellResistedByEnum.ResistanceRollPerTarget,
    SpellResistedByEnum.SpiritCombatRound,
    SpellResistedByEnum.SpiritCombatDefeat,
  ])("leaves another target pending under %s, for a later step to settle", (resistedBy) => {
    expect(build(Success, resistedBy, [{ tokenUuid: "Token.a", isCaster: false }])).toEqual([
      {
        targetTokenOrActorUuid: "Token.a",
        state: "pending",
        resolvedBy: undefined,
        casterSuccessLevel: undefined,
      },
    ]);
  });
});

describe("deriveResistanceRequestTargetOutcome", () => {
  const request = (state: string) => ({ state, targetTokenOrActorUuid: "Token.a" });

  it("is pending until the target answers", () => {
    expect(deriveResistanceRequestTargetOutcome(request("Requested"), undefined).state).toBe(
      "pending",
    );
  });

  it("is affected when the target accepts", () => {
    expect(deriveResistanceRequestTargetOutcome(request("Accepted"), undefined)).toMatchObject({
      state: "affected",
      resolvedBy: "accepted",
    });
  });

  it("reads the resistance roll as the caster's: success overcomes the target", () => {
    expect(deriveResistanceRequestTargetOutcome(request("Rolled"), Success)).toMatchObject({
      state: "affected",
      resolvedBy: "resistanceRoll",
      casterSuccessLevel: Success,
    });
  });

  it("reads a failed resistance roll as the target holding", () => {
    expect(deriveResistanceRequestTargetOutcome(request("Rolled"), Failure)).toMatchObject({
      state: "unaffected",
      casterSuccessLevel: Failure,
    });
  });
});

describe("getSpellCastOutcome", () => {
  beforeAll(() => {
    // serialized rolls in these fixtures carry their success level directly
    (foundry.dice.Roll as any).fromData = (data: { successLevel?: number }) => ({
      successLevel: data.successLevel,
    });
    (foundry.utils as any).deepClone ??= structuredClone;
  });

  const pendingTarget = {
    targetTokenOrActorUuid: "Token.a",
    state: "pending",
    resolvedBy: null,
    casterSuccessLevel: null,
  };
  const castMessage = (targets: unknown[]) => ({
    id: "cast",
    type: "spellCast",
    system: {
      spellUuid: "Actor.c.Item.spell",
      casterTokenOrActorUuid: caster,
      castSuccessLevel: Success,
      targets,
    },
  });

  it("reads a spellCast message, turning stored nulls into undefined", () => {
    expect(getSpellCastOutcome(castMessage([pendingTarget]), [])).toEqual({
      spellUuid: "Actor.c.Item.spell",
      casterTokenOrActorUuid: caster,
      castSuccessLevel: Success,
      targets: [
        {
          targetTokenOrActorUuid: "Token.a",
          state: "pending",
          resolvedBy: undefined,
          casterSuccessLevel: undefined,
        },
      ],
    });
  });

  it("settles a hidden cast's pending target from the resistance request linked to it", () => {
    const request = {
      id: "request",
      type: "resistanceRequest",
      system: {
        state: "Rolled",
        targetTokenOrActorUuid: "Token.a",
        spellCastMessageId: "cast",
        resistanceRoll: { successLevel: Failure },
      },
    };

    expect(getSpellCastOutcome(castMessage([pendingTarget]), [request])?.targets).toEqual([
      {
        targetTokenOrActorUuid: "Token.a",
        state: "unaffected",
        resolvedBy: "resistanceRoll",
        casterSuccessLevel: Failure,
      },
    ]);
  });

  it("reads the combined cast + resistance card as a single-target cast", () => {
    const combinedCard = {
      id: "combined",
      type: "resistanceRequest",
      system: {
        state: "Accepted",
        targetTokenOrActorUuid: "Token.a",
        isSpellCast: true,
        castRoll: { successLevel: Critical },
        spellUuid: "Actor.c.Item.spell",
        spellCasterUuid: caster,
      },
    };

    expect(getSpellCastOutcome(combinedCard, [])).toEqual({
      spellUuid: "Actor.c.Item.spell",
      casterTokenOrActorUuid: caster,
      castSuccessLevel: Critical,
      targets: [
        {
          targetTokenOrActorUuid: "Token.a",
          state: "affected",
          resolvedBy: "accepted",
          casterSuccessLevel: undefined,
        },
      ],
    });
  });

  it("has no outcome for a hidden cast's anonymous request, or any other message", () => {
    const anonymousRequest = {
      id: "request",
      type: "resistanceRequest",
      system: { isSpellCast: true, castRoll: undefined, spellCastMessageId: "cast" },
    };

    expect(getSpellCastOutcome(anonymousRequest, [])).toBeUndefined();
    expect(getSpellCastOutcome({ id: "x", type: "base", system: {} }, [])).toBeUndefined();
  });
});

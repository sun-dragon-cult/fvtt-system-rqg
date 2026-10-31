import { describe, expect, it } from "vitest";
import {
  areaResistanceThreshold,
  deriveResistanceRequestTargetOutcome,
  getSpellCastOutcome,
} from "./spell-cast-outcome";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";

const { Critical, Success, Failure } = AbilitySuccessLevelEnum;
const caster = "Scene.s.Token.caster";

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

  it("lets a GM ruling override whatever the request says", () => {
    expect(
      deriveResistanceRequestTargetOutcome(
        { ...request("Rolled"), gmRuling: "unaffected" },
        Success,
      ),
    ).toMatchObject({ state: "unaffected", resolvedBy: "gmRuling", casterSuccessLevel: undefined });
  });

  it("reads a failed resistance roll as the target holding", () => {
    expect(deriveResistanceRequestTargetOutcome(request("Rolled"), Failure)).toMatchObject({
      state: "unaffected",
      casterSuccessLevel: Failure,
    });
  });
});

describe("getSpellCastOutcome", () => {
  const entry = {
    id: "e1",
    actorUuid: "Actor.a",
    tokenUuid: "Scene.s.Token.a",
    isCaster: false,
    stage: "affected",
    state: "affected",
    resolvedBy: "resistanceRoll",
    casterSuccessLevel: Critical,
    effectUuids: [],
    effectBlockedReason: "",
    reflectedFromId: "",
    requestMessageId: "",
  };
  const system = {
    spellUuid: "Actor.c.Item.spell",
    casterActorUuid: "Actor.c",
    casterTokenUuid: caster,
    castSuccessLevel: Success,
  };

  it("reads each target off the cast record, by token when it has one", () => {
    const untargeted = {
      ...entry,
      id: "e2",
      actorUuid: "",
      tokenUuid: "",
      state: "pending",
      resolvedBy: null,
      casterSuccessLevel: null,
    };
    expect(
      getSpellCastOutcome({
        id: "cast",
        type: "spellCast",
        system: { ...system, targets: [entry, untargeted] },
      }),
    ).toEqual({
      ...system,
      targets: [
        {
          entryId: "e1",
          targetTokenOrActorUuid: "Scene.s.Token.a",
          state: "affected",
          resolvedBy: "resistanceRoll",
          casterSuccessLevel: Critical,
        },
        {
          entryId: "e2",
          targetTokenOrActorUuid: "",
          state: "pending",
          resolvedBy: undefined,
          casterSuccessLevel: undefined,
        },
      ],
    });
  });

  it("reads the combined card's record too, but not a request card that only answers", () => {
    const combined = {
      id: "c",
      type: "resistanceRequest",
      system: { ...system, targets: [entry] },
    };
    expect(getSpellCastOutcome(combined)?.targets).toHaveLength(1);
    const answering = {
      id: "r",
      type: "resistanceRequest",
      system: { targets: [], entryId: "e1" },
    };
    expect(getSpellCastOutcome(answering)).toBeUndefined();
    expect(getSpellCastOutcome({ id: "x", type: "combat", system: {} })).toBeUndefined();
  });
});

describe("areaResistanceThreshold", () => {
  it("reads the roll on the resistance table, like Harmony's example (RBM p.62)", () => {
    // POW 14 rolling 42: everyone with POW 15 or less
    expect(areaResistanceThreshold(14, 42, 1)).toBe(15);
    expect(areaResistanceThreshold(15, 50, 1)).toBe(15);
    expect(areaResistanceThreshold(15, 51, 1)).toBe(14);
  });

  it("affects everyone on 5 or less, and no one on 96 or more", () => {
    expect(areaResistanceThreshold(10, 5, 1)).toBe("all");
    expect(areaResistanceThreshold(10, 96, 1)).toBe("none");
  });

  it("affects no one when the threshold is below the lowest value a target can have", () => {
    // POW 8 rolling 95: "POW -1 or lower"
    expect(areaResistanceThreshold(8, 95, 1)).toBe("none");
    // POW 8 rolling 90 reaches 0: no one has POW 0, but a target can have 0 magic points
    expect(areaResistanceThreshold(8, 90, 1)).toBe("none");
    expect(areaResistanceThreshold(8, 90, 0)).toBe(0);
  });
});

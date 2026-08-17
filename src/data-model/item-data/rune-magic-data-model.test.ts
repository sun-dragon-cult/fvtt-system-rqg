import { describe, expect, it } from "vitest";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";
import { RuneMagicDataModel } from "./rune-magic-data-model";

describe("RuneMagicDataModel chance helpers", () => {
  it("chooses the strongest eligible rune by chance", () => {
    const moonRune = {
      system: { chance: 70 },
    } as Parameters<typeof RuneMagicDataModel.getStrongestRune>[0][number];
    const airRune = {
      system: { chance: 90 },
    } as Parameters<typeof RuneMagicDataModel.getStrongestRune>[0][number];

    expect(RuneMagicDataModel.getStrongestRune([moonRune, airRune])).toBe(airRune);
  });

  it("calculates cast chance from the chosen rune plus modifiers and clamps at zero", () => {
    const rune = {
      system: { chance: 55 },
    } as Parameters<typeof RuneMagicDataModel.calculateCastChance>[0];

    expect(
      RuneMagicDataModel.calculateCastChance(rune, [{ value: 20 }, { value: -10 }, { value: "5" }]),
    ).toBe(70);

    expect(RuneMagicDataModel.calculateCastChance(rune, [{ value: -80 }])).toBe(0);
  });

  it("calculates cast chance from serialized base chance values", () => {
    expect(
      RuneMagicDataModel.calculateCastChanceFromBaseChance(55, [
        { value: 20 },
        { value: -10 },
        { value: "5" },
      ]),
    ).toBe(70);

    expect(RuneMagicDataModel.calculateCastChanceFromBaseChance(55, [{ value: -80 }])).toBe(0);
    expect(RuneMagicDataModel.calculateCastChanceFromBaseChance(Number.NaN, [{ value: 10 }])).toBe(
      10,
    );
  });

  it("validates available rune and magic points for casting", () => {
    const fakeModel = {
      getCult: () => ({ system: { runePoints: { value: 4 } } }),
      getCastingCult: () => ({ system: { runePoints: { value: 4 } } }),
      parent: { actor: { system: { attributes: { magicPoints: { value: 7 } } } } },
    } as unknown as RuneMagicDataModel;

    expect(
      RuneMagicDataModel.prototype.getCastValidationError.call(fakeModel, 3, 2),
    ).toBeUndefined();
    expect(RuneMagicDataModel.prototype.getCastValidationError.call(fakeModel, 5, 2)).toContain(
      "RQG.Item.RuneMagic.validationNotEnoughRunePoints",
    );
    expect(RuneMagicDataModel.prototype.getCastValidationError.call(fakeModel, 3, 9)).toContain(
      "RQG.Item.RuneMagic.validationNotEnoughMagicPoints",
    );
  });

  it("counts a chosen magic point source's stored points for the boost, leaving Rune Points cult-sourced (#956)", () => {
    const fakeModel = {
      getCult: () => ({ system: { runePoints: { value: 4 } } }),
      getCastingCult: () => ({ system: { runePoints: { value: 4 } } }),
      parent: {
        actor: {
          items: [
            {
              id: "crystal-1",
              type: "gear",
              system: {
                storedMagicPoints: { value: 4, max: 5, identified: true },
                equippedStatus: "equipped",
                attunedTo: "Attuned",
              },
            },
          ],
          system: { attributes: { magicPoints: { value: 1 } } },
          getFlag: () => undefined,
        },
      },
    } as unknown as RuneMagicDataModel;

    // Only 1 MP of the caster's own pool - not enough for a boost of 3 without a source.
    expect(RuneMagicDataModel.prototype.getCastValidationError.call(fakeModel, 3, 3)).toContain(
      "RQG.Item.RuneMagic.validationNotEnoughMagicPoints",
    );

    // Picking the crystal covers the boost; Rune Points are still validated against the cult.
    expect(
      RuneMagicDataModel.prototype.getCastValidationError.call(fakeModel, 3, 3, "crystal-1"),
    ).toBeUndefined();
    expect(
      RuneMagicDataModel.prototype.getCastValidationError.call(fakeModel, 5, 3, "crystal-1"),
    ).toContain("RQG.Item.RuneMagic.validationNotEnoughRunePoints");
  });

  it("calculates rune and magic point costs from the roll result", () => {
    expect(RuneMagicDataModel.calculatePointCosts(AbilitySuccessLevelEnum.Critical, 3, 2)).toEqual({
      rp: 0,
      mp: 2,
      exp: true,
    });
    expect(RuneMagicDataModel.calculatePointCosts(AbilitySuccessLevelEnum.Special, 3, 2)).toEqual({
      rp: 3,
      mp: 2,
      exp: true,
    });
    expect(RuneMagicDataModel.calculatePointCosts(AbilitySuccessLevelEnum.Failure, 3, 2)).toEqual({
      rp: 0,
      mp: 1,
      exp: false,
    });
    expect(RuneMagicDataModel.calculatePointCosts(AbilitySuccessLevelEnum.Fumble, 3, 0)).toEqual({
      rp: 3,
      mp: 0,
      exp: false,
    });
  });
});

describe("RuneMagicDataModel.getCastingCult (#1002)", () => {
  it("returns the spell's own cult unchanged when casterActor is the spell's own owner", () => {
    const ownActor = {};
    const ownCult = { id: "cult1", system: { runePoints: { value: 4 } } };
    const fakeModel = {
      getCult: () => ownCult,
      parent: { actor: ownActor },
    } as unknown as RuneMagicDataModel;

    expect(RuneMagicDataModel.prototype.getCastingCult.call(fakeModel, ownActor as any)).toBe(
      ownCult,
    );
  });

  it("matches the caster's own Cult item by rqid when casterActor is a different actor", () => {
    const casterCult = { id: "cult-on-caster", system: { runePoints: { value: 2 } } };
    const casterActor = {
      uuid: "Actor.caster",
      getBestEmbeddedDocumentByRqid: (rqid: string) =>
        rqid === "je.orlanth" ? casterCult : undefined,
    } as any;
    const fakeModel = {
      getCult: () => ({
        id: "cult-on-owner",
        getFlag: (_scope: string, key: string) =>
          key === "documentRqidFlags" ? { id: "je.orlanth" } : undefined,
      }),
      parent: {
        actor: { uuid: "Actor.owner" /* the spell's own owner, distinct from casterActor */ },
      },
    } as unknown as RuneMagicDataModel;

    expect(RuneMagicDataModel.prototype.getCastingCult.call(fakeModel, casterActor)).toBe(
      casterCult,
    );
  });

  it("returns undefined when the caster has no matching cult", () => {
    const casterActor = {
      uuid: "Actor.caster",
      getBestEmbeddedDocumentByRqid: () => undefined,
    } as any;
    const fakeModel = {
      getCult: () => ({
        id: "cult-on-owner",
        getFlag: (_scope: string, key: string) =>
          key === "documentRqidFlags" ? { id: "je.orlanth" } : undefined,
      }),
      parent: { actor: { uuid: "Actor.owner" } },
    } as unknown as RuneMagicDataModel;

    expect(
      RuneMagicDataModel.prototype.getCastingCult.call(fakeModel, casterActor),
    ).toBeUndefined();
  });

  it("returns undefined when the spell has no cult at all", () => {
    const fakeModel = {
      getCult: () => undefined,
      parent: { actor: {} },
    } as unknown as RuneMagicDataModel;

    expect(RuneMagicDataModel.prototype.getCastingCult.call(fakeModel, {} as any)).toBeUndefined();
  });
});

describe("RuneMagicDataModel.getEligibleRunes with an external caster (#1002)", () => {
  it("searches the caster's own Runes and cult, not the spell owner's", () => {
    const casterWaterRune = { id: "caster-water", system: { chance: 60 } };
    const casterActor = {
      getBestEmbeddedDocumentByRqid: (rqid: string) =>
        rqid === "i.rune.water" ? casterWaterRune : undefined,
    } as any;
    const fakeModel = {
      runeRqidLinks: [{ rqid: "i.rune.water" }],
      getCastingCult: () => ({
        system: { runeRqidLinks: [{ rqid: "i.rune.magic" }] },
      }),
      parent: { actor: {/* the spell's own owner */} },
    } as unknown as RuneMagicDataModel;

    expect(RuneMagicDataModel.prototype.getEligibleRunes.call(fakeModel, casterActor)).toEqual([
      casterWaterRune,
    ]);
  });

  it("is empty when the caster has no matching cult to cast under", () => {
    const casterActor = { getBestEmbeddedDocumentByRqid: () => undefined } as any;
    const fakeModel = {
      runeRqidLinks: [{ rqid: "i.rune.water" }],
      getCastingCult: () => undefined,
      parent: { actor: {} },
    } as unknown as RuneMagicDataModel;

    expect(RuneMagicDataModel.prototype.getEligibleRunes.call(fakeModel, casterActor)).toEqual([]);
  });
});

describe("RuneMagicDataModel.migrateData", () => {
  it("rewrites a legacy string-typed isRitual value to a real boolean", () => {
    const migrated = RuneMagicDataModel.migrateData({ isRitual: "true," });

    expect(migrated["isRitual"]).toBe(true);
  });
});

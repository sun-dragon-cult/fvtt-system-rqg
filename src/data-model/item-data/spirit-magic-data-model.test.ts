import { describe, expect, it, vi } from "vitest";
import { SpiritMagicDataModel } from "./spirit-magic-data-model";
import { getTokenFromActor } from "../../system/util";

vi.mock("../../system/util", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../system/util")>()),
  getTokenFromActor: vi.fn(),
}));

describe("SpiritMagicDataModel cast validation", () => {
  it("validates learned level and available magic points", () => {
    const fakeModel = {
      points: 3,
      parent: { actor: { system: { attributes: { magicPoints: { value: 6 } } } } },
    } as unknown as SpiritMagicDataModel;

    expect(
      SpiritMagicDataModel.prototype.getCastValidationError.call(fakeModel, 2, 1),
    ).toBeUndefined();

    expect(SpiritMagicDataModel.prototype.getCastValidationError.call(fakeModel, 4, 0)).toContain(
      "RQG.Item.SpiritMagic.CantCastSpellAboveLearnedLevel",
    );

    expect(SpiritMagicDataModel.prototype.getCastValidationError.call(fakeModel, 3, 4)).toContain(
      "RQG.Item.SpiritMagic.NotEnoughMagicPoints",
    );
  });

  it("lets a hook raise the level above the learned one, up to the magic points", () => {
    const fakeModel = {
      points: 1,
      parent: { actor: { system: { attributes: { magicPoints: { value: 3 } } } } },
    } as unknown as SpiritMagicDataModel;
    const validate = (level: number, maxLevel?: number) =>
      SpiritMagicDataModel.prototype.getCastValidationError.call(
        fakeModel,
        level,
        0,
        undefined,
        undefined,
        maxLevel,
      );

    expect(validate(2)).toContain("RQG.Item.SpiritMagic.CantCastSpellAboveLearnedLevel");
    expect(validate(2, 2)).toBeUndefined();
    expect(validate(3, 2)).toContain("RQG.Item.SpiritMagic.CantCastSpellAboveLearnedLevel");
  });

  it("counts a chosen magic point source's stored points as available (#956)", () => {
    const fakeModel = {
      points: 3,
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
    } as unknown as SpiritMagicDataModel;

    // Only 1 MP of the caster's own pool - not enough for level 3 without a source.
    expect(SpiritMagicDataModel.prototype.getCastValidationError.call(fakeModel, 3, 0)).toContain(
      "RQG.Item.SpiritMagic.NotEnoughMagicPoints",
    );

    // Picking the crystal (4 points) covers it.
    expect(
      SpiritMagicDataModel.prototype.getCastValidationError.call(fakeModel, 3, 0, "crystal-1"),
    ).toBeUndefined();

    // "auto" sums the crystal and the caster's own pool.
    expect(
      SpiritMagicDataModel.prototype.getCastValidationError.call(fakeModel, 3, 2, "auto"),
    ).toBeUndefined();
  });
});

describe("SpiritMagicDataModel cast validation with an external caster (#1002)", () => {
  it("checks the caster's own available Magic Points, not the spell owner's", () => {
    const fakeModel = {
      points: 3,
      parent: { actor: { system: { attributes: { magicPoints: { value: 0 } } } } },
    } as unknown as SpiritMagicDataModel;
    const casterActor = { system: { attributes: { magicPoints: { value: 6 } } } } as any;

    // The item's own owner has 0 MP and would fail...
    expect(SpiritMagicDataModel.prototype.getCastValidationError.call(fakeModel, 2, 1)).toContain(
      "RQG.Item.SpiritMagic.NotEnoughMagicPoints",
    );

    // ...but an explicit external caster with enough MP succeeds.
    expect(
      SpiritMagicDataModel.prototype.getCastValidationError.call(
        fakeModel,
        2,
        1,
        undefined,
        casterActor,
      ),
    ).toBeUndefined();
  });
});

describe("SpiritMagicDataModel.migrateData", () => {
  it("rewrites a legacy string-typed isRitual value to a real boolean", () => {
    const migrated = SpiritMagicDataModel.migrateData({ isRitual: "true," });

    expect(migrated["isRitual"]).toBe(true);
  });
});

describe("SpiritMagicDataModel.cast token", () => {
  const caster = { name: "Sandene" } as any;
  const castWith = async (options: Record<string, unknown>) => {
    const castWithoutDialog = vi.fn(async (..._args: unknown[]) => undefined);
    await SpiritMagicDataModel.prototype.cast.call({ castWithoutDialog } as any, caster, {
      skipDialog: true,
      ...options,
    });
    return castWithoutDialog;
  };

  it("uses the caster's token on the scene when none is given", async () => {
    vi.mocked(getTokenFromActor).mockReturnValue({ id: "sceneToken" } as any);
    expect(await castWith({})).toHaveBeenCalledWith(
      caster,
      expect.objectContaining({ token: { id: "sceneToken" } }),
    );
    expect(getTokenFromActor).toHaveBeenCalledWith(caster, { linked: true });
  });

  it("keeps a given token", async () => {
    vi.mocked(getTokenFromActor).mockReturnValue({ id: "sceneToken" } as any);
    expect(await castWith({ token: { id: "given" } })).toHaveBeenCalledWith(
      caster,
      expect.objectContaining({ token: { id: "given" } }),
    );
  });
});

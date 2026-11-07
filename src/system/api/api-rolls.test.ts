import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runeMagic, spiritMagic } from "./api-rolls";
import { resolveActor } from "./api-resolve";
import { resolveMatrixSpellItem } from "../spell-matrix";

vi.mock("./api-resolve", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api-resolve")>()),
  resolveActor: vi.fn(),
}));
vi.mock("../spell-matrix", () => ({ resolveMatrixSpellItem: vi.fn() }));

describe("rolls with a castable spell", () => {
  const caster = {
    name: "Sandene",
    uuid: "Actor.sandene",
    castSpell: vi.fn(async () => undefined),
  };
  const castable = (type: string, casterUuid = "Actor.sandene") =>
    ({
      type,
      name: "Heal",
      source: "own",
      uuid: "Actor.sandene.Item.heal",
      matrix: undefined,
      casterUuid,
    }) as any;
  const originalFromUuidSync = globalThis.fromUuidSync;

  beforeEach(() => {
    vi.mocked(resolveActor).mockReturnValue({ actor: caster as any, token: null });
    globalThis.fromUuidSync = vi.fn(() => ({ name: "Heal" })) as any;
  });
  afterEach(() => {
    globalThis.fromUuidSync = originalFromUuidSync;
    vi.mocked(resolveActor).mockReset();
    caster.castSpell.mockClear();
  });

  it("is cast by the actor whose list it came from", async () => {
    await spiritMagic(castable("spiritMagic"));

    expect(resolveActor).toHaveBeenCalledWith("Actor.sandene");
    expect(caster.castSpell).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Heal" }),
      expect.anything(),
    );
  });

  it("works the same for rune magic", async () => {
    await runeMagic(castable("runeMagic"));

    expect(resolveActor).toHaveBeenCalledWith("Actor.sandene");
    expect(caster.castSpell).toHaveBeenCalled();
  });

  it("accepts the same actor given as the actor option", async () => {
    await spiritMagic(castable("spiritMagic"), { actor: "Sandene" });

    expect(resolveActor).toHaveBeenCalledWith("Sandene");
    expect(caster.castSpell).toHaveBeenCalled();
  });

  it("refuses another actor, whose items the listed spell can't come from", async () => {
    vi.mocked(resolveActor).mockReturnValue({
      actor: { name: "Aellara", uuid: "Actor.aellara" } as any,
      token: null,
    });

    await expect(spiritMagic(castable("spiritMagic"), { actor: "Aellara" })).rejects.toThrow(
      /castable spells of Actor\.sandene/,
    );
    expect(caster.castSpell).not.toHaveBeenCalled();
  });

  it("falls back to the selected token without a caster uuid", async () => {
    await spiritMagic(castable("spiritMagic", ""));

    expect(resolveActor).toHaveBeenCalledWith(undefined);
  });

  describe("from a matrix", () => {
    const crystal = {
      system: {
        equippedStatus: "equipped",
        matrixSpells: [{ spellRqidLink: { rqid: "i.spirit-magic.heal", name: "Heal" }, points: 2 }],
      },
    };
    const matrixSpell = () =>
      ({
        ...castable("spiritMagic"),
        source: "matrix",
        uuid: undefined,
        rqid: "i.spirit-magic.heal",
        matrix: { itemId: "crystal", entryIndex: 0 },
      }) as any;
    beforeEach(() => {
      (caster as any).items = { get: (id: string) => (id === "crystal" ? crystal : undefined) };
      vi.mocked(resolveMatrixSpellItem).mockResolvedValue({ name: "Heal" } as any);
      crystal.system.equippedStatus = "equipped";
      crystal.system.matrixSpells[0]!.spellRqidLink.rqid = "i.spirit-magic.heal";
    });

    it("casts the spell in the matrix entry", async () => {
      await spiritMagic(matrixSpell());
      expect(resolveMatrixSpellItem).toHaveBeenCalledWith(crystal, 0);
      expect(caster.castSpell).toHaveBeenCalled();
    });

    it("refuses a listed spell whose matrix was unequipped since", async () => {
      crystal.system.equippedStatus = "carried";
      await expect(spiritMagic(matrixSpell())).rejects.toThrow(/no longer in an equipped matrix/);
      expect(caster.castSpell).not.toHaveBeenCalled();
    });

    it("refuses a listed spell whose matrix entry now holds another spell", async () => {
      crystal.system.matrixSpells[0]!.spellRqidLink.rqid = "i.spirit-magic.bladesharp";
      await expect(spiritMagic(matrixSpell())).rejects.toThrow(/no longer in an equipped matrix/);
    });
  });
});

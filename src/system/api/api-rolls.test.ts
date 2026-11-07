import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runeMagic, spiritMagic } from "./api-rolls";
import { resolveActor } from "./api-resolve";

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
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { barrierPriorities, meetBarriers, walkBarriers } from "./spell-barriers";
import { spellBehaviorForEffect } from "./spell-behavior";

vi.mock("./spell-behavior", () => ({
  spellBehaviorForEffect: vi.fn(),
  guardSpellBehavior: async (_name: string, run: () => Promise<void>) => run(),
}));
vi.mock("../util", () => ({ localize: (key: string) => key }));

const layer = (
  name: string,
  priority: number,
  strength: number,
  usedUp: "never" | "unlessLayerTwoStronger" = "never",
) => ({ name, priority, strength, usedUp });
const names = (layers: { name: string }[]) => layers.map((l) => l.name);

describe("walkBarriers", () => {
  const ward = layer("ward", barrierPriorities.area, 4);
  const countermagic = layer(
    "countermagic",
    barrierPriorities.consumable,
    4,
    "unlessLayerTwoStronger",
  );
  const shield = layer("shield", barrierPriorities.lasting, 4);

  it("lets a spell through when there are no layers", () => {
    expect(walkBarriers([], 3)).toEqual({ usedUp: [] });
  });

  it("meets the layers from the lowest priority up, whatever order they come in", () => {
    const walk = walkBarriers([shield, countermagic, ward], 4);
    expect(walk.stoppedBy?.name).toBe("ward");
    expect(walk.usedUp).toEqual([]);
  });

  it("stops a spell at most as strong as a layer that is never used up", () => {
    expect(walkBarriers([shield], 4).stoppedBy?.name).toBe("shield");
    expect(walkBarriers([shield], 5).stoppedBy).toBeUndefined();
  });

  it("stops a spell 2+ points weaker than Countermagic and keeps it", () => {
    const walk = walkBarriers([countermagic], 2);
    expect(walk.stoppedBy?.name).toBe("countermagic");
    expect(walk.usedUp).toEqual([]);
  });

  it("uses up Countermagic within 1 point of the spell, which it stops", () => {
    for (const points of [3, 4, 5]) {
      const walk = walkBarriers([countermagic], points);
      expect(walk.stoppedBy?.name).toBe("countermagic");
      expect(names(walk.usedUp)).toEqual(["countermagic"]);
    }
  });

  it("breaks Countermagic 2+ points weaker and goes on at full strength to the Shield", () => {
    const walk = walkBarriers([countermagic, shield], 6);
    expect(walk.stoppedBy).toBeUndefined();
    expect(names(walk.usedUp)).toEqual(["countermagic"]);
    expect(walkBarriers([countermagic, shield], 6).usedUp).toHaveLength(1);
  });

  it("lets Countermagic survive when an outer layer stops the spell first", () => {
    const walk = walkBarriers([countermagic, ward], 4);
    expect(walk.stoppedBy?.name).toBe("ward");
    expect(walk.usedUp).toEqual([]);
  });

  it("counts only the strongest of layers with equal priority", () => {
    const berserker = layer("berserker", barrierPriorities.consumable, 2, "unlessLayerTwoStronger");
    const walk = walkBarriers([berserker, countermagic], 6);
    expect(names(walk.usedUp)).toEqual(["countermagic"]);
  });

  it("puts a module's layer between the system's by its priority", () => {
    const module = layer("module", 250, 9);
    const walk = walkBarriers([shield, countermagic, module], 6);
    expect(walk.stoppedBy?.name).toBe("module");
    expect(names(walk.usedUp)).toEqual(["countermagic"]);
  });
});

describe("meetBarriers with a module's broken barrier", () => {
  const cast = {
    spellRqid: "i.spirit-magic.befuddle",
    caster: { actorUuid: "Actor.c", tokenUuid: "" },
    castMessageId: "m",
    level: 2,
    magicPointsSpent: 2,
    runePointsSpent: 0,
    casterSuccessLevel: undefined,
  };
  const targetWith = (name: string) => {
    const effect = { name, active: true, delete: vi.fn() };
    return { effect, actor: { allApplicableEffects: () => [effect] } as any };
  };
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    (globalThis as any).ui = { notifications: { info: vi.fn(), warn: vi.fn() } };
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("skips a barrier without a priority and warns once", async () => {
    vi.mocked(spellBehaviorForEffect).mockReturnValue({
      barrier: { strength: () => 9, usedUp: "never" } as any,
    });
    const { actor } = targetWith("Broken Screen");

    expect(await meetBarriers("Befuddle", cast, actor, undefined, undefined)).toBe(false);
    await meetBarriers("Befuddle", cast, actor, undefined, undefined);
    const warnings = warn.mock.calls.filter((args: unknown[]) =>
      String(args[0]).includes("Broken Screen"),
    );
    expect(warnings).toHaveLength(1);
    expect(String(warnings[0]![0])).toContain("priority");
  });

  it("meets a barrier with an unknown usedUp as never used up, and warns", async () => {
    vi.mocked(spellBehaviorForEffect).mockReturnValue({
      barrier: { priority: 200, strength: () => 2, usedUp: "countermagic" } as any,
    });
    const { actor, effect } = targetWith("Old Countermagic");

    expect(await meetBarriers("Befuddle", cast, actor, undefined, undefined)).toBe(true);
    expect(effect.delete).not.toHaveBeenCalled();
    expect(
      warn.mock.calls.some((args: unknown[]) =>
        String(args[0]).includes('unknown usedUp "countermagic"'),
      ),
    ).toBe(true);
  });
});

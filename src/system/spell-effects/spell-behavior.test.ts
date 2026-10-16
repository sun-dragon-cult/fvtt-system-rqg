import { afterEach, describe, expect, it, vi } from "vitest";
import {
  guardSpellBehavior,
  initSpellBehaviors,
  pickRegistration,
  spellBehavior,
  spellBehaviorForEffect,
  type SpellBehaviorRegistry,
} from "./spell-behavior";

const reg = (name: string, lang: string, priority = 0) => ({ name, lang, priority });

describe("pickRegistration", () => {
  it("prefers the world's language, then the fallback language, then any", () => {
    const registrations = [reg("de", "de"), reg("en", "en"), reg("sv", "sv")];
    expect(pickRegistration(registrations, "sv", "en")?.name).toBe("sv");
    expect(pickRegistration(registrations, "es", "en")?.name).toBe("en");
    expect(pickRegistration([reg("de", "de")], "sv", "en")?.name).toBe("de");
  });

  it("takes the highest priority within a language, the first registered on a tie", () => {
    const registrations = [reg("wiki", "en", 0), reg("homebrew", "en", 10), reg("late", "en", 10)];
    expect(pickRegistration(registrations, "en", "en")?.name).toBe("homebrew");
  });

  it("is undefined when nothing is registered", () => {
    expect(pickRegistration([], "en", "en")).toBeUndefined();
  });
});

describe("spellBehavior", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function register(registrations: (registry: SpellBehaviorRegistry) => void): void {
    let fireSetup = () => {};
    vi.stubGlobal("Hooks", {
      once: vi.fn((hook: string, fn: () => void) => {
        if (hook === "setup") {
          fireSetup = fn;
        }
      }),
      callAll: vi.fn((_hook: string, registry: SpellBehaviorRegistry) => registrations(registry)),
    });
    initSpellBehaviors();
    fireSetup();
  }

  it("finds what modules registered from the hook, in the world's language", () => {
    register((registry) => {
      registry.register("i.rune-magic.heal-body", { runAsGm: false }, { lang: "en", priority: 0 });
      registry.register("i.rune-magic.heal-body", { runAsGm: true }, { lang: "sv", priority: 0 });
    });
    expect(spellBehavior("i.rune-magic.heal-body")?.runAsGm).toBe(false);
    expect(spellBehavior("i.rune-magic.unknown")).toBeUndefined();
  });

  it("keeps a hook registered for several spells one function, so their effects group", () => {
    const spellBarrier = async () => ({ outcome: "pass" as const });
    register((registry) => {
      registry.register("i.spirit-magic.countermagic", { onIncomingSpell: spellBarrier }, en);
      registry.register("i.rune-magic.shield", { onIncomingSpell: spellBarrier }, en);
    });
    expect(spellBehavior("i.spirit-magic.countermagic")?.onIncomingSpell).toBe(
      spellBehavior("i.rune-magic.shield")?.onIncomingSpell,
    );
  });

  it("guards a function per hook it is registered as", async () => {
    const stops = async () => ({ outcome: "stopped" as const });
    register((registry) => {
      registry.register("i.spirit-magic.a", { apply: stops as any }, en);
      registry.register("i.spirit-magic.b", { onIncomingSpell: stops }, en);
    });
    const scope = { spell: { name: "Spell" }, effects: [] } as any;
    expect(await spellBehavior("i.spirit-magic.b")?.onIncomingSpell?.(scope)).toEqual({
      outcome: "stopped",
    });
  });

  it("gives a spell area's effect on its caster no behavior, so its hooks act on the area's tokens", () => {
    const entry = () => {};
    register((registry) => {
      registry.register("i.rune-magic.shake-earth", { onPrepareAbilityRoll: entry }, en);
    });
    const effect = (spellArea: string | undefined) =>
      ({
        system: { spell: { spellRqid: "i.rune-magic.shake-earth" } },
        getFlag: () => spellArea,
      }) as any;
    expect(spellBehaviorForEffect(effect(undefined))?.onPrepareAbilityRoll).toBeDefined();
    expect(spellBehaviorForEffect(effect("Scene.s.Region.r"))).toBeUndefined();
  });

  it("contains a failing onResisted, so the resisted spell just stays resisted", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    register((registry) => {
      registry.register(
        "i.rune-magic.reflection",
        { onResisted: () => Promise.reject(new Error("x")) },
        en,
      );
    });
    const scope = { spell: { name: "Spell" }, effects: [{ name: "Reflection" }] } as any;
    expect(await spellBehavior("i.rune-magic.reflection")?.onResisted?.(scope)).toBeUndefined();
    vi.restoreAllMocks();
  });

  it("contains a failing or malformed apply", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    register((registry) => {
      registry.register(
        "i.spirit-magic.throws",
        { apply: () => Promise.reject(new Error("x")) },
        en,
      );
      registry.register("i.spirit-magic.garbage", { apply: async () => ({ done: 1 }) as any }, en);
    });
    const scope = { spell: { name: "Spell" } } as any;
    expect(await spellBehavior("i.spirit-magic.throws")?.apply?.(scope)).toBeUndefined();
    expect(await spellBehavior("i.spirit-magic.garbage")?.apply?.(scope)).toBeUndefined();
    vi.restoreAllMocks();
  });

  it("guards roll entries synchronously: a throw is logged, not passed on", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    register((registry) => {
      registry.register(
        "i.spirit-magic.entry-throws",
        {
          onPrepareAttack: () => {
            throw new Error("x");
          },
        },
        en,
      );
    });
    const scope = { effects: [{ name: "Berserker" }] } as any;
    expect(() =>
      spellBehavior("i.spirit-magic.entry-throws")?.onPrepareAttack?.(scope),
    ).not.toThrow();
    expect(console.error).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("keeps a roll entry registered for several spells one function", () => {
    const noParry = () => {};
    register((registry) => {
      registry.register("i.rune-magic.entry-shared-a", { onPrepareDefence: noParry }, en);
      registry.register("i.spirit-magic.entry-shared-b", { onPrepareDefence: noParry }, en);
    });
    expect(spellBehavior("i.rune-magic.entry-shared-a")?.onPrepareDefence).toBe(
      spellBehavior("i.spirit-magic.entry-shared-b")?.onPrepareDefence,
    );
  });
});

const en = { lang: "en", priority: 0 };

describe("guardSpellBehavior", () => {
  it("returns what the call returns", async () => {
    expect(await guardSpellBehavior("Shield", async () => 3)).toBe(3);
  });

  it("logs a failing call and returns undefined, so the spell goes on", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await guardSpellBehavior("Shield", async () => {
      throw new Error("broken macro");
    });
    expect(result).toBeUndefined();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

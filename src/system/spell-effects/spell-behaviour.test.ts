import { afterEach, describe, expect, it, vi } from "vitest";
import {
  guardSpellBehaviour,
  initSpellBehaviours,
  pickRegistration,
  spellBehaviour,
  type SpellBehaviourRegistry,
} from "./spell-behaviour";

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

describe("spellBehaviour", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function register(registrations: (registry: SpellBehaviourRegistry) => void): void {
    let fireSetup = () => {};
    vi.stubGlobal("Hooks", {
      once: vi.fn((hook: string, fn: () => void) => {
        if (hook === "setup") {
          fireSetup = fn;
        }
      }),
      callAll: vi.fn((_hook: string, registry: SpellBehaviourRegistry) => registrations(registry)),
    });
    initSpellBehaviours();
    fireSetup();
  }

  it("finds what modules registered from the hook, in the world's language", () => {
    register((registry) => {
      registry.register("i.rune-magic.heal-body", { runAsGm: false }, { lang: "en", priority: 0 });
      registry.register("i.rune-magic.heal-body", { runAsGm: true }, { lang: "sv", priority: 0 });
    });
    expect(spellBehaviour("i.rune-magic.heal-body")?.runAsGm).toBe(false);
    expect(spellBehaviour("i.rune-magic.unknown")).toBeUndefined();
  });

  it("keeps a hook registered for several spells one function, so their effects group", () => {
    const spellBarrier = async () => ({ outcome: "pass" as const });
    register((registry) => {
      registry.register("i.spirit-magic.countermagic", { onIncomingSpell: spellBarrier }, en);
      registry.register("i.rune-magic.shield", { onIncomingSpell: spellBarrier }, en);
    });
    expect(spellBehaviour("i.spirit-magic.countermagic")?.onIncomingSpell).toBe(
      spellBehaviour("i.rune-magic.shield")?.onIncomingSpell,
    );
  });

  it("guards a function per hook it is registered as", async () => {
    const stops = async () => ({ outcome: "stopped" as const });
    register((registry) => {
      registry.register("i.spirit-magic.a", { apply: stops as any }, en);
      registry.register("i.spirit-magic.b", { onIncomingSpell: stops }, en);
    });
    const scope = { spell: { name: "Spell" }, effects: [] } as any;
    expect(await spellBehaviour("i.spirit-magic.b")?.onIncomingSpell?.(scope)).toEqual({
      outcome: "stopped",
    });
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
    expect(await spellBehaviour("i.spirit-magic.throws")?.apply?.(scope)).toBeUndefined();
    expect(await spellBehaviour("i.spirit-magic.garbage")?.apply?.(scope)).toBeUndefined();
    vi.restoreAllMocks();
  });
});

const en = { lang: "en", priority: 0 };

describe("guardSpellBehaviour", () => {
  it("returns what the call returns", async () => {
    expect(await guardSpellBehaviour("Shield", async () => 3)).toBe(3);
  });

  it("logs a failing call and returns undefined, so the spell goes on", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await guardSpellBehaviour("Shield", async () => {
      throw new Error("broken macro");
    });
    expect(result).toBeUndefined();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

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

  it("finds what modules registered from the hook, in the world's language", () => {
    let fireSetup = () => {};
    vi.stubGlobal("Hooks", {
      once: vi.fn((hook: string, fn: () => void) => {
        if (hook === "setup") {
          fireSetup = fn;
        }
      }),
      callAll: vi.fn((_hook: string, registry: SpellBehaviourRegistry) => {
        registry.register("i.rune-magic.shield", en, { lang: "en", priority: 0 });
        registry.register("i.rune-magic.shield", sv, { lang: "sv", priority: 0 });
      }),
    });
    const en = { runAsGm: false };
    const sv = { runAsGm: true };
    initSpellBehaviours();
    fireSetup();

    expect(spellBehaviour("i.rune-magic.shield")).toBe(en);
    expect(spellBehaviour("i.rune-magic.unknown")).toBeUndefined();
  });
});

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

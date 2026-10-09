import { afterEach, describe, expect, it, vi } from "vitest";
import { Rqid } from "../api/rqid-api";
import {
  guardSpellBehaviour,
  pickRegistration,
  spellBehavioursForEffects,
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

describe("spellBehavioursForEffects", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("runs a Macro override once per spell, so its effects share one behaviour", async () => {
    class MockMacro {
      execute = vi.fn(async () => ({ onIncomingSpell: async () => ({ outcome: "pass" }) }));
    }
    const macro = new MockMacro();
    vi.stubGlobal("Macro", MockMacro);
    vi.spyOn(Rqid, "fromRqid").mockResolvedValue(macro as any);
    const spellItem = {
      name: "Countermagic",
      flags: { rqg: { documentRqidFlags: { id: "i.spirit-magic.countermagic" } } },
      system: { effectRqidLink: { rqid: "m..house-countermagic" } },
    };
    vi.stubGlobal(
      "fromUuid",
      vi.fn(async () => spellItem),
    );
    const effect = () =>
      ({
        system: { spell: { spellUuid: "Item.cm", spellRqid: "i.spirit-magic.countermagic" } },
      }) as any;
    const [first, second] = [effect(), effect()];

    const behaviours = await spellBehavioursForEffects([first, second]);

    expect(macro.execute).toHaveBeenCalledTimes(1);
    expect(behaviours.get(first)).toBeDefined();
    expect(behaviours.get(first)).toBe(behaviours.get(second));
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

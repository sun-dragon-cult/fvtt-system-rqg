import { describe, expect, it } from "vitest";
import { pickRegistration } from "./spell-behaviour";

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

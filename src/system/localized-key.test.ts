import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toKey, toLabel } from "./localized-key";

const prefix = "RQG.Item.Passion.PassionEnum.";
const keys = ["Loyalty", "Hate"];
const spanish: Record<string, string> = {
  [`${prefix}Loyalty`]: "Lealtad",
  [`${prefix}Hate`]: "Odio",
};

describe("localized keys", () => {
  const i18n = game.i18n as unknown as { localize: unknown; format: unknown; _fallback: object };
  const { localize, format, _fallback } = i18n;

  beforeEach(() => {
    i18n.localize = vi.fn((id: string) => spanish[id] ?? id);
    i18n.format = i18n.localize;
    i18n._fallback = { RQG: { Item: { Passion: { PassionEnum: { Loyalty: "Loyalty" } } } } };
  });
  afterEach(() => {
    i18n.localize = localize;
    i18n.format = format;
    i18n._fallback = _fallback;
  });

  it("shows a known key as its label and custom text as is", () => {
    expect(toLabel("Loyalty", prefix, keys)).toBe("Lealtad");
    expect(toLabel("Lealtad a la reina", prefix, keys)).toBe("Lealtad a la reina");
  });

  it("stores the key for a key or a label in the current language or English", () => {
    expect(toKey("Loyalty", prefix, keys)).toBe("Loyalty");
    expect(toKey(" lealtad ", prefix, keys)).toBe("Loyalty");
    expect(toKey("Odio", prefix, keys)).toBe("Hate");
    expect(toKey("loyalty", prefix, keys)).toBe("Loyalty");
  });

  it("stores custom text as typed, trimmed", () => {
    expect(toKey(" Glotonería ", prefix, keys)).toBe("Glotonería");
    expect(toKey("", prefix, keys)).toBe("");
  });
});

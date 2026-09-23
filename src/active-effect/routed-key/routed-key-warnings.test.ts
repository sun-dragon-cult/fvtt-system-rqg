import { describe, expect, it } from "vitest";
import enLocale from "../../../static/i18n/en/uiContent.json";
import {
  ALL_ROUTED_KEY_WARNING_REASONS,
  RoutedKeyWarningTracker,
  routedKeyWarningI18nKey,
} from "./routed-key-warnings";

describe("routedKeyWarningI18nKey", () => {
  it("maps a reason to its RoutedKey locale key", () => {
    expect(routedKeyWarningI18nKey("no-match")).toBe("RQG.Foundry.ActiveEffect.RoutedKey.NoMatch");
    expect(routedKeyWarningI18nKey("field-not-found")).toBe(
      "RQG.Foundry.ActiveEffect.RoutedKey.FieldNotFound",
    );
  });

  it("has a real en locale string for every reason", () => {
    for (const reason of ALL_ROUTED_KEY_WARNING_REASONS) {
      const message = routedKeyWarningI18nKey(reason)
        .split(".")
        .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], enLocale);
      expect(message).toBeTypeOf("string");
    }
  });
});

describe("RoutedKeyWarningTracker", () => {
  it("warns once per (effect, change key, reason)", () => {
    const tracker = new RoutedKeyWarningTracker();
    const key = "@.:system.effect.add.melee.attack";
    expect(tracker.shouldWarn("Effect.abc", key, "field-not-found")).toBe(true);
    expect(tracker.shouldWarn("Effect.abc", key, "field-not-found")).toBe(false);
    // different key
    expect(
      tracker.shouldWarn("Effect.abc", "@.:system.effect.add.missile.attack", "field-not-found"),
    ).toBe(true);
    // different reason on the same key
    expect(tracker.shouldWarn("Effect.abc", key, "no-match")).toBe(true);
    // different effect
    expect(tracker.shouldWarn("Effect.def", key, "field-not-found")).toBe(true);
  });
});

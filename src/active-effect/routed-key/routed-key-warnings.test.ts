import { describe, expect, it } from "vitest";
import enLocale from "../../../static/i18n/en/uiContent.json";
import {
  ALL_ROUTED_KEY_WARNING_REASONS,
  RoutedKeyWarningTracker,
  routedKeyWarningI18nKey,
  routedKeyWarningI18nSuffix,
} from "./routed-key-warnings";

describe("routedKeyWarningI18nKey", () => {
  it("PascalCases the reason under the RoutedKey prefix", () => {
    expect(routedKeyWarningI18nKey("no-match")).toBe("RQG.Foundry.ActiveEffect.RoutedKey.NoMatch");
    expect(routedKeyWarningI18nSuffix("pad-override-discards-stacking")).toBe(
      "PadOverrideDiscardsStacking",
    );
  });

  it("has a locale key for every reason it lists", () => {
    // ROUTED_KEY_WARNING_REASONS is typed Record<RoutedKeyWarningReason, true>, so a missing
    // reason is a compile error; this asserts each listed reason resolves to a real locale key.
    expect(new Set(ALL_ROUTED_KEY_WARNING_REASONS).size).toBe(
      ALL_ROUTED_KEY_WARNING_REASONS.length,
    );
    for (const reason of ALL_ROUTED_KEY_WARNING_REASONS) {
      const message = routedKeyWarningI18nKey(reason)
        .split(".")
        .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], enLocale);
      expect(message).toBeTypeOf("string");
    }
  });
});

describe("RoutedKeyWarningTracker", () => {
  it("warns once per (effect, change row, reason)", () => {
    const tracker = new RoutedKeyWarningTracker();
    expect(tracker.shouldWarn("Effect.abc", 0, "no-match")).toBe(true);
    expect(tracker.shouldWarn("Effect.abc", 0, "no-match")).toBe(false);
    // different row
    expect(tracker.shouldWarn("Effect.abc", 1, "no-match")).toBe(true);
    // different reason on the same row
    expect(tracker.shouldWarn("Effect.abc", 0, "invalid-rqid")).toBe(true);
    // different effect
    expect(tracker.shouldWarn("Effect.def", 0, "no-match")).toBe(true);
  });

  it("re-warns after reset", () => {
    const tracker = new RoutedKeyWarningTracker();
    tracker.shouldWarn(undefined, 0, "no-match");
    tracker.reset();
    expect(tracker.shouldWarn(undefined, 0, "no-match")).toBe(true);
  });
});

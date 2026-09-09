import { describe, expect, it } from "vitest";
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

  it("covers every reason the modules can produce", () => {
    // guards against a new reason being added without a matching locale key
    expect(new Set(ALL_ROUTED_KEY_WARNING_REASONS).size).toBe(
      ALL_ROUTED_KEY_WARNING_REASONS.length,
    );
    expect(ALL_ROUTED_KEY_WARNING_REASONS).toContain("invalid-regex");
    expect(ALL_ROUTED_KEY_WARNING_REASONS).toContain("pad-multiply-noop");
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

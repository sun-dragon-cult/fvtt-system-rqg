import { describe, expect, it } from "vitest";
import { parseRoutedKey } from "./parse-routed-key";

describe("parseRoutedKey", () => {
  it("passes native (non-@) keys straight through", () => {
    for (const key of ["system.baseChance", "name", "system.effect.add.melee.attack", ""]) {
      expect(parseRoutedKey(key)).toEqual({ routed: false });
    }
  });

  it("treats non-string keys as native", () => {
    expect(parseRoutedKey(undefined)).toEqual({ routed: false });
    expect(parseRoutedKey(42)).toEqual({ routed: false });
  });

  it("parses @<rqid>:<path>", () => {
    expect(parseRoutedKey("@i.skill.dodge:system.baseChance")).toEqual({
      routed: true,
      selector: { kind: "rqid", rqid: "i.skill.dodge" },
      systemPath: "system.baseChance",
    });
  });

  it("parses @~<regex>:<path>", () => {
    expect(parseRoutedKey("@~i\\.hit-location:system.naturalAp")).toEqual({
      routed: true,
      selector: { kind: "regex", pattern: "i\\.hit-location" },
      systemPath: "system.naturalAp",
    });
  });

  it("parses @.:<path> as item-local", () => {
    expect(parseRoutedKey("@.:system.effect.add.melee.attack")).toEqual({
      routed: true,
      selector: { kind: "item-local" },
      systemPath: "system.effect.add.melee.attack",
    });
  });

  it("splits on the first colon, so a regex containing a colon is not supported", () => {
    // selector becomes "~foo", path becomes "bar:system.x" which fails the system. check
    expect(parseRoutedKey("@~foo:bar:system.x")).toMatchObject({
      routed: true,
      error: { reason: "path-not-system" },
    });
  });

  it("reports missing-path for a bare @", () => {
    expect(parseRoutedKey("@")).toMatchObject({ routed: true, error: { reason: "missing-path" } });
  });

  it("rejects a key with no colon", () => {
    expect(parseRoutedKey("@system.effect.add.melee.attack")).toMatchObject({
      routed: true,
      error: { reason: "missing-path" },
    });
  });

  it("rejects an empty selector", () => {
    expect(parseRoutedKey("@:system.baseChance")).toMatchObject({
      routed: true,
      error: { reason: "empty-selector" },
    });
  });

  it("rejects a path that does not start with system.", () => {
    expect(parseRoutedKey("@.:flags.rqg.foo")).toMatchObject({
      routed: true,
      error: { reason: "path-not-system", detail: { systemPath: "flags.rqg.foo" } },
    });
  });

  it("rejects an empty regex", () => {
    expect(parseRoutedKey("@~:system.naturalAp")).toMatchObject({
      routed: true,
      error: { reason: "empty-regex" },
    });
  });

  it("rejects a regex that does not compile", () => {
    expect(parseRoutedKey("@~i\\.(hit:system.naturalAp")).toMatchObject({
      routed: true,
      error: { reason: "invalid-regex" },
    });
  });

  it("rejects an invalid rqid selector", () => {
    expect(parseRoutedKey("@not-an-rqid:system.baseChance")).toMatchObject({
      routed: true,
      error: { reason: "invalid-rqid", detail: { rqid: "not-an-rqid" } },
    });
  });
});

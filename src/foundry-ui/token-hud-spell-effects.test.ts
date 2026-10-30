import { describe, expect, it } from "vitest";
import { spellEffectHudEntries } from "./token-hud-spell-effects";

const actor = { name: "Miss Tafey" };
const broadsword = { name: "Broadsword" };

const effect = (name: string, extra: Record<string, unknown> = {}) => ({
  uuid: `uuid-${name}`,
  name,
  img: `${name}.svg`,
  parent: actor,
  active: true,
  isTemporary: true,
  duration: { label: "1m 20s" },
  ...extra,
});

describe("spellEffectHudEntries", () => {
  it("lists spell effects with the item they're on and the time left", () => {
    expect(spellEffectHudEntries([effect("bladesharp", { parent: broadsword })], actor)).toEqual([
      {
        uuid: "uuid-bladesharp",
        name: "bladesharp",
        img: "bladesharp.svg",
        itemName: "Broadsword",
        remaining: "1m 20s",
        active: true,
        automatic: false,
        description: "",
      },
    ]);
  });

  it("names no item for an effect on the actor, and no time for one that doesn't expire", () => {
    const [entry] = spellEffectHudEntries([effect("path-watch", { isTemporary: false })], actor);
    expect(entry).toMatchObject({ itemName: "", remaining: "" });
  });

  it("keeps a suspended one, marked inactive, sorted by name", () => {
    const entries = spellEffectHudEntries(
      [effect("sleep"), effect("bladesharp", { parent: broadsword, active: false })],
      actor,
    );
    expect(entries.map((e) => [e.name, e.active])).toEqual([
      ["bladesharp", false],
      ["sleep", true],
    ]);
  });

  it("takes effect automatically through its changes or its spell's behavior", () => {
    const entries = spellEffectHudEntries(
      [
        effect("bladesharp", { system: { changes: [{ key: "x" }] } }),
        effect("warding"),
        effect("befuddle"),
      ],
      actor,
      (e) => e.name === "warding",
    );
    expect(entries.map((e) => [e.name, e.automatic])).toEqual([
      ["befuddle", false],
      ["bladesharp", true],
      ["warding", true],
    ]);
  });

  it("shows the description as plain text", () => {
    const [entry] = spellEffectHudEntries(
      [effect("mobility", { description: "<p>Not automated:  <b>−1</b> strike rank</p>" })],
      actor,
    );
    expect(entry?.description).toBe("Not automated: −1 strike rank");
  });
});

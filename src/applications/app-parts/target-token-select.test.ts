import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildTargetTokenSelect,
  SEVERAL_TARGETS,
  selectedTargetValue,
  targetTokenOptions,
} from "./target-token-select";

const token = (id: string, name: string, x: number) => ({ id, name, x, y: 0 });

describe("targetTokenOptions", () => {
  it("offers none, the caster, then the others nearest first with their distance", () => {
    const caster = token("c", "Vasana", 0);
    const options = targetTokenOptions(
      [token("far", "Broo", 300), caster, token("near", "Zombie", 100)],
      caster,
      0.5,
    );
    expect(options.map((o) => o.value)).toEqual(["", "c", "near", "far"]);
    expect(options[2]!.label).toContain("meters,50");
  });

  it("marks a candidate with its warning next to its distance", () => {
    const caster = token("c", "Vasana", 0);
    const options = targetTokenOptions(
      [caster, { ...token("far", "Broo", 300), warning: "out of range" }, token("near", "Ash", 1)],
      caster,
      0.5,
    );
    expect(options.find((o) => o.value === "far")!.label).toContain(
      "RQG.Dialog.Common.TargetAtDistanceWarning",
    );
    expect(options.find((o) => o.value === "far")!.label).toContain("warning,out of range");
    expect(options.find((o) => o.value === "near")!.label).toContain(
      "RQG.Dialog.Common.TargetAtDistance +",
    );
  });

  it("leaves out no target when the caster is the default target", () => {
    const caster = token("c", "Vasana", 0);
    const options = targetTokenOptions([caster, token("near", "Zombie", 100)], caster, 0.5, false);
    expect(options.map((o) => o.value)).toEqual(["c", "near"]);
  });

  it("keeps no target without a caster token, since there is no default to pick", () => {
    const options = targetTokenOptions([token("a", "Ash", 100)], undefined, 1, false);
    expect(options.map((o) => o.value)).toEqual(["", "a"]);
  });

  it("lists the others by name, without distances, when there is no caster token", () => {
    const options = targetTokenOptions(
      [token("b", "Broo", 300), token("a", "Ash", 100)],
      undefined,
      1,
    );
    expect(options.map((o) => o.label)).toEqual(["RQG.Dialog.Common.NoTarget + ", "Ash", "Broo"]);
  });
});

describe("selectedTargetValue", () => {
  it("is the one target, none, or the several-targets option", () => {
    expect(selectedTargetValue(["a"])).toBe("a");
    expect(selectedTargetValue([])).toBe("");
    expect(selectedTargetValue(["a", "b"])).toBe(SEVERAL_TARGETS);
  });
});

describe("buildTargetTokenSelect", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("preselects the caster when nothing is targeted and it is the default", () => {
    vi.stubGlobal("game", { user: { id: "player", targets: new Set() } });
    vi.stubGlobal("canvas", { tokens: { placeables: [] } });
    const caster = { id: "c", visible: true, center: { x: 0, y: 0 }, document: { name: "Vasana" } };
    const from = caster as unknown as Parameters<typeof buildTargetTokenSelect>[0];
    expect(buildTargetTokenSelect(from, undefined, true).selected).toBe("c");
    expect(buildTargetTokenSelect(from).selected).toBe("");
    const target = { id: "t", document: { name: "Zombie" } };
    const targets = Object.assign(new Set([target]), { first: () => target });
    vi.stubGlobal("game", { user: { id: "player", targets } });
    expect(buildTargetTokenSelect(from, undefined, true).selected).toBe("t");
  });

  it("lists the tokens the user sees or is given ownership of, not the others", () => {
    const placeable = (id: string, visible: boolean, level?: number, hidden = false) => ({
      id,
      visible,
      center: { x: 0, y: 0 },
      document: { name: id, hidden },
      actor: { ownership: level === undefined ? {} : { player: level } },
    });
    vi.stubGlobal("game", { user: { id: "player", targets: new Set() } });
    vi.stubGlobal("CONST", { DOCUMENT_OWNERSHIP_LEVELS: { OBSERVER: 2 } });
    vi.stubGlobal("canvas", {
      tokens: {
        placeables: [
          placeable("seen", true),
          placeable("summoned", false, 2),
          placeable("hidden-summoned", false, 3, true),
          placeable("limited", false, 1),
          placeable("unseen", false),
        ],
      },
    });
    const { options } = buildTargetTokenSelect(undefined);
    expect(options.map((o) => o.value)).toEqual(["", "seen", "summoned"]);
  });
});

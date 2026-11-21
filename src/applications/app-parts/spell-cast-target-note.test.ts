import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSpellCastTargetNote } from "./spell-cast-target-note";
import { SpellResistedByEnum } from "../../data-model/item-data/spell";

vi.mock("./target-token-select", () => ({
  buildTargetTokenSelect: vi.fn(() => ({
    options: [{ value: "", label: "No target" }],
    selected: "",
  })),
  applyTargetTokenSelect: vi.fn(),
}));
vi.mock("../../system/util", async (original) => ({
  ...(await original<typeof import("../../system/util")>()),
  getTargetedTokenNames: () => "",
  localize: (key: string) => key,
}));

describe("buildSpellCastTargetNote", () => {
  afterEach(() => vi.unstubAllGlobals());

  const note = (targetKind: string, resistedBy = SpellResistedByEnum.None) => {
    vi.stubGlobal("game", { user: { targets: new Set() } });
    return buildSpellCastTargetNote(resistedBy, targetKind, undefined);
  };

  it.each(["creature", "spirit", "hitLocation", "spellOrEffect", "weapon", "object"])(
    "offers a target picker for a %s spell",
    (targetKind) => {
      expect(note(targetKind).targetOptions).not.toEqual([]);
    },
  );

  it.each(["area", "radius", "ritual"])("offers no picker for a %s spell", (targetKind) => {
    expect(note(targetKind).targetOptions).toEqual([]);
  });

  it("offers no picker for a spell that goes on its caster", () => {
    expect(note("self").targetOptions).toEqual([]);
  });
});

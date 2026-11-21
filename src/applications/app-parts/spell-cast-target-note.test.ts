import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSpellCastTargetNote } from "./spell-cast-target-note";
import { buildTargetTokenSelect } from "./target-token-select";
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

  describe("with a caster token", () => {
    const casterToken = {} as foundry.canvas.placeables.Token;
    const defaulted = (
      targetKind: string,
      resistedBy: SpellResistedByEnum = SpellResistedByEnum.None,
    ) => {
      vi.mocked(buildTargetTokenSelect).mockClear();
      vi.stubGlobal("game", { user: { targets: new Set() } });
      const result = buildSpellCastTargetNote(resistedBy, targetKind, casterToken, 1, "Harmast");
      return {
        result,
        defaultsToSelf: vi.mocked(buildTargetTokenSelect).mock.calls[0]?.[2] ?? false,
      };
    };

    it.each(["creature", "spirit", "hitLocation", "spellOrEffect", "weapon"])(
      "makes the caster the default target of an unresisted %s spell",
      (targetKind) => {
        const { result, defaultsToSelf } = defaulted(targetKind);
        expect(defaultsToSelf).toBe(true);
        expect(result.targetName).toBe("RQG.Dialog.Common.TargetSelf");
      },
    );

    it("keeps no target for an object, which is not the caster", () => {
      const { result, defaultsToSelf } = defaulted("object");
      expect(defaultsToSelf).toBe(false);
      expect(result.targetName).toBe("RQG.Dialog.Common.NoTarget");
    });

    it("keeps no target for a resisted creature spell, whose GM assigns the actors", () => {
      expect(defaulted("creature", SpellResistedByEnum.ResistanceRoll).defaultsToSelf).toBe(false);
    });
  });
});

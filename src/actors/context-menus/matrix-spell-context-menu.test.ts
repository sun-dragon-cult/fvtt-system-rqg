import { beforeEach, describe, expect, it, vi } from "vitest";
import { matrixSpellMenuOptions } from "./matrix-spell-context-menu";
import { resolveMatrixSpellItem } from "../../system/spell-matrix";
import { Rqid } from "../../system/api/rqid-api";

vi.mock("../../system/spell-matrix", () => ({ resolveMatrixSpellItem: vi.fn() }));
vi.mock("../../system/util", () => ({
  getRequiredDomDataset: () => "0",
  resolveCastItem: () => matrixItem,
}));
vi.mock("../../system/api/rqid-api", () => ({ Rqid: { renderRqidDocument: vi.fn() } }));

const matrixItem = vi.hoisted(() => ({
  sheet: { render: vi.fn() },
  system: { matrixSpells: [{ spellRqidLink: { rqid: "i.spirit-magic.bladesharp" } }] },
}));
const actor = { castSpell: vi.fn() };

const row = {} as HTMLElement;
const entry = (label: string) =>
  matrixSpellMenuOptions(actor as never, null).find((e) => e.label === label)!;

describe("matrixSpellMenuOptions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("casts the spell stored in the matrix, not the matrix item", async () => {
    const spell = { name: "Bladesharp" };
    vi.mocked(resolveMatrixSpellItem).mockResolvedValue(spell as never);
    await entry("RQG.Game.RollChat").onClick(new Event("contextmenu"), row);
    expect(resolveMatrixSpellItem).toHaveBeenCalledWith(matrixItem, 0);
    expect(actor.castSpell).toHaveBeenCalledWith(spell, { token: null });
  });

  it("opens the description of the stored spell", async () => {
    vi.mocked(resolveMatrixSpellItem).mockResolvedValue({
      system: { descriptionRqidLink: { rqid: "je.spells.bladesharp" } },
    } as never);
    await entry("RQG.ContextMenu.ViewDescription").onClick(new Event("contextmenu"), row);
    expect(Rqid.renderRqidDocument).toHaveBeenCalledWith("je.spells.bladesharp");
  });

  it("opens the matrix item's sheet", () => {
    entry("RQG.ContextMenu.EditMatrixItem").onClick(new Event("contextmenu"), row);
    expect(matrixItem.sheet.render).toHaveBeenCalledWith(true);
  });
});

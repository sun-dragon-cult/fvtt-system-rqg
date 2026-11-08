import { afterEach, describe, expect, it, vi } from "vitest";
import { addWound, healWounds } from "./api-dialogs";
import { resolveActor } from "./api-resolve";
import {
  showHitLocationAddWoundDialog,
  showHitLocationHealWoundDialog,
} from "../../items/hit-location-item/hit-location-wound-dialogs";

vi.mock("./api-resolve", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api-resolve")>()),
  resolveActor: vi.fn(),
}));
vi.mock("../../items/hit-location-item/hit-location-wound-dialogs", () => ({
  showHitLocationAddWoundDialog: vi.fn(),
  showHitLocationHealWoundDialog: vi.fn(),
}));

describe("wound dialogs", () => {
  const head = { id: "head", name: "Head", type: "hitLocation", actor: undefined as unknown };
  const sword = { id: "sword", name: "Sword", type: "weapon" };
  const actor = {
    name: "Vasana",
    items: { get: (id: string) => [head, sword].find((i) => i.id === id), contents: [head, sword] },
  };
  head.actor = actor;

  afterEach(() => vi.clearAllMocks());

  it("opens Add Wound for a hit location of the given actor", async () => {
    vi.mocked(resolveActor).mockReturnValue({ actor: actor as any, token: null });

    await addWound("head", { actor: "Vasana" });

    expect(resolveActor).toHaveBeenCalledWith("Vasana");
    expect(showHitLocationAddWoundDialog).toHaveBeenCalledWith(actor, "head", {});
  });

  it("uses the hit location's own actor when given the item", async () => {
    await addWound(head as any);

    expect(resolveActor).not.toHaveBeenCalled();
    expect(showHitLocationAddWoundDialog).toHaveBeenCalledWith(actor, "head", {});
  });

  it("passes the damage and toggles on to the dialog", async () => {
    await addWound(head as any, { damage: 7, subtractArmorPoints: false, applyToTotalHp: false });

    expect(showHitLocationAddWoundDialog).toHaveBeenCalledWith(actor, "head", {
      damage: 7,
      subtractArmorPoints: false,
      applyToTotalHp: false,
    });
  });

  it("refuses an item that isn't a hit location", async () => {
    vi.mocked(resolveActor).mockReturnValue({ actor: actor as any, token: null });

    await expect(addWound("sword")).rejects.toThrow(/expected hitLocation/);
    expect(showHitLocationAddWoundDialog).not.toHaveBeenCalled();
  });

  it("opens Heal Wounds with or without a hit location picked", async () => {
    vi.mocked(resolveActor).mockReturnValue({ actor: actor as any, token: null });

    await healWounds();
    await healWounds("head");

    expect(vi.mocked(showHitLocationHealWoundDialog).mock.calls).toEqual([
      [actor, ""],
      [actor, "head"],
    ]);
  });
});

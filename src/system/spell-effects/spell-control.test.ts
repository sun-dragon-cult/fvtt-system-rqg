import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { giveControl } from "./spell-control";
import { attachSpellTemplate } from "./apply-spell-effect";
import { holdOwnership } from "./spell-anchor";

vi.mock("./apply-spell-effect", () => ({ attachSpellTemplate: vi.fn() }));
vi.mock("./spell-anchor", () => ({ holdOwnership: vi.fn(async () => undefined) }));

const player = { id: "player", isGM: false };
const stranger = { id: "stranger", isGM: false };
const gm = { id: "gm", isGM: true };
const caster = { testUserPermission: (user: unknown) => user === player || user === gm };
const scope = {
  spell: { name: "Command Earth Elemental" },
  cast: { caster: { actorUuid: "Actor.caster", tokenUuid: "" } },
} as any;

describe("giveControl", () => {
  let effect: object;

  beforeEach(() => {
    const ActiveEffect = class ActiveEffect {};
    vi.stubGlobal("ActiveEffect", ActiveEffect);
    effect = Object.assign(new ActiveEffect(), { delete: vi.fn(async () => undefined) });
    vi.stubGlobal("game", {
      user: gm,
      users: { contents: [player, stranger, gm], activeGM: { isSelf: true } },
    });
    vi.stubGlobal("TokenDocument", class TokenDocument {});
    vi.stubGlobal("fromUuid", async (uuid: string) =>
      uuid === "Actor.caster" ? caster : uuid === "Actor.spirit.ActiveEffect.c" ? effect : null,
    );
    vi.stubGlobal("CONST", { DOCUMENT_OWNERSHIP_LEVELS: { OWNER: 3 } });
    vi.mocked(attachSpellTemplate).mockResolvedValue({
      outcome: "applied",
      effectUuids: ["Actor.spirit.ActiveEffect.c"],
    });
  });

  afterEach(() => {
    vi.mocked(holdOwnership).mockClear();
    vi.mocked(attachSpellTemplate).mockClear();
    vi.mocked(ui.notifications!.warn).mockClear();
    vi.unstubAllGlobals();
  });

  it("attaches the effect and makes the caster's players owners while it lasts", async () => {
    expect(await giveControl(scope)).toEqual({
      outcome: "applied",
      effectUuids: ["Actor.spirit.ActiveEffect.c"],
    });
    expect(attachSpellTemplate).toHaveBeenCalledWith(scope, {
      flags: { ownershipGiven: [{ user: "player", level: 3 }] },
    });
    expect(holdOwnership).toHaveBeenCalledWith(effect);
  });

  it("gives no control, and says so, when the attached effect can't be found", async () => {
    vi.mocked(attachSpellTemplate).mockResolvedValue({
      outcome: "applied",
      effectUuids: ["Actor.spirit.ActiveEffect.missing"],
    });
    expect(await giveControl(scope)).toBeUndefined();
    expect(holdOwnership).not.toHaveBeenCalled();
  });

  it("removes the effect and leaves Apply clickable when ownership can't be given", async () => {
    vi.mocked(holdOwnership).mockRejectedValueOnce(new Error("denied"));
    expect(await giveControl(scope)).toBeUndefined();
    expect((effect as { delete: () => unknown }).delete).toHaveBeenCalledOnce();
  });

  it("gives no control when the effect wasn't attached", async () => {
    vi.mocked(attachSpellTemplate).mockResolvedValue({
      outcome: "blocked",
      reason: "weaker",
    } as any);
    await giveControl(scope);
    expect(holdOwnership).not.toHaveBeenCalled();
  });

  it("refuses off the active GM's client, where ownership can't change safely", async () => {
    (game as any).user = player;
    (game as any).users.activeGM.isSelf = false;
    expect(await giveControl(scope)).toBeUndefined();
    expect(attachSpellTemplate).not.toHaveBeenCalled();
    expect(ui.notifications!.warn).toHaveBeenCalledOnce();
  });
});

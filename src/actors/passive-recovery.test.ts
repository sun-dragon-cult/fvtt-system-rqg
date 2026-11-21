import { afterEach, describe, expect, it, vi } from "vitest";
import { initCharacterPassiveRecovery } from "./passive-recovery";

vi.mock("./rqg-actor-sheet-v2", () => ({ RqgActorSheetV2: class {} }));

function actor(hasPlayerOwner = false) {
  return {
    type: "character",
    hasPlayerOwner,
    name: "NPC",
    catchUpMagicPointRecovery: vi.fn().mockResolvedValue(undefined),
    catchUpNaturalHealing: vi.fn().mockResolvedValue(undefined),
  };
}

function setup(isActiveGM: boolean) {
  const npc = actor();
  const pc = actor(true);
  const tokenNpc = actor();
  const on = vi.fn();
  vi.stubGlobal("Hooks", { on });
  vi.stubGlobal("foundry", {
    ...foundry,
    applications: { ...foundry.applications, instances: new Map() },
  });
  vi.stubGlobal("game", {
    ...game,
    users: { activeGM: { isSelf: isActiveGM } },
    actors: { contents: [npc, pc] },
    scenes: {
      contents: [
        {
          tokens: [
            { actorLink: true, actor: npc },
            { actorLink: false, actor: tokenNpc },
            { actorLink: false, actor: null },
          ],
        },
      ],
    },
  });
  initCharacterPassiveRecovery();
  const updateWorldTime = on.mock.calls.find(([hook]) => hook === "updateWorldTime")![1];
  return { npc, pc, tokenNpc, updateWorldTime };
}

describe("NPC passive recovery", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("recovers closed-sheet NPCs and independent unlinked tokens only once", async () => {
    const { npc, pc, tokenNpc, updateWorldTime } = setup(true);

    updateWorldTime();
    await vi.waitFor(() => expect(tokenNpc.catchUpNaturalHealing).toHaveBeenCalledOnce());

    expect(npc.catchUpMagicPointRecovery).toHaveBeenCalledOnce();
    expect(npc.catchUpNaturalHealing).toHaveBeenCalledOnce();
    expect(tokenNpc.catchUpMagicPointRecovery).toHaveBeenCalledOnce();
    expect(pc.catchUpMagicPointRecovery).not.toHaveBeenCalled();
    expect(pc.catchUpNaturalHealing).not.toHaveBeenCalled();
  });

  it("leaves background NPC recovery to the active GM", () => {
    const { npc, tokenNpc, updateWorldTime } = setup(false);

    updateWorldTime();

    expect(npc.catchUpMagicPointRecovery).not.toHaveBeenCalled();
    expect(tokenNpc.catchUpMagicPointRecovery).not.toHaveBeenCalled();
  });

  it("reports a failed recovery and still attempts the other resource", async () => {
    const { npc, updateWorldTime } = setup(true);
    const error = new Error("Write failed");
    npc.catchUpMagicPointRecovery.mockRejectedValue(error);
    const notification = vi.mocked(ui.notifications!.error);
    notification.mockClear();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      updateWorldTime();
      await vi.waitFor(() => expect(npc.catchUpNaturalHealing).toHaveBeenCalledOnce());

      expect(notification).toHaveBeenCalledOnce();
      expect(consoleError).toHaveBeenCalledWith(expect.any(String), undefined, error);
    } finally {
      consoleError.mockRestore();
    }
  });
});

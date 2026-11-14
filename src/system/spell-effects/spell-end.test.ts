import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initSpellEnd } from "./spell-end";
import { releaseHeld } from "./spell-anchor";

vi.mock("./spell-anchor", () => ({
  releaseHeld: vi.fn(async () => false),
  holdsOf: (effect: { getFlag(scope: string, key: string): unknown }) =>
    (effect.getFlag("rqg", "holds") as unknown[] | undefined) ?? [],
  holdsRegion: () => false,
}));

class FakeItem {
  constructor(private flags: Record<string, unknown>) {}
  getFlag(_scope: string, key: string) {
    return this.flags[key];
  }
}

type Handler = (effect: unknown, changed?: unknown) => Promise<void> | void;

const effect = (
  spellRqid: string | undefined,
  flags: Record<string, unknown> = {},
  parent: unknown = null,
) => ({
  parent: parent,
  system: { spell: spellRqid ? { spellRqid } : null },
  duration: { expired: false, remaining: 1 },
  isExpiryEvent: vi.fn(() => true),
  getFlag: (_scope: string, key: string) => flags[key],
  delete: vi.fn(async () => {}),
  update: vi.fn(async () => {}),
});

describe("initSpellEnd", () => {
  let handlers: Record<string, Handler>;

  beforeEach(() => {
    handlers = {};
    vi.stubGlobal("Hooks", {
      on: vi.fn((hook: string, fn: Handler) => (handlers[hook] = fn)),
    });
    vi.stubGlobal("game", { users: { activeGM: { isSelf: true } } });
    vi.stubGlobal("Item", FakeItem);
    initSpellEnd();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const expire = (e: ReturnType<typeof effect>) =>
    handlers["updateActiveEffect"]!(e, { duration: { expired: true } });

  it("deletes a spell effect once it expires", async () => {
    const bladesharp = effect("i.spirit-magic.bladesharp");
    await expire(bladesharp);
    expect(bladesharp.delete).toHaveBeenCalledOnce();
  });

  it("leaves an effect that held a document to go with it", async () => {
    vi.mocked(releaseHeld).mockResolvedValueOnce(true);
    const anchor = effect("i.rune-magic.shake-earth", {
      holds: [{ kind: "document", uuid: "Scene.s.Region.r" }],
    });
    await expire(anchor);
    expect(anchor.delete).not.toHaveBeenCalled();
  });

  it("deletes an effect whose held document is already gone", async () => {
    const anchor = effect("i.rune-magic.shake-earth", {
      holds: [{ kind: "document", uuid: "Scene.s.Region.gone" }],
    });
    await expire(anchor);
    expect(anchor.delete).toHaveBeenCalledOnce();
  });

  it("leaves a split-off missile's spell to go back to the stack with it", async () => {
    const arrow = new FakeItem({ splitFromProjectileId: "stack" });
    const speedart = effect("i.spirit-magic.speedart", {}, arrow);
    await expire(speedart);
    expect(speedart.delete).not.toHaveBeenCalled();
  });

  it("leaves other effects to Foundry", async () => {
    const other = effect(undefined);
    await expire(other);
    expect(other.delete).not.toHaveBeenCalled();
  });

  it("only acts on the active GM's client", async () => {
    vi.stubGlobal("game", { users: { activeGM: { isSelf: false } } });
    const bladesharp = effect("i.spirit-magic.bladesharp");
    await expire(bladesharp);
    expect(bladesharp.delete).not.toHaveBeenCalled();
  });

  describe("an effect re-enabled when its item is equipped again", () => {
    const reenable = (e: ReturnType<typeof effect>) =>
      handlers["updateActiveEffect"]!(e, { disabled: false });

    it("expires a spell effect whose time ran out while it was suspended", async () => {
      const bladesharp = effect("i.spirit-magic.bladesharp");
      bladesharp.duration.remaining = -28;
      await reenable(bladesharp);
      expect(bladesharp.update).toHaveBeenCalledWith({ duration: { expired: true } });
    });

    it("expires one whose time ends exactly now", async () => {
      const bladesharp = effect("i.spirit-magic.bladesharp");
      bladesharp.duration.remaining = 0;
      await reenable(bladesharp);
      expect(bladesharp.update).toHaveBeenCalledOnce();
    });

    it("keeps a spell effect with time left", async () => {
      const bladesharp = effect("i.spirit-magic.bladesharp");
      await reenable(bladesharp);
      expect(bladesharp.update).not.toHaveBeenCalled();
    });

    it("keeps a spell effect without a duration", async () => {
      const permanent = effect("i.rune-magic.enchant-iron");
      permanent.duration.remaining = Infinity;
      await reenable(permanent);
      expect(permanent.update).not.toHaveBeenCalled();
    });

    it("leaves one ending at a combat event to Foundry", async () => {
      const bladesharp = effect("i.spirit-magic.bladesharp");
      bladesharp.duration.remaining = 0;
      bladesharp.isExpiryEvent.mockReturnValue(false);
      await reenable(bladesharp);
      expect(bladesharp.update).not.toHaveBeenCalled();
    });

    it("leaves other effects to Foundry", async () => {
      const other = effect(undefined);
      other.duration.remaining = -28;
      await reenable(other);
      expect(other.update).not.toHaveBeenCalled();
    });
  });
});

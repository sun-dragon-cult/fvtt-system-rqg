import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initSpellEnd } from "./spell-end";
import { removeSpellArea } from "./spell-area";

vi.mock("./summon", () => ({ removeSummonedToken: vi.fn(async () => {}) }));
vi.mock("./spell-area", () => ({ removeSpellArea: vi.fn(async () => false) }));

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
  duration: { expired: false },
  getFlag: (_scope: string, key: string) => flags[key],
  delete: vi.fn(async () => {}),
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

  it("leaves an area's caster effect to go with its Region", async () => {
    vi.mocked(removeSpellArea).mockResolvedValueOnce(true);
    const anchor = effect("i.rune-magic.shake-earth", { spellArea: "Scene.s.Region.r" });
    await expire(anchor);
    expect(anchor.delete).not.toHaveBeenCalled();
  });

  it("deletes an area's caster effect whose Region is already gone", async () => {
    const anchor = effect("i.rune-magic.shake-earth", { spellArea: "Scene.s.Region.gone" });
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
});

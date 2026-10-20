import { beforeEach, describe, expect, it, vi } from "vitest";
import { initSpellEnd } from "./spell-end";

vi.mock("./summon", () => ({ removeSummonedToken: vi.fn(async () => {}) }));
vi.mock("./spell-area", () => ({ removeSpellArea: vi.fn(async () => {}) }));

type Handler = (effect: unknown, changed?: unknown) => Promise<void> | void;

const effect = (spellRqid: string | undefined, flags: Record<string, unknown> = {}) => ({
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
    initSpellEnd();
  });

  const expire = (e: ReturnType<typeof effect>) =>
    handlers["updateActiveEffect"]!(e, { duration: { expired: true } });

  it("deletes a spell effect once it expires", async () => {
    const bladesharp = effect("i.spirit-magic.bladesharp");
    await expire(bladesharp);
    expect(bladesharp.delete).toHaveBeenCalledOnce();
  });

  it("leaves an area's caster effect to go with its Region", async () => {
    const anchor = effect("i.rune-magic.shake-earth", { spellArea: "Scene.s.Region.r" });
    await expire(anchor);
    expect(anchor.delete).not.toHaveBeenCalled();
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

import type { SpellEffectApplied } from "./apply-spell-effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleApplySpellBehaviorQuery } from "./run-spell-apply";
import { runApplyRequest } from "./spell-apply-request";
import { spellBehaviorOf } from "./spell-behavior";

vi.mock("./spell-apply-request", () => ({
  applyRequestData: vi.fn(),
  runApplyRequest: vi.fn(async (_data, _user, work) => work(scope)),
}));
vi.mock("./spell-behavior", () => ({ spellBehaviorOf: vi.fn() }));

const scope = { spell: { name: "Summon Earth Elemental" } } as any;
const applied: SpellEffectApplied = { outcome: "applied", effectUuids: ["e"] };
const player = { isGM: false } as unknown as User;
const gm = { isGM: true } as unknown as User;
const request = { castMessageId: "record", entryId: "entry", applyId: "click" };
const data = { spellUuid: "s", targetActorUuid: "a", targetName: "A", cast: {} as any };

describe("handleApplySpellBehaviorQuery", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("runs a runAsGm behavior's apply for the Apply of a cast record", async () => {
    const apply = vi.fn(async () => applied);
    vi.mocked(spellBehaviorOf).mockReturnValue({ runAsGm: true, apply } as any);
    expect(await handleApplySpellBehaviorQuery({ ...data, request }, { user: player })).toBe(
      applied,
    );
    expect(runApplyRequest).toHaveBeenCalledWith(
      { ...data, request },
      player,
      expect.any(Function),
    );
    expect(apply).toHaveBeenCalledWith(scope);
  });

  it("runs nothing for a behavior that doesn't run as GM", async () => {
    const apply = vi.fn(async () => applied);
    vi.mocked(spellBehaviorOf).mockReturnValue({ apply } as any);
    expect(await handleApplySpellBehaviorQuery({ ...data, request }, { user: gm })).toBeUndefined();
    expect(apply).not.toHaveBeenCalled();
  });

  it("takes a request without a cast record from a GM only", async () => {
    const apply = vi.fn(async () => applied);
    vi.mocked(spellBehaviorOf).mockReturnValue({ runAsGm: true, apply } as any);
    expect(await handleApplySpellBehaviorQuery(data, { user: player })).toBeUndefined();
    expect(runApplyRequest).not.toHaveBeenCalled();
    expect(await handleApplySpellBehaviorQuery(data, { user: gm })).toBe(applied);
  });
});

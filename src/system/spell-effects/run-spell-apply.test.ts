import type { SpellEffectApplied } from "./apply-spell-effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleApplySpellBehaviorQuery, runSpellApply } from "./run-spell-apply";
import { applyRequestOf, runApplyRequest } from "./spell-apply-request";
import { queryActiveGm } from "./query-active-gm";
import { spellBehaviorOf } from "./spell-behavior";

vi.mock("./query-active-gm", () => ({ queryActiveGm: vi.fn(async () => applied) }));
vi.mock("../util", () => ({
  hasActiveGm: () => true,
  localize: (key: string, data?: Record<string, string>) =>
    `${key} ${Object.values(data ?? {}).join(" ")}`,
}));
vi.mock("./spell-apply-request", () => ({
  applyRequestData: vi.fn(),
  applyRequestOf: vi.fn(),
  appliedUnlessTaken: vi.fn((answer) => answer),
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

describe("runSpellApply", () => {
  const runAsGm = { runAsGm: true, apply: vi.fn(async () => applied) };

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  const asUser = (isGM: boolean) => {
    vi.stubGlobal("game", { user: { isGM }, users: { activeGM: { id: "gm", isSelf: isGM } } });
    vi.stubGlobal("ui", { notifications: { warn: vi.fn() } });
  };

  it("tells a player that only the GM can apply a runAsGm spell from the token HUD", async () => {
    asUser(false);
    vi.mocked(applyRequestOf).mockReturnValue(undefined);
    expect(await runSpellApply(runAsGm, scope)).toBeUndefined();
    expect(queryActiveGm).not.toHaveBeenCalled();
    const message = vi.mocked(ui.notifications!.warn).mock.calls[0]![0] as string;
    expect(message).toContain("RunAsGmFromTokenHud");
    expect(message).toContain("Summon Earth Elemental");
  });

  it("asks the GM for a player's Apply from a cast record", async () => {
    asUser(false);
    vi.mocked(applyRequestOf).mockReturnValue(request);
    expect(await runSpellApply(runAsGm, scope)).toBe(applied);
    expect(queryActiveGm).toHaveBeenCalledOnce();
    expect(ui.notifications!.warn).not.toHaveBeenCalled();
  });

  it("runs it on a GM's own client from the token HUD", async () => {
    asUser(true);
    vi.mocked(applyRequestOf).mockReturnValue(undefined);
    expect(await runSpellApply(runAsGm, scope)).toBe(applied);
    expect(runAsGm.apply).toHaveBeenCalledWith(scope);
  });

  it("asks the active GM when another GM applies it", async () => {
    asUser(true);
    (game as any).users.activeGM.isSelf = false;
    vi.mocked(applyRequestOf).mockReturnValue(request);
    await runSpellApply(runAsGm, scope);
    expect(queryActiveGm).toHaveBeenCalled();
    expect(runAsGm.apply).not.toHaveBeenCalled();
  });
});

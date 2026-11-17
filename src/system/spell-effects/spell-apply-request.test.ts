import type { SpellEffectApplied } from "./apply-spell-effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appliedUnlessTaken,
  applyRequestOf,
  bindApplyRequest,
  runApplyRequest,
  runClaimedApply,
  watchApplyTaken,
  type SpellApplyRequest,
} from "./spell-apply-request";
import { targetOf } from "./spell-cast-runner";
import { clearApplyClaims, isClaimedByOtherApply, releaseApplyClaim } from "./spell-apply-claims";

vi.mock("./spell-cast-runner", () => ({
  castSpellOf: vi.fn(async () => ({ name: "Summon Earth Elemental", uuid: "Actor.c.Item.s" })),
  recordCast: vi.fn((_record, castMessageId: string) => ({ castMessageId, level: 3 })),
  targetOf: vi.fn(),
}));
vi.mock("./apply-spell-effect", () => ({
  spellApplyScope: (spell: unknown, targetActor: unknown, targetName: string, cast: unknown) => ({
    spell,
    targetActor,
    targetName,
    cast,
  }),
}));

const owner = { id: "player", isGM: false } as unknown as User;
const stranger = { id: "other", isGM: false } as unknown as User;
const gm = { id: "gm", isGM: true } as unknown as User;

const actor = {
  name: "Vasana",
  testUserPermission: (user: User) => user === owner,
};

function recordMessage(stage: string) {
  return {
    id: "record",
    type: "spellCast",
    system: { targets: [{ id: "entry", actorUuid: "Actor.v", tokenUuid: "", stage }] },
  };
}

const request = (applyId = "click-1"): SpellApplyRequest => ({
  castMessageId: "record",
  entryId: "entry",
  applyId,
});

const applied: SpellEffectApplied = { outcome: "applied", effectUuids: ["Actor.v.ActiveEffect.e"] };
const taken = { outcome: "taken" };

describe("runClaimedApply", () => {
  let message: ReturnType<typeof recordMessage>;

  beforeEach(() => {
    message = recordMessage("affected");
    vi.stubGlobal("game", {
      messages: { get: (id: string) => (id === "record" ? message : undefined) },
    });
    vi.mocked(targetOf).mockResolvedValue({ actor: actor as any, name: "Vasana", token: null });
  });

  afterEach(() => {
    clearApplyClaims();
    vi.unstubAllGlobals();
  });

  it("runs the work with the cast rebuilt from the record, bound to the request", async () => {
    const work = vi.fn(async () => applied);
    expect(await runClaimedApply(request(), owner, work)).toBe(applied);
    const scope = (work.mock.calls[0] as any)[0];
    expect(scope.cast).toEqual({ castMessageId: "record", level: 3 });
    expect(applyRequestOf(scope.cast)).toEqual(request());
  });

  it("refuses a second Apply of the same entry while the first is running", async () => {
    const { promise: running, resolve: finish } = Promise.withResolvers<SpellEffectApplied>();
    const first = runClaimedApply(request("click-1"), owner, () => running);
    const second = vi.fn(async () => applied);
    expect(await runClaimedApply(request("click-2"), gm, second)).toEqual(taken);
    expect(second).not.toHaveBeenCalled();
    finish(applied);
    expect(await first).toBe(applied);
  });

  it("refuses a second Apply once the first did its work", async () => {
    await runClaimedApply(request("click-1"), owner, async () => applied);
    const second = vi.fn(async () => applied);
    expect(await runClaimedApply(request("click-2"), owner, second)).toEqual(taken);
    expect(second).not.toHaveBeenCalled();
  });

  it("lets more work of the same Apply run, e.g. a behavior summoning twice", async () => {
    await runClaimedApply(request("click-1"), owner, async () => applied);
    expect(await runClaimedApply(request("click-1"), owner, async () => applied)).toBe(applied);
  });

  it("doesn't let a request it refuses block a real Apply meanwhile", async () => {
    const [refused, real] = await Promise.all([
      runClaimedApply(request("stranger"), stranger, async () => applied),
      runClaimedApply(request("owner"), owner, async () => applied),
    ]);
    expect(refused).toBeUndefined();
    expect(real).toBe(applied);
  });

  it("keeps the claim of a running Apply until it ends, then frees it as asked", async () => {
    const { promise: running, resolve: finish } = Promise.withResolvers<SpellEffectApplied>();
    const first = runClaimedApply(request("click-1"), owner, () => running);
    await vi.waitFor(() => expect(isClaimedByOtherApply("record", "entry", "click-2")).toBe(true));
    releaseApplyClaim("record", "entry");
    message = recordMessage("settled");
    await runClaimedApply(request("click-2"), gm, async () => applied);
    message = recordMessage("affected");
    expect(await runClaimedApply(request("click-2"), gm, async () => applied)).toEqual(taken);
    finish(applied);
    await first;
    // A ruling made while it ran frees the entry once it ended, though its work did something
    expect(await runClaimedApply(request("click-2"), gm, async () => applied)).toBe(applied);
  });

  it("tells an Apply's result from another Apply's holding the claim", async () => {
    expect(isClaimedByOtherApply("record", "entry", "click-1")).toBe(false);
    await runClaimedApply(request("click-1"), owner, async () => applied);
    expect(isClaimedByOtherApply("record", "entry", "click-1")).toBe(false);
    expect(isClaimedByOtherApply("record", "entry", "click-2")).toBe(true);
  });

  it("frees the entry once its record notes it applied", async () => {
    await runClaimedApply(request("click-1"), owner, async () => applied);
    releaseApplyClaim("record", "entry");
    expect(await runClaimedApply(request("click-2"), owner, async () => applied)).toBe(applied);
  });

  it("frees the entry when the work did nothing, e.g. the placement was cancelled", async () => {
    await runClaimedApply(request("click-1"), owner, async () => undefined);
    expect(await runClaimedApply(request("click-2"), owner, async () => applied)).toBe(applied);
  });

  it("frees the entry when the work fails", async () => {
    await expect(
      runClaimedApply(request("click-1"), owner, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await runClaimedApply(request("click-2"), owner, async () => applied)).toBe(applied);
  });

  it("answers that an entry no longer waiting for Apply was taken", async () => {
    message = recordMessage("applied");
    const work = vi.fn(async () => applied);
    expect(await runClaimedApply(request(), owner, work)).toEqual(taken);
    expect(work).not.toHaveBeenCalled();
  });

  it("refuses a request without a cast record, or for an entry it doesn't have", async () => {
    const work = vi.fn(async () => applied);
    expect(
      await runClaimedApply({ ...request(), castMessageId: "gone" }, owner, work),
    ).toBeUndefined();
    expect(await runClaimedApply({ ...request(), entryId: "other" }, owner, work)).toBeUndefined();
    expect(work).not.toHaveBeenCalled();
  });

  it("refuses a sender who doesn't own the target, but not a GM", async () => {
    const work = vi.fn(async () => applied);
    expect(await runClaimedApply(request(), stranger, work)).toBeUndefined();
    expect(work).not.toHaveBeenCalled();
    expect(await runClaimedApply(request(), gm, work)).toBe(applied);
  });
});

describe("runApplyRequest without a cast record", () => {
  const cast = { castMessageId: "", caster: { actorUuid: "", tokenUuid: "" } } as any;
  const data = {
    spellUuid: "Actor.v.Item.s",
    targetActorUuid: "Actor.v",
    targetName: "Vasana",
    cast: cast,
  };

  beforeEach(() => {
    const documents: Record<string, unknown> = {
      "Actor.v.Item.s": { name: "Mobility" },
      "Actor.v": Object.assign(new (globalThis as any).Actor(), actor),
      "Actor.c": Object.assign(new (globalThis as any).Actor(), {
        testUserPermission: () => false,
      }),
    };
    vi.stubGlobal(
      "fromUuid",
      vi.fn(async (uuid: string) => documents[uuid] ?? null),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("runs for the owner of its target", async () => {
    const work = vi.fn(async () => applied);
    expect(await runApplyRequest(data, owner, work)).toBe(applied);
    expect((work.mock.calls[0] as any)[0].cast).toBe(cast);
  });

  it("refuses a sender who doesn't own the target", async () => {
    const work = vi.fn(async () => applied);
    expect(await runApplyRequest(data, stranger, work)).toBeUndefined();
    expect(work).not.toHaveBeenCalled();
  });

  it("refuses a sender who doesn't own the caster it names", async () => {
    const work = vi.fn(async () => applied);
    const fromCaster = {
      ...data,
      cast: { ...cast, caster: { actorUuid: "Actor.c", tokenUuid: "" } },
    };
    expect(await runApplyRequest(fromCaster, owner, work)).toBeUndefined();
    expect(await runApplyRequest(fromCaster, gm, work)).toBe(applied);
  });
});

describe("bindApplyRequest", () => {
  it("ties a request to the cast object a behavior hands on", () => {
    const cast = {} as any;
    expect(applyRequestOf(cast)).toBeUndefined();
    expect(bindApplyRequest(cast, request())).toBe(cast);
    expect(applyRequestOf(cast)).toEqual(request());
    expect(applyRequestOf({ ...cast })).toBeUndefined();
  });
});

describe("appliedUnlessTaken", () => {
  afterEach(() => {
    vi.mocked(ui.notifications!.warn).mockClear();
  });

  it("tells the user when another Apply took the entry", () => {
    expect(appliedUnlessTaken({ outcome: "taken" }, "Summon")).toBeUndefined();
    expect(ui.notifications!.warn).toHaveBeenCalledWith(
      expect.stringContaining("RQG.ChatMessage.SpellCast.TakenByOtherApply"),
    );
  });

  it("passes on any other answer as it is", () => {
    expect(appliedUnlessTaken(applied, "Summon")).toBe(applied);
    expect(appliedUnlessTaken(undefined, "Summon")).toBeUndefined();
    expect(ui.notifications!.warn).not.toHaveBeenCalled();
  });
});

describe("watchApplyTaken", () => {
  let onUpdate: ((message: unknown) => void) | undefined;
  const off = vi.fn();
  const scope = (cast: object) => ({ spell: { name: "Summon" }, cast }) as any;
  const boundScope = () => scope(bindApplyRequest({} as any, request()));

  beforeEach(() => {
    onUpdate = undefined;
    vi.stubGlobal("Hooks", {
      on: vi.fn((_hook: string, fn: (message: unknown) => void) => {
        onUpdate = fn;
        return 7;
      }),
      off: off,
    });
  });

  afterEach(() => {
    off.mockClear();
    vi.mocked(ui.notifications!.warn).mockClear();
    vi.unstubAllGlobals();
  });

  it("aborts and tells the user once the record notes the entry applied", () => {
    const watch = watchApplyTaken(boundScope());
    onUpdate!(recordMessage("affected"));
    onUpdate!({ ...recordMessage("applied"), id: "other record" });
    expect(watch.signal.aborted).toBe(false);
    onUpdate!(recordMessage("applied"));
    expect(watch.signal.aborted).toBe(true);
    expect(off).toHaveBeenCalledWith("updateChatMessage", 7);
    expect(ui.notifications!.warn).toHaveBeenCalledOnce();
  });

  it("aborts once a GM ruled on the entry", () => {
    const watch = watchApplyTaken(boundScope());
    onUpdate!(recordMessage("settled"));
    expect(watch.signal.aborted).toBe(true);
  });

  it("stops watching when asked", () => {
    watchApplyTaken(boundScope()).stop();
    expect(off).toHaveBeenCalledWith("updateChatMessage", 7);
  });

  it("never aborts without a cast record (token HUD +)", () => {
    const watch = watchApplyTaken(scope({}));
    expect(onUpdate).toBeUndefined();
    expect(watch.signal.aborted).toBe(false);
  });
});

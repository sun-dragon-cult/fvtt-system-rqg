import type { SpellEffectApplied } from "./apply-spell-effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyRequestOf,
  bindApplyRequest,
  clearApplyClaims,
  releaseApplyClaim,
  runApplyRequest,
  runClaimedApply,
  type SpellApplyRequest,
} from "./spell-apply-request";
import { targetOf } from "./spell-cast-runner";

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
    expect(await runClaimedApply(request("click-2"), gm, second)).toBeUndefined();
    expect(second).not.toHaveBeenCalled();
    finish(applied);
    expect(await first).toBe(applied);
  });

  it("refuses a second Apply once the first did its work", async () => {
    await runClaimedApply(request("click-1"), owner, async () => applied);
    const second = vi.fn(async () => applied);
    expect(await runClaimedApply(request("click-2"), owner, second)).toBeUndefined();
    expect(second).not.toHaveBeenCalled();
  });

  it("lets more work of the same Apply run, e.g. a behavior summoning twice", async () => {
    await runClaimedApply(request("click-1"), owner, async () => applied);
    expect(await runClaimedApply(request("click-1"), owner, async () => applied)).toBe(applied);
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

  it("refuses an entry not waiting for Apply", async () => {
    message = recordMessage("applied");
    const work = vi.fn(async () => applied);
    expect(await runClaimedApply(request(), owner, work)).toBeUndefined();
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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveResistedSpellCastTarget } from "./spell-resisted-by";
import { SpellResistedByEnum } from "../item-data/spell";

// DialogV2 has no shared mock in test/setup/foundryMockFunctions.js - the zero-target branch is the
// only thing here that reaches it. Same approach as magic-point-source.test.ts.
(globalThis as any).foundry ??= {};
(globalThis as any).foundry.applications ??= {};
(globalThis as any).foundry.applications.api ??= {};
(globalThis as any).foundry.applications.api.DialogV2 = { confirm: vi.fn(async () => true) };

const casterActor = { uuid: "Actor.caster" } as any;

function fakeTarget(actorUuid: string, uuid = `Scene.s.Token.${actorUuid}`) {
  return { document: { uuid: uuid, actor: { uuid: actorUuid } } };
}

function setTargets(...targets: unknown[]): void {
  (globalThis as any).game.user = { targets: new Set(targets) };
}

function mockConfirm(answer: boolean | null): void {
  (globalThis as any).foundry.applications.api.DialogV2.confirm = vi.fn(async () => answer);
}

describe("resolveResistedSpellCastTarget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm(true);
    setTargets();
  });

  it("does not constrain a spell that is not resisted, whatever is targeted", async () => {
    setTargets(fakeTarget("Actor.a"), fakeTarget("Actor.b"));

    const result = await resolveResistedSpellCastTarget(
      SpellResistedByEnum.None,
      casterActor,
      "Bladesharp",
    );

    expect(result).toEqual({ proceed: true, selfCast: false });
    expect(ui.notifications?.warn).not.toHaveBeenCalled();
    expect((globalThis as any).foundry.applications.api.DialogV2.confirm).not.toHaveBeenCalled();
  });

  it("refuses a resisted spell aimed at more than one target, before anything is spent", async () => {
    setTargets(fakeTarget("Actor.a"), fakeTarget("Actor.b"));

    const result = await resolveResistedSpellCastTarget(
      SpellResistedByEnum.ResistanceRoll,
      casterActor,
      "Demoralize",
    );

    expect(result.proceed).toBe(false);
    expect(ui.notifications?.warn).toHaveBeenCalled();
  });

  it("proceeds with the targeted token when exactly one is targeted", async () => {
    setTargets(fakeTarget("Actor.victim", "Scene.s.Token.victim"));

    const result = await resolveResistedSpellCastTarget(
      SpellResistedByEnum.ResistanceRoll,
      casterActor,
      "Demoralize",
    );

    expect(result).toEqual({
      proceed: true,
      targetTokenUuid: "Scene.s.Token.victim",
      selfCast: false,
    });
  });

  it("treats targeting your own actor as a self cast, so no resistance is asked for", async () => {
    setTargets(fakeTarget("Actor.caster", "Scene.s.Token.caster"));

    const result = await resolveResistedSpellCastTarget(
      SpellResistedByEnum.ResistanceRoll,
      casterActor,
      "Heal",
    );

    expect(result.proceed).toBe(true);
    expect(result.selfCast).toBe(true);
  });

  it("offers to cast on self when nothing is targeted, and accepting counts as a self cast", async () => {
    mockConfirm(true);

    const result = await resolveResistedSpellCastTarget(
      SpellResistedByEnum.ResistanceRoll,
      casterActor,
      "Heal",
    );

    expect(result).toEqual({ proceed: true, selfCast: true });
  });

  it("aborts the cast when that offer is declined, so no points are spent", async () => {
    mockConfirm(false);

    const result = await resolveResistedSpellCastTarget(
      SpellResistedByEnum.ResistanceRoll,
      casterActor,
      "Heal",
    );

    expect(result).toEqual({ proceed: false, selfCast: false });
  });

  it("aborts when the offer is dismissed rather than answered", async () => {
    mockConfirm(null);

    const result = await resolveResistedSpellCastTarget(
      SpellResistedByEnum.ResistanceRoll,
      casterActor,
      "Heal",
    );

    expect(result.proceed).toBe(false);
  });
});

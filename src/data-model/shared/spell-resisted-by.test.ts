import { beforeEach, describe, expect, it, vi } from "vitest";
import { postSpellCastResult, resolveResistedSpellCastTarget } from "./spell-resisted-by";
import { SpellResistedByEnum } from "../item-data/spell";
import { createResistanceRequest } from "../../applications/resistance-roll-dialog/create-resistance-request";

// postSpellCastResult reaches these through dynamic imports; stubbing them keeps the routing
// assertions on the card that would be built rather than on ChatMessage.create.
vi.mock("../../applications/resistance-roll-dialog/create-resistance-request", () => ({
  createResistanceRequest: vi.fn(async () => undefined),
}));
vi.mock("../../applications/resistance-roll-dialog/resistance-roll-shared", () => ({
  resolveCharacteristicSide: vi.fn((_uuid: string) => ({
    value: 15,
    label: "POW",
    actorName: "Vasana",
  })),
}));

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

describe("postSpellCastResult", () => {
  const casterActor = { uuid: "Actor.caster", name: "Vasana" } as any;
  const casterToken = { uuid: "Scene.s.Token.caster" } as any;

  function fakeCastRoll(rollMode: string, successLevel: number) {
    return {
      options: { rollMode: rollMode },
      successLevel: successLevel,
      flavor: "Demoralize",
      postToChat: vi.fn(async () => undefined),
      toJSON: vi.fn(() => ({ formula: "1d100" })),
    } as any;
  }

  const resisted = {
    proceed: true,
    targetTokenUuid: "Scene.s.Token.victim",
    selfCast: false,
  };

  async function post(overrides: Record<string, unknown> = {}) {
    const castRoll = (overrides["castRoll"] as any) ?? fakeCastRoll("public", 2);
    await postSpellCastResult({
      target: resisted,
      resistedBy: SpellResistedByEnum.ResistanceRoll,
      castRoll: castRoll,
      casterActor: casterActor,
      casterToken: casterToken,
      ...overrides,
    } as any);
    return castRoll;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).game.user = { isGM: true };
  });

  it("posts the plain roll and asks for no resistance when the cast failed", async () => {
    const castRoll = await post({ castRoll: fakeCastRoll("public", 4) });

    expect(castRoll.postToChat).toHaveBeenCalledOnce();
    expect(createResistanceRequest).not.toHaveBeenCalled();
  });

  it("posts the plain roll for a self cast, since casting on yourself is accepting", async () => {
    const castRoll = await post({
      target: { proceed: true, targetTokenUuid: "Scene.s.Token.caster", selfCast: true },
    });

    expect(castRoll.postToChat).toHaveBeenCalledOnce();
    expect(createResistanceRequest).not.toHaveBeenCalled();
  });

  it("posts the plain roll for a spell that is not resisted at all", async () => {
    const castRoll = await post({
      resistedBy: SpellResistedByEnum.None,
      target: { proceed: true, selfCast: false },
    });

    expect(castRoll.postToChat).toHaveBeenCalledOnce();
    expect(createResistanceRequest).not.toHaveBeenCalled();
  });

  it("builds one public combined card carrying the cast roll, without posting it separately", async () => {
    const castRoll = await post();

    expect(castRoll.postToChat).not.toHaveBeenCalled();
    expect(createResistanceRequest).toHaveBeenCalledOnce();
    const request = vi.mocked(createResistanceRequest).mock.calls[0]![0];
    expect(request).toMatchObject({
      targetTokenOrActorUuid: "Scene.s.Token.victim",
      rollerSide: "passive",
      rollMode: "public",
      allowVoluntaryAccept: true,
      isSpellCast: true,
      // The card names and is spoken by the caster - only the spell itself is concealed.
      frozenActorName: "Vasana",
      frozenTokenOrActorUuid: "Scene.s.Token.caster",
    });
    expect(request.spellCast).toEqual({
      castRoll: castRoll,
      casterTokenOrActorUuid: "Scene.s.Token.caster",
    });
    // The spell's name must never reach the responder dialog's title.
    expect(request.description).toBeUndefined();
  });

  it("splits a GM's hidden cast into a whispered roll and an anonymous request card", async () => {
    const castRoll = await post({ castRoll: fakeCastRoll("gm", 2) });

    expect(castRoll.postToChat).toHaveBeenCalledOnce();
    const request = vi.mocked(createResistanceRequest).mock.calls[0]![0];
    expect(request.spellCast).toBeUndefined();
    expect(request.frozenActorName).toBeUndefined();
    expect(request.frozenTokenOrActorUuid).toBeUndefined();
    // "self" would hide the request from the very person who has to answer it.
    expect(request.rollMode).toBe("gm");
  });

  it("keeps a blind cast's request blind", async () => {
    await post({ castRoll: fakeCastRoll("blind", 2) });

    expect(vi.mocked(createResistanceRequest).mock.calls[0]![0].rollMode).toBe("blind");
  });

  it("whispers the request rather than hiding it when the GM casts to themselves", async () => {
    await post({ castRoll: fakeCastRoll("self", 2) });

    expect(vi.mocked(createResistanceRequest).mock.calls[0]![0].rollMode).toBe("gm");
  });

  it("forces a player's cast public, so the target can answer the card", async () => {
    (globalThis as any).game.user = { isGM: false };
    const castRoll = await post({ castRoll: fakeCastRoll("gm", 2) });

    expect(castRoll.options.rollMode).toBe("public");
    expect(castRoll.postToChat).not.toHaveBeenCalled();
    const request = vi.mocked(createResistanceRequest).mock.calls[0]![0];
    expect(request.rollMode).toBe("public");
    expect(request.spellCast).toBeDefined();
  });
});

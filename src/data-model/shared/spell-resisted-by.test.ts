import { beforeEach, describe, expect, it, vi } from "vitest";
import { postSpellCastResult, resolveResistedSpellCastTarget } from "./spell-resisted-by";
import { SpellResistedByEnum, SpellResistedWithEnum } from "../item-data/spell";
import { createResistanceRequest } from "../../applications/resistance-roll-dialog/create-resistance-request";
import { interceptSpellCast } from "../../system/spell-effects/run-spell-apply";

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
  resolveCharacteristicLabel: vi.fn((name: string) => (name === "power" ? "POW" : "MP")),
  // Area spells: the caster has POW 14, every target POW 15 except "Scene.s.Token.strong" (POW 18)
  resolveActorFromUuid: vi.fn((uuid: string) => ({ uuid })),
  resolveCharacteristicValue: vi.fn((actor: { uuid: string }) =>
    actor.uuid === "Scene.s.Token.caster" ? 14 : actor.uuid === "Scene.s.Token.strong" ? 18 : 15,
  ),
}));

vi.mock("../../system/spell-effects/run-spell-apply", () => ({
  interceptSpellCast: vi.fn(async () => []),
}));

// DialogV2 has no shared mock in test/setup/foundryMockFunctions.js - the zero-target branch is the
// only thing here that reaches it. Same approach as magic-point-source.test.ts.
(globalThis as any).foundry ??= {};
(globalThis as any).foundry.applications ??= {};
(globalThis as any).foundry.applications.api ??= {};
(globalThis as any).foundry.applications.api.DialogV2 = {
  wait: vi.fn(async () => "withoutTarget"),
};
(globalThis as any).foundry.applications.handlebars ??= {};
(globalThis as any).foundry.applications.handlebars.renderTemplate = vi.fn(
  async () => "<div></div>",
);

const casterActor = { uuid: "Actor.caster" } as any;

function fakeTarget(actorUuid: string, uuid = `Scene.s.Token.${actorUuid}`) {
  return { document: { uuid: uuid, actor: { uuid: actorUuid } } };
}

function setTargets(...targets: unknown[]): void {
  (globalThis as any).game.user = { targets: new Set(targets) };
}

function mockChoice(answer: string | null): void {
  (globalThis as any).foundry.applications.api.DialogV2.wait = vi.fn(async () => answer);
}

function offeredActions(): string[] {
  const wait = (globalThis as any).foundry.applications.api.DialogV2.wait;
  return wait.mock.calls[0][0].buttons.map((b: { action: string }) => b.action);
}

describe("resolveResistedSpellCastTarget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChoice("withoutTarget");
    setTargets();
    (globalThis as any).canvas = undefined;
  });

  it("does not constrain a spell that is not resisted, whatever is targeted", async () => {
    setTargets(fakeTarget("Actor.a"), fakeTarget("Actor.b"));

    const result = await resolveResistedSpellCastTarget(
      SpellResistedByEnum.None,
      casterActor,
      "Bladesharp",
    );

    // still recorded, for the cast outcome
    expect(result).toEqual({
      proceed: true,
      targets: [
        { tokenUuid: "Scene.s.Token.Actor.a", isCaster: false },
        { tokenUuid: "Scene.s.Token.Actor.b", isCaster: false },
      ],
    });
    expect(ui.notifications?.warn).not.toHaveBeenCalled();
    expect((globalThis as any).foundry.applications.api.DialogV2.wait).not.toHaveBeenCalled();
  });

  it("casts a spell centered on its caster at the tokens in its area, not the user's targets", async () => {
    setTargets(fakeTarget("Actor.elsewhere"));

    const result = await resolveResistedSpellCastTarget(
      SpellResistedByEnum.ResistanceRollArea,
      casterActor,
      "Harmony",
      [fakeTarget("Actor.caster"), fakeTarget("Actor.a")] as any,
    );

    expect(result).toEqual({
      proceed: true,
      targets: [
        { tokenUuid: "Scene.s.Token.Actor.caster", isCaster: true },
        { tokenUuid: "Scene.s.Token.Actor.a", isCaster: false },
      ],
    });
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

  it("refuses more targets than the spell reaches at its level, one undead per point", async () => {
    setTargets(fakeTarget("Actor.a"), fakeTarget("Actor.b"), fakeTarget("Actor.c"));

    const atTwo = await resolveResistedSpellCastTarget(
      SpellResistedByEnum.ResistanceRollPerTarget,
      casterActor,
      "Turn Undead",
      undefined,
      2,
    );
    const atThree = await resolveResistedSpellCastTarget(
      SpellResistedByEnum.ResistanceRollPerTarget,
      casterActor,
      "Turn Undead",
      undefined,
      3,
    );

    expect(atTwo.proceed).toBe(false);
    expect(ui.notifications?.warn).toHaveBeenCalledTimes(1);
    expect(atThree.proceed).toBe(true);
    expect(atThree.targets).toHaveLength(3);
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
      targets: [{ tokenUuid: "Scene.s.Token.victim", isCaster: false }],
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
    expect(result.targets).toEqual([{ tokenUuid: "Scene.s.Token.caster", isCaster: true }]);
  });

  it("asks to confirm a cast with nothing targeted, which then has no target to resist", async () => {
    mockChoice("withoutTarget");

    const result = await resolveResistedSpellCastTarget(
      SpellResistedByEnum.ResistanceRoll,
      casterActor,
      "Heal",
    );

    expect(result).toEqual({ proceed: true, targets: [] });
  });

  it("offers to cast on yourself when the caster has no token to pick, which makes them the target", async () => {
    mockChoice("self");

    const result = await resolveResistedSpellCastTarget(
      SpellResistedByEnum.ResistanceRoll,
      casterActor,
      "Fanaticism",
    );

    expect(offeredActions()).toEqual(["withoutTarget", "self", "cancel"]);
    expect(result).toEqual({
      proceed: true,
      targets: [{ tokenUuid: "Actor.caster", isCaster: true }],
    });
  });

  it("leaves casting on yourself to the target picker when the caster has a token on the scene", async () => {
    const scene = {};
    (globalThis as any).canvas = { ready: true, scene: scene };
    try {
      await resolveResistedSpellCastTarget(
        SpellResistedByEnum.ResistanceRoll,
        { uuid: "Scene.s.Token.c.Actor.caster", token: { parent: scene, object: {} } } as any,
        "Fanaticism",
      );
    } finally {
      (globalThis as any).canvas = undefined;
    }

    expect(offeredActions()).toEqual(["withoutTarget", "cancel"]);
  });

  it("aborts the cast when that confirmation is declined, so no points are spent", async () => {
    mockChoice("cancel");

    const result = await resolveResistedSpellCastTarget(
      SpellResistedByEnum.ResistanceRoll,
      casterActor,
      "Heal",
    );

    expect(result).toEqual({ proceed: false, targets: [] });
  });

  it("aborts when the confirmation is dismissed rather than answered", async () => {
    mockChoice(null);

    const result = await resolveResistedSpellCastTarget(
      SpellResistedByEnum.ResistanceRoll,
      casterActor,
      "Heal",
    );

    expect(result.proceed).toBe(false);
  });

  it("lets a per-target spell be aimed at several targets", async () => {
    setTargets(fakeTarget("Actor.a"), fakeTarget("Actor.b"));

    const result = await resolveResistedSpellCastTarget(
      SpellResistedByEnum.ResistanceRollPerTarget,
      casterActor,
      "Turn Undead",
    );

    expect(result).toEqual({
      proceed: true,
      targets: [
        { tokenUuid: "Scene.s.Token.Actor.a", isCaster: false },
        { tokenUuid: "Scene.s.Token.Actor.b", isCaster: false },
      ],
    });
    expect(ui.notifications?.warn).not.toHaveBeenCalled();
  });

  it("asks to confirm a per-target spell cast with nothing targeted", async () => {
    mockChoice("withoutTarget");

    const result = await resolveResistedSpellCastTarget(
      SpellResistedByEnum.ResistanceRollPerTarget,
      casterActor,
      "Teleportation",
    );

    expect(result).toEqual({ proceed: true, targets: [] });
  });

  it.each([SpellResistedByEnum.SpiritCombatRound, SpellResistedByEnum.SpiritCombatDefeat])(
    "refuses a %s spell aimed at more than one target, since spirit combat is one on one",
    async (mode) => {
      setTargets(fakeTarget("Actor.a"), fakeTarget("Actor.b"));

      const result = await resolveResistedSpellCastTarget(mode, casterActor, "Bind Ghost");

      expect(result.proceed).toBe(false);
      expect(ui.notifications?.warn).toHaveBeenCalled();
    },
  );

  it("casts a spirit-combat gate with nothing targeted without offering a self cast", async () => {
    const result = await resolveResistedSpellCastTarget(
      SpellResistedByEnum.SpiritCombatRound,
      casterActor,
      "Resurrect",
    );

    expect(result).toEqual({ proceed: true, targets: [] });
    expect((globalThis as any).foundry.applications.api.DialogV2.wait).not.toHaveBeenCalled();
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
      postToChat: vi.fn(async () => ({ id: "castMessage" })),
      toJSON: vi.fn(() => ({ formula: "1d100" })),
    } as any;
  }

  const resisted = {
    proceed: true,
    targets: [{ tokenUuid: "Scene.s.Token.victim", isCaster: false }],
  };

  async function post(overrides: Record<string, unknown> = {}) {
    const castRoll = (overrides["castRoll"] as any) ?? fakeCastRoll("public", 2);
    await postSpellCastResult({
      target: resisted,
      resistedBy: SpellResistedByEnum.ResistanceRoll,
      resistedWith: SpellResistedWithEnum.Power,
      castRoll: castRoll,
      casterActor: casterActor,
      casterToken: casterToken,
      spellUuid: "Actor.caster.Item.spell",
      ...overrides,
    } as any);
    return castRoll;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).game.user = { isGM: true };
  });

  function postedCastMessage(castRoll: any) {
    return castRoll.postToChat.mock.calls[0][0];
  }

  it("posts a spellCast message with every target unaffected when the cast failed", async () => {
    const castRoll = await post({ castRoll: fakeCastRoll("public", 4) });

    expect(castRoll.postToChat).toHaveBeenCalledOnce();
    expect(createResistanceRequest).not.toHaveBeenCalled();
    expect(postedCastMessage(castRoll)).toEqual({
      type: "spellCast",
      content: "<div></div>",
      system: {
        spellUuid: "Actor.caster.Item.spell",
        casterTokenOrActorUuid: "Scene.s.Token.caster",
        castSuccessLevel: 4,
        resistedBy: SpellResistedByEnum.ResistanceRoll,
        targets: [
          {
            targetTokenOrActorUuid: "Scene.s.Token.victim",
            state: "unaffected",
            resolvedBy: "castFailed",
            casterSuccessLevel: 4,
          },
        ],
      },
    });
  });

  it("posts a spellCast message for a self cast, since casting on yourself is accepting", async () => {
    const castRoll = await post({
      target: {
        proceed: true,
        targets: [{ tokenUuid: "Scene.s.Token.caster", isCaster: true }],
      },
    });

    expect(createResistanceRequest).not.toHaveBeenCalled();
    expect(postedCastMessage(castRoll).system.targets).toEqual([
      {
        targetTokenOrActorUuid: "Scene.s.Token.caster",
        state: "affected",
        resolvedBy: "selfCast",
        casterSuccessLevel: 2,
      },
    ]);
  });

  it("marks every target affected for a spell that is not resisted at all", async () => {
    const castRoll = await post({
      resistedBy: SpellResistedByEnum.None,
      target: {
        proceed: true,
        targets: [
          { tokenUuid: "Scene.s.Token.a", isCaster: false },
          { tokenUuid: "Scene.s.Token.b", isCaster: false },
        ],
      },
    });

    expect(createResistanceRequest).not.toHaveBeenCalled();
    expect(
      postedCastMessage(castRoll).system.targets.map((t: any) => [t.state, t.resolvedBy]),
    ).toEqual([
      ["affected", "castOnly"],
      ["affected", "castOnly"],
    ]);
  });

  it("posts the cast and one linked request per target for a per-target spell", async () => {
    const castRoll = await post({
      resistedBy: SpellResistedByEnum.ResistanceRollPerTarget,
      resistedWith: SpellResistedWithEnum.MagicPoints,
      target: {
        proceed: true,
        targets: [
          { tokenUuid: "Scene.s.Token.a", isCaster: false },
          { tokenUuid: "Scene.s.Token.caster", isCaster: true },
          { tokenUuid: "Scene.s.Token.b", isCaster: false },
        ],
      },
    });

    expect(
      postedCastMessage(castRoll).system.targets.map((t: any) => [
        t.targetTokenOrActorUuid,
        t.state,
      ]),
    ).toEqual([
      ["Scene.s.Token.a", "pending"],
      ["Scene.s.Token.caster", "affected"],
      ["Scene.s.Token.b", "pending"],
    ]);
    const requests = vi.mocked(createResistanceRequest).mock.calls.map((call) => call[0]);
    expect(requests.map((r) => r.targetTokenOrActorUuid)).toEqual([
      "Scene.s.Token.a",
      "Scene.s.Token.b",
    ]);
    for (const request of requests) {
      expect(request).toMatchObject({
        spellCast: undefined,
        spellCastMessageId: "castMessage",
        rollerCharacteristics: "magicPoints",
        passiveLabel: "MP",
        frozenCharacteristics: "power",
        frozenActorName: "Vasana",
        rollMode: "public",
      });
    }
  });

  it("meets the targets' protective spells once, with the cast's points, the caster excluded", async () => {
    await post({
      castRoll: {
        ...fakeCastRoll("public", 2),
        options: { rollMode: "public", levelUsed: 2, magicPointBoost: 1 },
      },
      resistedBy: SpellResistedByEnum.None,
      target: {
        proceed: true,
        targets: [
          { tokenUuid: "Scene.s.Token.a", isCaster: false },
          { tokenUuid: "Scene.s.Token.caster", isCaster: true },
        ],
      },
    });

    expect(interceptSpellCast).toHaveBeenCalledExactlyOnceWith({
      spellUuid: "Actor.caster.Item.spell",
      targetUuids: ["Scene.s.Token.a"],
      rollOptions: { levelUsed: 2, magicPointBoost: 1 },
      casterUuid: "Scene.s.Token.caster",
      casterSuccessLevel: 2,
    });
  });

  it("asks a target its protective spells stopped for no resistance roll", async () => {
    vi.mocked(interceptSpellCast).mockResolvedValueOnce(["Scene.s.Token.victim"]);

    const castRoll = await post();

    expect(createResistanceRequest).not.toHaveBeenCalled();
    expect(postedCastMessage(castRoll).system.targets).toEqual([
      {
        targetTokenOrActorUuid: "Scene.s.Token.victim",
        state: "unaffected",
        resolvedBy: "intercepted",
        casterSuccessLevel: 2,
      },
    ]);
  });

  it("asks only the targets that weren't stopped for a per-target resistance roll", async () => {
    vi.mocked(interceptSpellCast).mockResolvedValueOnce(["Scene.s.Token.a"]);

    await post({
      resistedBy: SpellResistedByEnum.ResistanceRollPerTarget,
      target: {
        proceed: true,
        targets: [
          { tokenUuid: "Scene.s.Token.a", isCaster: false },
          { tokenUuid: "Scene.s.Token.b", isCaster: false },
        ],
      },
    });

    expect(
      vi.mocked(createResistanceRequest).mock.calls.map((call) => call[0].targetTokenOrActorUuid),
    ).toEqual(["Scene.s.Token.b"]);
  });

  it("meets no protective spells when the cast failed", async () => {
    await post({ castRoll: fakeCastRoll("public", 4) });

    expect(interceptSpellCast).not.toHaveBeenCalled();
  });

  it("asks for no resistance roll when a per-target cast fails", async () => {
    await post({
      castRoll: fakeCastRoll("public", 4),
      resistedBy: SpellResistedByEnum.ResistanceRollPerTarget,
      target: {
        proceed: true,
        targets: [{ tokenUuid: "Scene.s.Token.a", isCaster: false }],
      },
    });

    expect(createResistanceRequest).not.toHaveBeenCalled();
  });

  it("settles an area spell's targets, the caster's own included, by one resistance roll", async () => {
    (globalThis as any).foundry.dice ??= {};
    (globalThis as any).foundry.dice.Roll = class {
      total = 42;
      async evaluate() {
        return this;
      }
    };
    const castRoll = await post({
      resistedBy: SpellResistedByEnum.ResistanceRollArea,
      target: {
        proceed: true,
        targets: [
          { tokenUuid: "Scene.s.Token.a", isCaster: false },
          { tokenUuid: "Scene.s.Token.strong", isCaster: false },
          { tokenUuid: "Scene.s.Token.caster", isCaster: true },
        ],
      },
    });

    // POW 14 rolling 42 overcomes POW 15 or lower (RBM Harmony example)
    expect(
      postedCastMessage(castRoll).system.targets.map((t: any) => [
        t.targetTokenOrActorUuid,
        t.state,
        t.resolvedBy,
      ]),
    ).toEqual([
      ["Scene.s.Token.a", "affected", "resistanceRoll"],
      ["Scene.s.Token.strong", "unaffected", "resistanceRoll"],
      ["Scene.s.Token.caster", "affected", "resistanceRoll"],
    ]);
    expect(createResistanceRequest).not.toHaveBeenCalled();
  });

  it("records the resistedBy mode on the cast message, so the card can word the GM ruling", async () => {
    const castRoll = await post({
      resistedBy: SpellResistedByEnum.SpiritCombatRound,
      target: { proceed: true, targets: [] },
    });

    const system = postedCastMessage(castRoll).system;
    expect(system.resistedBy).toBe(SpellResistedByEnum.SpiritCombatRound);
    expect(system.targets).toMatchObject([{ targetTokenOrActorUuid: "", state: "pending" }]);
  });

  it("builds one public combined card carrying the cast roll, without posting it separately", async () => {
    const castRoll = await post();

    expect(castRoll.postToChat).not.toHaveBeenCalled();
    expect(createResistanceRequest).toHaveBeenCalledOnce();
    const request = vi.mocked(createResistanceRequest).mock.calls[0]![0];
    expect(request).toMatchObject({
      targetTokenOrActorUuid: "Scene.s.Token.victim",
      rollerSide: "passive",
      rollerCharacteristics: "power",
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
      spellUuid: "Actor.caster.Item.spell",
    });
    expect(request.spellCastMessageId).toBeUndefined();
    // The spell's name must never reach the responder dialog's title.
    expect(request.description).toBeUndefined();
  });

  it("splits a GM's hidden cast into a whispered roll and an anonymous request card", async () => {
    const castRoll = await post({ castRoll: fakeCastRoll("gm", 2) });

    expect(castRoll.postToChat).toHaveBeenCalledOnce();
    expect(postedCastMessage(castRoll).system.targets[0].state).toBe("pending");
    const request = vi.mocked(createResistanceRequest).mock.calls[0]![0];
    expect(request.spellCast).toBeUndefined();
    // the anonymous card settles the whispered cast message's outcome
    expect(request.spellCastMessageId).toBe("castMessage");
    expect(request.frozenActorName).toBeUndefined();
    expect(request.frozenTokenOrActorUuid).toBeUndefined();
    // "self" would hide the request from the very person who has to answer it.
    expect(request.rollMode).toBe("gm");
    // kept for when the spell takes effect, which reveals what it was
    expect(request.castFlavor).toBe("Demoralize");
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

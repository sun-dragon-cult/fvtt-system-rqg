import { beforeEach, describe, expect, it, vi } from "vitest";
import { postSpellCastResult, resolveResistedSpellCastTarget } from "./spell-resisted-by";
import { SpellResistedByEnum, SpellResistedWithEnum } from "../item-data/spell";
import { createResistanceRequest } from "../../applications/resistance-roll-dialog/create-resistance-request";
import { advanceSpellCast } from "../../system/spell-effects/spell-cast-runner";

// postSpellCastResult reaches these through dynamic imports; stubbing them keeps the routing
// assertions on the card that would be built rather than on ChatMessage.create.
vi.mock("../../applications/resistance-roll-dialog/create-resistance-request", () => ({
  createResistanceRequest: vi.fn(async () => ({ id: "combined" })),
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

vi.mock("../../system/spell-effects/spell-cast-runner", () => ({
  advanceSpellCast: vi.fn(async () => {}),
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
        { actorUuid: "Actor.a", tokenUuid: "Scene.s.Token.Actor.a", isCaster: false },
        { actorUuid: "Actor.b", tokenUuid: "Scene.s.Token.Actor.b", isCaster: false },
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
        { actorUuid: "Actor.caster", tokenUuid: "Scene.s.Token.Actor.caster", isCaster: true },
        { actorUuid: "Actor.a", tokenUuid: "Scene.s.Token.Actor.a", isCaster: false },
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
      targets: [{ actorUuid: "Actor.victim", tokenUuid: "Scene.s.Token.victim", isCaster: false }],
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
    expect(result.targets).toEqual([
      { actorUuid: "Actor.caster", tokenUuid: "Scene.s.Token.caster", isCaster: true },
    ]);
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
      targets: [{ actorUuid: "Actor.caster", tokenUuid: "", isCaster: true }],
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
        { actorUuid: "Actor.a", tokenUuid: "Scene.s.Token.Actor.a", isCaster: false },
        { actorUuid: "Actor.b", tokenUuid: "Scene.s.Token.Actor.b", isCaster: false },
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
  const victim = { actorUuid: "Actor.victim", tokenUuid: "Scene.s.Token.victim", isCaster: false };

  function fakeCastRoll(rollMode: string, successLevel: number) {
    return {
      options: { rollMode: rollMode, levelUsed: 2, magicPointBoost: 1 },
      successLevel: successLevel,
      flavor: "Demoralize",
      postToChat: vi.fn(async () => ({ id: "castMessage" })),
      toJSON: vi.fn(() => ({ formula: "1d100" })),
    } as any;
  }

  async function post(overrides: Record<string, unknown> = {}) {
    const castRoll = (overrides["castRoll"] as any) ?? fakeCastRoll("public", 2);
    await postSpellCastResult({
      target: { proceed: true, targets: [victim] },
      resistedBy: SpellResistedByEnum.ResistanceRoll,
      resistedWith: SpellResistedWithEnum.Power,
      targetKind: "creature",
      castRoll: castRoll,
      casterActor: casterActor,
      casterToken: casterToken,
      spellUuid: "Actor.caster.Item.spell",
      ...overrides,
    } as any);
    return castRoll;
  }

  function postedRecord(castRoll: any) {
    return castRoll.postToChat.mock.calls[0][0].system;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).game.user = { isGM: true };
  });

  it("builds one public combined card holding the record, waiting for the protective spells", async () => {
    const castRoll = await post();

    expect(castRoll.postToChat).not.toHaveBeenCalled();
    const request = vi.mocked(createResistanceRequest).mock.calls[0]![0];
    expect(request).toMatchObject({
      targetTokenOrActorUuid: "Scene.s.Token.victim",
      frozenValue: 15,
      rollMode: "public",
      waiting: true,
      spellCast: { casterTokenOrActorUuid: "Scene.s.Token.caster" },
    });
    expect(request.record).toMatchObject({
      casterActorUuid: "Actor.caster",
      casterTokenUuid: "Scene.s.Token.caster",
      castOptions: { levelUsed: 2, magicPointBoost: 1 },
      targets: [{ id: request.entryId, actorUuid: "Actor.victim", stage: "targeted" }],
    });
    expect(advanceSpellCast).toHaveBeenCalledWith("combined");
  });

  it("posts a spellCast record for a failed cast, every target settled, and advances it", async () => {
    const castRoll = await post({ castRoll: fakeCastRoll("public", 4) });

    expect(postedRecord(castRoll).targets).toEqual([
      expect.objectContaining({ stage: "settled", state: "unaffected", resolvedBy: "castFailed" }),
    ]);
    expect(createResistanceRequest).not.toHaveBeenCalled();
    expect(advanceSpellCast).toHaveBeenCalledWith("castMessage");
  });

  it("leaves a hidden or per-target cast's request cards to the runner", async () => {
    const hidden = await post({ castRoll: fakeCastRoll("gm", 2) });
    expect(postedRecord(hidden).castRollMode).toBe("gm");

    const perTarget = await post({
      resistedBy: SpellResistedByEnum.ResistanceRollPerTarget,
      target: {
        proceed: true,
        targets: [victim, { ...victim, actorUuid: "Actor.b", tokenUuid: "Scene.s.Token.b" }],
      },
    });
    expect(postedRecord(perTarget).targets).toHaveLength(2);
    expect(createResistanceRequest).not.toHaveBeenCalled();
  });

  it("rolls the caster's one d100 for an area spell, for the runner to read each target against", async () => {
    const dice = (globalThis as any).foundry.dice;
    (globalThis as any).foundry.dice = {
      Roll: class {
        total = 42;
        async evaluate() {
          return this;
        }
      },
    };
    try {
      const castRoll = await post({ resistedBy: SpellResistedByEnum.ResistanceRollArea });
      expect(postedRecord(castRoll).areaRoll).toEqual({ roll: 42, casterValue: 15 });
    } finally {
      (globalThis as any).foundry.dice = dice;
    }
  });

  it("puts an untargeted self spell on its caster, and leaves any other for the GM", async () => {
    const self = await post({
      resistedBy: SpellResistedByEnum.None,
      targetKind: "self",
      target: { proceed: true, targets: [] },
    });
    expect(postedRecord(self).targets[0]).toMatchObject({
      actorUuid: "Actor.caster",
      tokenUuid: "Scene.s.Token.caster",
      isCaster: true,
    });

    const creature = await post({
      resistedBy: SpellResistedByEnum.None,
      target: { proceed: true, targets: [] },
    });
    expect(postedRecord(creature).targets[0]).toMatchObject({ actorUuid: "", isCaster: false });
  });

  it("forces a player's cast public, so the target can answer the card", async () => {
    (globalThis as any).game.user = { isGM: false };
    const castRoll = await post({ castRoll: fakeCastRoll("gm", 2) });

    expect(castRoll.options.rollMode).toBe("public");
    expect(vi.mocked(createResistanceRequest).mock.calls[0]![0].rollMode).toBe("public");
  });
});

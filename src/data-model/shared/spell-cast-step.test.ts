import { describe, expect, it, vi } from "vitest";
import { stepSpellCast, type SpellCastStepEnv } from "./spell-cast-step";
import {
  buildSpellCastEntries,
  newSpellCastEntry,
  type SpellCastRecord,
  type SpellCastTarget,
} from "./spell-cast-record";
import { SpellResistedByEnum, SpellResistedWithEnum } from "../item-data/spell";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";

const { Success, Failure } = AbilitySuccessLevelEnum;

function record(resistedBy: SpellResistedByEnum, targets = [target("a")]): SpellCastRecord {
  return {
    spellUuid: "Actor.c.Item.s",
    spellRqid: "i.spirit-magic.befuddle",
    caster: { actorUuid: "Actor.c", tokenUuid: "Scene.s.Token.c" },
    casterPower: 15,
    castSuccessLevel: Success,
    resistedBy: resistedBy,
    resistedWith: SpellResistedWithEnum.Power,
    castRollMode: "public",
    castOptions: { levelUsed: 1, magicPointBoost: 0 },
    areaRoll: null,
    targets: targets,
  };
}

function target(name: string, isCaster = false) {
  return newSpellCastEntry(name, {
    actorUuid: `Actor.${name}`,
    tokenUuid: `Scene.s.Token.${name}`,
    isCaster: isCaster,
  });
}

function env(overrides: Partial<SpellCastStepEnv> = {}): SpellCastStepEnv {
  let id = 0;
  return {
    crossAreas: vi.fn(async () => {}),
    barrierStops: vi.fn(async () => false),
    areaTargetValue: vi.fn(() => 10),
    requestResistance: vi.fn(async (entry) => `request-${entry.id}`),
    reflects: vi.fn(async () => false),
    notApplied: vi.fn(async () => {}),
    newId: () => `new${id++}`,
    ...overrides,
  };
}

describe("stepSpellCast not applied", () => {
  it("tells the spell about a failed cast once, and settles it", async () => {
    const e = env();
    const failed = { ...target("a"), stage: "failed" as const, state: "unaffected" as const };
    const next = await stepSpellCast(record(SpellResistedByEnum.None, [failed]), [], e);
    expect(e.notApplied).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: "a" }),
      "castFailed",
    );
    expect(next.targets[0]!.stage).toBe("settled");
    await stepSpellCast(next, [], e);
    expect(e.notApplied).toHaveBeenCalledOnce();
  });

  it("tells the spell when a protective spell stops it", async () => {
    const e = env({ barrierStops: vi.fn(async () => true) });
    await stepSpellCast(record(SpellResistedByEnum.ResistanceRoll), [], e);
    expect(e.notApplied).toHaveBeenCalledExactlyOnceWith(expect.anything(), "blocked");
  });

  it("tells the spell when the target's resistance held, but not when it was reflected", async () => {
    const e = env();
    const asked = await stepSpellCast(record(SpellResistedByEnum.ResistanceRoll), [], e);
    const held: Parameters<typeof stepSpellCast>[1] = [
      { kind: "resistance", entryId: "a", result: "held", casterSuccessLevel: Failure },
    ];
    await stepSpellCast(asked, held, e);
    expect(e.notApplied).toHaveBeenCalledExactlyOnceWith(expect.anything(), "resisted");

    const reflecting = env({ reflects: vi.fn(async () => true) });
    await stepSpellCast(asked, held, reflecting);
    expect(reflecting.notApplied).not.toHaveBeenCalled();
  });

  it("doesn't tell the spell when the target is affected", async () => {
    const e = env();
    await stepSpellCast(record(SpellResistedByEnum.None), [], e);
    expect(e.notApplied).not.toHaveBeenCalled();
  });
});

describe("stepSpellCast", () => {
  it("passes an unresisted spell through areas and protective spells, crossing areas once", async () => {
    const e = env();
    const next = await stepSpellCast(
      record(SpellResistedByEnum.None, [target("a"), target("b")]),
      [],
      e,
    );
    expect(e.crossAreas).toHaveBeenCalledOnce();
    expect(next.targets.map((t) => [t.stage, t.resolvedBy])).toEqual([
      ["affected", "castOnly"],
      ["affected", "castOnly"],
    ]);
  });

  it("settles a target whose protective spells stop the spell, with no resistance request", async () => {
    const e = env({ barrierStops: vi.fn(async () => true) });
    const next = await stepSpellCast(record(SpellResistedByEnum.ResistanceRoll), [], e);
    expect(next.targets[0]).toMatchObject({
      stage: "settled",
      state: "unaffected",
      resolvedBy: "intercepted",
    });
    expect(e.requestResistance).not.toHaveBeenCalled();
  });

  it("doesn't meet the caster's own defenses or areas for a spell they cast on themselves", async () => {
    const e = env({ barrierStops: vi.fn(async () => true) });
    const next = await stepSpellCast(
      record(SpellResistedByEnum.ResistanceRoll, [target("c", true)]),
      [],
      e,
    );
    expect(next.targets[0]).toMatchObject({ state: "affected", resolvedBy: "selfCast" });
    expect(e.barrierStops).not.toHaveBeenCalled();
    expect(e.crossAreas).not.toHaveBeenCalled();
  });

  it("asks for a resistance roll once, then settles from the answer", async () => {
    const e = env();
    const asked = await stepSpellCast(record(SpellResistedByEnum.ResistanceRoll), [], e);
    expect(asked.targets[0]).toMatchObject({ stage: "resistance", requestMessageId: "request-a" });
    const again = await stepSpellCast(asked, [], e);
    expect(e.requestResistance).toHaveBeenCalledOnce();

    const overcome = await stepSpellCast(
      again,
      [{ kind: "resistance", entryId: "a", result: "overcame", casterSuccessLevel: Success }],
      e,
    );
    expect(overcome.targets[0]).toMatchObject({
      stage: "affected",
      resolvedBy: "resistanceRoll",
      casterSuccessLevel: Success,
    });
    const held = await stepSpellCast(
      again,
      [{ kind: "resistance", entryId: "a", result: "held", casterSuccessLevel: Failure }],
      e,
    );
    expect(held.targets[0]).toMatchObject({ stage: "settled", state: "unaffected" });
  });

  it("asks only once when no request card could be made", async () => {
    const e = env({ requestResistance: vi.fn(async () => "") });
    const next = await stepSpellCast(record(SpellResistedByEnum.ResistanceRoll), [], e);
    expect(e.requestResistance).toHaveBeenCalledOnce();
    expect(next.targets[0]).toMatchObject({ stage: "resistance", requestMessageId: "" });
  });

  it("sends a held spell back at its caster as a new entry that meets their defenses first", async () => {
    const e = env({ reflects: vi.fn(async () => true) });
    const asked = await stepSpellCast(record(SpellResistedByEnum.ResistanceRoll), [], e);
    const reflected = await stepSpellCast(
      asked,
      [{ kind: "resistance", entryId: "a", result: "held", casterSuccessLevel: Failure }],
      e,
    );
    expect(reflected.targets[0]).toMatchObject({ state: "unaffected", resolvedBy: "reflected" });
    expect(reflected.targets[1]).toMatchObject({
      actorUuid: "Actor.c",
      tokenUuid: "Scene.s.Token.c",
      reflectedFromId: "a",
      stage: "resistance",
      requestMessageId: "request-new0",
    });
    expect(e.barrierStops).toHaveBeenCalledWith(expect.objectContaining({ reflectedFromId: "a" }));

    const casterHeld = await stepSpellCast(
      reflected,
      [{ kind: "resistance", entryId: "new0", result: "held" }],
      e,
    );
    expect(casterHeld.targets[1]).toMatchObject({ stage: "settled", state: "unaffected" });
    expect(e.reflects).toHaveBeenCalledOnce();
  });

  it("stops a reflected spell at its caster's protective spells before they resist", async () => {
    const e = env({
      reflects: vi.fn(async () => true),
      barrierStops: vi.fn(async (entry) => !!entry.reflectedFromId),
    });
    const asked = await stepSpellCast(record(SpellResistedByEnum.ResistanceRoll), [], e);
    const next = await stepSpellCast(
      asked,
      [{ kind: "resistance", entryId: "a", result: "held" }],
      e,
    );
    expect(next.targets[1]).toMatchObject({ resolvedBy: "intercepted", requestMessageId: "" });
  });

  it("treats a GM 'unaffected' ruling on a resistance roll as resisted, so Reflection can act", async () => {
    const e = env({ reflects: vi.fn(async () => true) });
    const asked = await stepSpellCast(record(SpellResistedByEnum.ResistanceRoll), [], e);
    const next = await stepSpellCast(
      asked,
      [{ kind: "ruling", entryId: "a", state: "unaffected" }],
      e,
    );
    expect(next.targets[0]!.resolvedBy).toBe("reflected");
    expect(next.targets).toHaveLength(2);
  });

  it("won't overrule a reflection, which already sent the spell back", async () => {
    const e = env({ reflects: vi.fn(async () => true) });
    const asked = await stepSpellCast(record(SpellResistedByEnum.ResistanceRoll), [], e);
    const reflected = await stepSpellCast(
      asked,
      [{ kind: "resistance", entryId: "a", result: "held" }],
      e,
    );
    const ruled = await stepSpellCast(
      reflected,
      [{ kind: "ruling", entryId: "a", state: "affected" }],
      e,
    );
    expect(ruled.targets[0]).toMatchObject({ state: "unaffected", resolvedBy: "reflected" });
  });

  it("won't overrule a protective spell or an applied effect", async () => {
    const stopped = await stepSpellCast(
      record(SpellResistedByEnum.None),
      [],
      env({ barrierStops: vi.fn(async () => true) }),
    );
    const ruled = await stepSpellCast(
      stopped,
      [{ kind: "ruling", entryId: "a", state: "affected" }],
      env(),
    );
    expect(ruled.targets[0]!.resolvedBy).toBe("intercepted");

    const affected = await stepSpellCast(record(SpellResistedByEnum.None), [], env());
    const applied = await stepSpellCast(
      affected,
      [
        {
          kind: "applied",
          entryId: "a",
          effectUuids: ["Actor.a.ActiveEffect.e"],
          blockedReason: "",
        },
      ],
      env(),
    );
    expect(applied.targets[0]).toMatchObject({
      stage: "applied",
      effectUuids: ["Actor.a.ActiveEffect.e"],
    });
    const late = await stepSpellCast(
      applied,
      [{ kind: "ruling", entryId: "a", state: "unaffected" }],
      env(),
    );
    expect(late.targets[0]!.stage).toBe("applied");
  });

  it("settles every target of an area spell from the caster's one roll, the caster included", async () => {
    const area = {
      ...record(SpellResistedByEnum.ResistanceRollArea, [target("a"), target("c", true)]),
      areaRoll: { roll: 31, casterValue: 15 },
    };
    const values: Record<string, number> = { a: 18, c: 30 };
    const next = await stepSpellCast(
      area,
      [],
      env({ areaTargetValue: vi.fn((entry) => values[entry.id]) }),
    );
    expect(next.targets.map((t) => t.state)).toEqual(["affected", "unaffected"]);
  });

  it("leaves spirit-combat gates and untargeted entries waiting for the GM", async () => {
    const gate = await stepSpellCast(record(SpellResistedByEnum.SpiritCombatRound), [], env());
    expect(gate.targets[0]).toMatchObject({ stage: "resistance", state: "pending" });

    const untargeted = record(SpellResistedByEnum.None, [
      newSpellCastEntry("u", { actorUuid: "", tokenUuid: "", isCaster: false }),
    ]);
    const waiting = await stepSpellCast(untargeted, [], env());
    expect(waiting.targets[0]!.stage).toBe("targeted");
  });

  it("lets the GM assign actors to an untargeted entry, which then goes on like a targeted one", async () => {
    const untargeted = record(SpellResistedByEnum.None, [
      newSpellCastEntry("u", { actorUuid: "", tokenUuid: "", isCaster: false }),
    ]);
    const next = await stepSpellCast(
      untargeted,
      [
        {
          kind: "assign",
          entryId: "u",
          targets: [
            { actorUuid: "Actor.x", tokenUuid: "" },
            { actorUuid: "Actor.y", tokenUuid: "" },
          ],
        },
      ],
      env(),
    );
    expect(next.targets.map((t) => [t.id, t.actorUuid, t.state])).toEqual([
      ["u", "Actor.x", "affected"],
      ["new0", "Actor.y", "affected"],
    ]);
  });

  it("leaves the record it was given unchanged", async () => {
    const original = record(SpellResistedByEnum.None);
    await stepSpellCast(original, [], env());
    expect(original.targets[0]!.stage).toBe("targeted");
  });
});

describe("buildSpellCastEntries", () => {
  const caster = { actorUuid: "Actor.c", tokenUuid: "Scene.s.Token.c" };
  let n = 0;
  const build = (
    targetKind: string,
    resistedBy: SpellResistedByEnum = SpellResistedByEnum.None,
    castSucceeded = true,
    targets: SpellCastTarget[] = [],
  ) =>
    buildSpellCastEntries({
      castSucceeded,
      resistedBy,
      targetKind,
      targets,
      caster,
      newId: () => `e${n++}`,
    });

  it("puts an untargeted self or weapon spell on its caster", () => {
    expect(build("self")[0]).toMatchObject({ actorUuid: "Actor.c", isCaster: true });
    expect(build("weapon")[0]).toMatchObject({ tokenUuid: "Scene.s.Token.c", isCaster: true });
  });

  it("puts any untargeted unresisted spell on its caster", () => {
    expect(build("spellOrEffect")[0]).toMatchObject({ actorUuid: "Actor.c", isCaster: true });
  });

  it("puts an unresisted self or creates spell on its caster even with a target", () => {
    const other = [{ actorUuid: "Actor.x", tokenUuid: "", isCaster: false }];
    expect(build("creates", SpellResistedByEnum.None, true, other)).toMatchObject([
      { actorUuid: "Actor.c", isCaster: true },
    ]);
    expect(build("self", SpellResistedByEnum.None, true, other)[0]!.isCaster).toBe(true);
    expect(build("creates", SpellResistedByEnum.SpiritCombatRound, true, other)[0]!.actorUuid).toBe(
      "Actor.x",
    );
    expect(build("creature", SpellResistedByEnum.None, true, other)[0]!.actorUuid).toBe("Actor.x");
  });

  it("leaves any other untargeted resisted spell for the GM to assign", () => {
    expect(build("creature", SpellResistedByEnum.ResistanceRoll)[0]).toMatchObject({
      actorUuid: "",
      isCaster: false,
    });
    expect(build("self", SpellResistedByEnum.SpiritCombatRound)[0]!.actorUuid).toBe("");
  });

  it("keeps a target's reach warning for the GM, and none on an untargeted entry", () => {
    const far = [
      { actorUuid: "Actor.x", tokenUuid: "", isCaster: false, reachWarning: "outOfSight" as const },
    ];
    expect(build("creature", SpellResistedByEnum.None, true, far)[0]!.reachWarning).toBe(
      "outOfSight",
    );
    expect(build("creature", SpellResistedByEnum.ResistanceRoll)[0]!.reachWarning).toBe("");
  });

  it("holds every entry of a failed cast for the runner to tell the spell", () => {
    expect(build("self", SpellResistedByEnum.None, false)[0]).toMatchObject({
      stage: "failed",
      state: "unaffected",
      resolvedBy: "castFailed",
    });
  });
});

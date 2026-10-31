import { describe, expect, it, vi } from "vitest";
import { advanceSpellCastRecord, type SpellCastAdvanceEnv } from "./spell-cast-advance";
import {
  buildSpellCastEntries,
  newSpellCastEntry,
  type SpellCastRecord,
} from "./spell-cast-record";
import { SpellResistedByEnum, SpellResistedWithEnum } from "../item-data/spell";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";

const { Success, Failure } = AbilitySuccessLevelEnum;

function record(resistedBy: SpellResistedByEnum, targets = [target("a")]): SpellCastRecord {
  return {
    spellUuid: "Actor.c.Item.s",
    casterActorUuid: "Actor.c",
    casterTokenUuid: "Scene.s.Token.c",
    casterPower: 15,
    castSuccessLevel: Success,
    resistedBy: resistedBy,
    resistedWith: SpellResistedWithEnum.Power,
    hidden: false,
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

function env(overrides: Partial<SpellCastAdvanceEnv> = {}): SpellCastAdvanceEnv {
  let id = 0;
  return {
    crossAreas: vi.fn(async () => {}),
    barrierStops: vi.fn(async () => false),
    areaTargetValue: vi.fn(() => 10),
    requestResistance: vi.fn(async (entry) => `request-${entry.id}`),
    reflects: vi.fn(async () => false),
    newId: () => `new${id++}`,
    ...overrides,
  };
}

describe("advanceSpellCastRecord", () => {
  it("passes an unresisted spell through areas and protective spells, crossing areas once", async () => {
    const e = env();
    const next = await advanceSpellCastRecord(
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
    const next = await advanceSpellCastRecord(record(SpellResistedByEnum.ResistanceRoll), [], e);
    expect(next.targets[0]).toMatchObject({
      stage: "settled",
      state: "unaffected",
      resolvedBy: "intercepted",
    });
    expect(e.requestResistance).not.toHaveBeenCalled();
  });

  it("doesn't meet the caster's own defenses or areas for a spell they cast on themselves", async () => {
    const e = env({ barrierStops: vi.fn(async () => true) });
    const next = await advanceSpellCastRecord(
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
    const asked = await advanceSpellCastRecord(record(SpellResistedByEnum.ResistanceRoll), [], e);
    expect(asked.targets[0]).toMatchObject({ stage: "resistance", requestMessageId: "request-a" });
    const again = await advanceSpellCastRecord(asked, [], e);
    expect(e.requestResistance).toHaveBeenCalledOnce();

    const overcome = await advanceSpellCastRecord(
      again,
      [{ kind: "resistance", entryId: "a", result: "overcame", casterSuccessLevel: Success }],
      e,
    );
    expect(overcome.targets[0]).toMatchObject({
      stage: "affected",
      resolvedBy: "resistanceRoll",
      casterSuccessLevel: Success,
    });
    const held = await advanceSpellCastRecord(
      again,
      [{ kind: "resistance", entryId: "a", result: "held", casterSuccessLevel: Failure }],
      e,
    );
    expect(held.targets[0]).toMatchObject({ stage: "settled", state: "unaffected" });
  });

  it("sends a held spell back at its caster as a new entry that meets their defenses first", async () => {
    const e = env({ reflects: vi.fn(async () => true) });
    const asked = await advanceSpellCastRecord(record(SpellResistedByEnum.ResistanceRoll), [], e);
    const reflected = await advanceSpellCastRecord(
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

    const casterHeld = await advanceSpellCastRecord(
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
    const asked = await advanceSpellCastRecord(record(SpellResistedByEnum.ResistanceRoll), [], e);
    const next = await advanceSpellCastRecord(
      asked,
      [{ kind: "resistance", entryId: "a", result: "held" }],
      e,
    );
    expect(next.targets[1]).toMatchObject({ resolvedBy: "intercepted", requestMessageId: "" });
  });

  it("treats a GM 'unaffected' ruling on a resistance roll as resisted, so Reflection can act", async () => {
    const e = env({ reflects: vi.fn(async () => true) });
    const asked = await advanceSpellCastRecord(record(SpellResistedByEnum.ResistanceRoll), [], e);
    const next = await advanceSpellCastRecord(
      asked,
      [{ kind: "ruling", entryId: "a", state: "unaffected" }],
      e,
    );
    expect(next.targets[0].resolvedBy).toBe("reflected");
    expect(next.targets).toHaveLength(2);
  });

  it("won't overrule a protective spell or an applied effect", async () => {
    const stopped = await advanceSpellCastRecord(
      record(SpellResistedByEnum.None),
      [],
      env({ barrierStops: vi.fn(async () => true) }),
    );
    const ruled = await advanceSpellCastRecord(
      stopped,
      [{ kind: "ruling", entryId: "a", state: "affected" }],
      env(),
    );
    expect(ruled.targets[0].resolvedBy).toBe("intercepted");

    const affected = await advanceSpellCastRecord(record(SpellResistedByEnum.None), [], env());
    const applied = await advanceSpellCastRecord(
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
    const late = await advanceSpellCastRecord(
      applied,
      [{ kind: "ruling", entryId: "a", state: "unaffected" }],
      env(),
    );
    expect(late.targets[0].stage).toBe("applied");
  });

  it("settles every target of an area spell from the caster's one roll, the caster included", async () => {
    const area = {
      ...record(SpellResistedByEnum.ResistanceRollArea, [target("a"), target("c", true)]),
      areaRoll: { roll: 31, casterValue: 15 },
    };
    const values: Record<string, number> = { a: 18, c: 30 };
    const next = await advanceSpellCastRecord(
      area,
      [],
      env({ areaTargetValue: vi.fn((entry) => values[entry.id]) }),
    );
    expect(next.targets.map((t) => t.state)).toEqual(["affected", "unaffected"]);
  });

  it("leaves spirit-combat gates and untargeted entries waiting for the GM", async () => {
    const gate = await advanceSpellCastRecord(
      record(SpellResistedByEnum.SpiritCombatRound),
      [],
      env(),
    );
    expect(gate.targets[0]).toMatchObject({ stage: "resistance", state: "pending" });

    const untargeted = record(SpellResistedByEnum.None, [
      newSpellCastEntry("u", { actorUuid: "", tokenUuid: "", isCaster: false }),
    ]);
    const waiting = await advanceSpellCastRecord(untargeted, [], env());
    expect(waiting.targets[0].stage).toBe("targeted");
  });

  it("lets the GM assign actors to an untargeted entry, which then goes on like a targeted one", async () => {
    const untargeted = record(SpellResistedByEnum.None, [
      newSpellCastEntry("u", { actorUuid: "", tokenUuid: "", isCaster: false }),
    ]);
    const next = await advanceSpellCastRecord(
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
    await advanceSpellCastRecord(original, [], env());
    expect(original.targets[0].stage).toBe("targeted");
  });
});

describe("buildSpellCastEntries", () => {
  const caster = { actorUuid: "Actor.c", tokenUuid: "Scene.s.Token.c" };
  let n = 0;
  const build = (targetKind: string, resistedBy = SpellResistedByEnum.None, castSucceeded = true) =>
    buildSpellCastEntries({
      castSucceeded,
      resistedBy,
      targetKind,
      targets: [],
      caster,
      newId: () => `e${n++}`,
    });

  it("puts an untargeted self or weapon spell on its caster", () => {
    expect(build("self")[0]).toMatchObject({ actorUuid: "Actor.c", isCaster: true });
    expect(build("weapon")[0]).toMatchObject({ tokenUuid: "Scene.s.Token.c", isCaster: true });
  });

  it("leaves any other untargeted spell for the GM to assign", () => {
    expect(build("creature")[0]).toMatchObject({ actorUuid: "", isCaster: false });
    expect(build("self", SpellResistedByEnum.SpiritCombatRound)[0].actorUuid).toBe("");
  });

  it("settles every entry of a failed cast", () => {
    expect(build("self", SpellResistedByEnum.None, false)[0]).toMatchObject({
      stage: "settled",
      state: "unaffected",
      resolvedBy: "castFailed",
    });
  });
});

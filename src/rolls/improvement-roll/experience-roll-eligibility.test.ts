import { beforeEach, describe, expect, it, vi } from "vitest";

/** Queued outcomes the fake Roll hands out, in the order the resolver constructs rolls
 * (gate, then gain) - mirrors improvement-roll.test.ts's fake since resolveImprovement is
 * exercised indirectly through rollExperienceRollEntry/rollAllExperienceRollEntries here. */
type QueuedRoll = { total: number };
let queue: QueuedRoll[] = [];

class FakeRoll {
  formula: string;
  total: number | undefined;

  constructor(formula: string) {
    this.formula = formula;
  }

  async evaluate(): Promise<this> {
    this.total = queue.shift()?.total ?? 1;
    return this;
  }
}

(globalThis as any).foundry.dice.Roll = FakeRoll;

// Imported after the Roll stub is in place - `import Roll = foundry.dice.Roll` in
// improvement-roll.ts captures the binding at module evaluation time.
const {
  buildExperienceRollRowView,
  getEligibleExperienceRollEntries,
  groupExperienceRollRows,
  rollAllExperienceRollEntries,
  rollExperienceRollEntry,
} = await import("./experience-roll-eligibility");

function createSkillItem(overrides: Partial<any> = {}) {
  return {
    id: "skill1",
    type: "skill",
    name: "Sword",
    img: "sword.png",
    system: { category: "meleeWeapons", applyChanceGain: vi.fn() },
    _source: { system: { baseChance: 40, gainedChance: 0, hasExperience: true } },
    ...overrides,
  } as any;
}

/** A resolved ImprovementResult for a 40%-base Sword skill, passed to buildExperienceRollRowView -
 * shared shape for the "resolved row" tests below, which only vary gain/succeeded/newValue/request.gain. */
function resolvedResult({ request: requestOverrides, ...overrides }: Partial<any> = {}) {
  return {
    request: {
      source: "experience",
      name: "Sword",
      typeLocName: "Skill",
      actorName: "Vasana",
      currentValue: 40,
      valueSuffix: "%",
      gain: { kind: "random", formula: "1d6" },
      gateBreakdownChips: [],
      speaker: {},
      ...requestOverrides,
    },
    succeeded: true,
    gain: 3,
    previousValue: 40,
    newValue: 43,
    ...overrides,
  } as any;
}

function characterActor(overrides: Partial<any> = {}) {
  const neutral = { value: 13 };
  const actor: any = {
    type: "character",
    items: [],
    update: vi.fn(),
    _source: {
      system: {
        characteristics: {
          strength: neutral,
          constitution: neutral,
          size: neutral,
          dexterity: neutral,
          intelligence: neutral,
          power: { value: 13, hasExperience: false, formula: "3d6" },
          charisma: neutral,
        },
        attributes: { isCreature: false },
      },
    },
    ...overrides,
  };
  for (const item of actor.items) {
    item.parent = actor;
  }
  // Mirrors Foundry's real Collection#get, which getEligibleExperienceRollEntry relies on.
  actor.items.get = (id: string) => actor.items.find((item: any) => item.id === id);
  return actor;
}

beforeEach(() => {
  queue = [];
  const evaluate = vi.fn(async () => ({ total: 18 }));
  const evaluateSync = vi.fn(() => ({ total: 18 }));
  vi.stubGlobal("Roll", {
    create: vi.fn(() => ({ evaluate, evaluateSync })),
  });
});

describe("getEligibleExperienceRollEntries", () => {
  it("returns an empty list when nothing has a pending experience check", () => {
    const actor = characterActor();
    expect(getEligibleExperienceRollEntries(actor)).toEqual([]);
  });

  it("collects an ability item with hasExperience set", () => {
    const actor = characterActor({ items: [createSkillItem()] });

    const entries = getEligibleExperienceRollEntries(actor);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ id: "skill1", kind: "skill", rollable: true });
  });

  it("ignores ability items without hasExperience set", () => {
    const actor = characterActor({
      items: [
        createSkillItem({
          _source: { system: { baseChance: 40, gainedChance: 0, hasExperience: false } },
        }),
      ],
    });

    expect(getEligibleExperienceRollEntries(actor)).toEqual([]);
  });

  it("ignores non-ability item types", () => {
    const gear = { id: "gear1", type: "gear", _source: { system: {} } };
    const actor = characterActor({ items: [gear] });

    expect(getEligibleExperienceRollEntries(actor)).toEqual([]);
  });

  it("collects POW when its source hasExperience flag is set", () => {
    const actor = characterActor();
    actor._source.system.characteristics.power.hasExperience = true;

    const entries = getEligibleExperienceRollEntries(actor);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ id: "power", kind: "power", rollable: true });
  });

  it("lists POW at species max as disabled with a reason rather than dropping it", () => {
    const actor = characterActor();
    actor._source.system.characteristics.power = {
      value: 21,
      hasExperience: true,
      formula: "3d6",
    };

    const entries = getEligibleExperienceRollEntries(actor);

    expect(entries).toHaveLength(1);
    expect(entries[0]!.rollable).toBe(false);
    expect(entries[0]!.disabledReasonText).toBeTruthy();
  });

  it("lists a Rune at its 100% cap as disabled with a reason", () => {
    const rune = {
      id: "rune1",
      type: "rune",
      name: "Fire",
      img: null,
      system: { rune: "Fire", applyChanceGain: vi.fn() },
      _source: { system: { chance: 100, hasExperience: true } },
    };
    const actor = characterActor({ items: [rune] });

    const entries = getEligibleExperienceRollEntries(actor);

    expect(entries).toHaveLength(1);
    expect(entries[0]!.rollable).toBe(false);
    expect(entries[0]!.disabledReasonText).toBeTruthy();
  });

  it("mixes abilities and POW in one list", () => {
    const actor = characterActor({ items: [createSkillItem()] });
    actor._source.system.characteristics.power.hasExperience = true;

    const entries = getEligibleExperienceRollEntries(actor);

    expect(entries.map((e) => e.kind).sort()).toEqual(["power", "skill"]);
  });
});

describe("buildExperienceRollRowView", () => {
  const speaker = {} as ChatMessage.SpeakerData;

  it("shows abilities as roll-over (with a > symbol) and POW as roll-under (no symbol)", () => {
    const actor = characterActor({ items: [createSkillItem()] });
    actor._source.system.characteristics.power.hasExperience = true;

    const entries = getEligibleExperienceRollEntries(actor);
    const rows = entries.map((entry) =>
      buildExperienceRollRowView(entry, "random", "Vasana", speaker),
    );

    const skillRow = rows.find((r) => r.kind === "skill")!;
    const powerRow = rows.find((r) => r.kind === "power")!;

    expect(skillRow.comparatorSymbol).toBe(">");
    expect(powerRow.comparatorSymbol).toBe("");
  });

  it("surfaces the cult standing bonus in the POW row's target tooltip", () => {
    const actor = characterActor({
      items: [{ type: "cult", system: { joinedCults: [{ rank: "runePriest" }] } }],
    });
    actor._source.system.characteristics.power.hasExperience = true;

    const entries = getEligibleExperienceRollEntries(actor);
    const row = buildExperienceRollRowView(entries[0]!, "random", "Vasana", speaker);

    expect(row.targetTooltip).toContain("20");
    expect(row.targetTooltip).toContain("RQG.Actor.RuneMagic.CultRank.runePriest");
  });

  it("fills in the resolved outcome when a result is passed in", () => {
    const actor = characterActor({ items: [createSkillItem()] });

    const entries = getEligibleExperienceRollEntries(actor);
    const row = buildExperienceRollRowView(
      entries[0]!,
      "random",
      "Vasana",
      speaker,
      resolvedResult(),
    );

    expect(row.resolved?.increased).toBe(true);
    expect(row.resolved?.gainDisplay).toBe("3%");
  });

  it("treats a passed gate that rolls a 0 gain as not increased, not a false success", () => {
    const actor = characterActor({ items: [createSkillItem()] });

    const entries = getEligibleExperienceRollEntries(actor);
    const row = buildExperienceRollRowView(
      entries[0]!,
      "random",
      "Vasana",
      speaker,
      resolvedResult({
        request: { gain: { kind: "random", formula: "1d6-1" } },
        gain: 0,
        newValue: 40,
      }),
    );

    expect(row.resolved?.increased).toBe(false);
    expect(row.resolved?.gainDisplay).toBe("0%");
    expect(row.resolved?.valueChangeDisplay).toBeUndefined();
  });

  it("shows the fixed/random icon matching the current toggle for a pending row", () => {
    const actor = characterActor({ items: [createSkillItem()] });

    const entries = getEligibleExperienceRollEntries(actor);
    const fixedRow = buildExperienceRollRowView(entries[0]!, "fixed", "Vasana", speaker);
    const randomRow = buildExperienceRollRowView(entries[0]!, "random", "Vasana", speaker);

    expect(fixedRow.gainIcon).toBe("fa-hashtag");
    expect(randomRow.gainIcon).toBe("fa-dice");
  });

  it("shows a resolved row's icon for the gain kind it was actually rolled with, not the current toggle", () => {
    const actor = characterActor({ items: [createSkillItem()] });

    const entries = getEligibleExperienceRollEntries(actor);
    // Rolled while "fixed" was selected, but the toggle has since moved to "random".
    const row = buildExperienceRollRowView(
      entries[0]!,
      "random",
      "Vasana",
      speaker,
      resolvedResult({ request: { gain: { kind: "fixed", formula: "3" } } }),
    );

    expect(row.resolved?.gainIcon).toBe("fa-hashtag");
  });
});

describe("groupExperienceRollRows", () => {
  it("groups by kind in power/rune/passion/skill order and drops empty groups", () => {
    const rows = [
      { kind: "power", typeLocName: "Characteristic" },
      { kind: "rune", typeLocName: "Rune" },
      { kind: "skill", typeLocName: "Skill" },
      { kind: "skill", typeLocName: "Skill" },
    ] as any;

    const groups = groupExperienceRollRows(rows);

    expect(groups.map((g) => g.kind)).toEqual(["power", "rune", "skill"]);
    expect(groups.find((g) => g.kind === "skill")?.rows).toHaveLength(2);
  });

  it("returns an empty list for no rows", () => {
    expect(groupExperienceRollRows([])).toEqual([]);
  });
});

describe("rollExperienceRollEntry", () => {
  const speaker = {} as ChatMessage.SpeakerData;

  it("returns undefined and does not write when the entry is no longer eligible", async () => {
    const actor = characterActor();

    const result = await rollExperienceRollEntry(actor, "power", "random", "Vasana", speaker);

    expect(result).toBeUndefined();
    expect(actor.update).not.toHaveBeenCalled();
  });

  it("returns undefined for a disabled (species-max) entry rather than rolling it", async () => {
    const actor = characterActor();
    actor._source.system.characteristics.power = {
      value: 21,
      hasExperience: true,
      formula: "3d6",
    };

    const result = await rollExperienceRollEntry(actor, "power", "random", "Vasana", speaker);

    expect(result).toBeUndefined();
    expect(actor.update).not.toHaveBeenCalled();
  });

  it("rolls POW under (speciesMax - POW) x 5 and applies the gain, clearing hasExperience", async () => {
    const actor = characterActor();
    actor._source.system.characteristics.power = {
      value: 13,
      hasExperience: true,
      formula: "3d6",
    };
    queue = [{ total: 1 }, { total: 2 }]; // gate: 1 <= 40 succeeds; gain: 1d3-1 -> 2

    const resolution = await rollExperienceRollEntry(actor, "power", "random", "Vasana", speaker);

    expect(resolution).toBeDefined();
    expect(resolution!.result.request.gate).toMatchObject({ comparator: "roll-under" });
    expect(resolution!.result.succeeded).toBe(true);
    expect(actor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.objectContaining({
          characteristics: expect.objectContaining({
            power: expect.objectContaining({ hasExperience: false, value: 15 }),
          }),
        }),
      }),
    );
  });

  it("rolls an ability over its chance and applies the gain through the item", async () => {
    const skill = createSkillItem();
    const actor = characterActor({ items: [skill] });
    queue = [{ total: 99 }, { total: 4 }]; // gate: 99 > threshold succeeds; gain: 4

    const resolution = await rollExperienceRollEntry(actor, "skill1", "random", "Vasana", speaker);

    expect(resolution).toBeDefined();
    expect(resolution!.result.request.gate).toMatchObject({ comparator: "roll-over" });
    expect(resolution!.result.succeeded).toBe(true);
    expect(skill.system.applyChanceGain).toHaveBeenCalledWith(4);
  });

  it("fails the gate without applying any gain", async () => {
    const skill = createSkillItem();
    const actor = characterActor({ items: [skill] });
    queue = [{ total: 1 }]; // gate: 1 > 40 fails, no gain roll happens

    const resolution = await rollExperienceRollEntry(actor, "skill1", "random", "Vasana", speaker);

    expect(resolution!.result.succeeded).toBe(false);
    expect(resolution!.result.gain).toBe(0);
    expect(skill.system.applyChanceGain).toHaveBeenCalledWith(0);
  });
});

describe("rollAllExperienceRollEntries", () => {
  const speaker = {} as ChatMessage.SpeakerData;

  it("returns one resolution per rollable entry over a mixed queue", async () => {
    const skill = createSkillItem();
    const actor = characterActor({ items: [skill] });
    actor._source.system.characteristics.power.hasExperience = true;
    queue = [
      { total: 1 },
      { total: 2 }, // POW gate succeeds, gain 2 (POW rolls first - see below)
      { total: 99 },
      { total: 4 }, // skill gate succeeds, gain 4
    ];

    const resolutions = await rollAllExperienceRollEntries(actor, "random", "Vasana", speaker);

    expect(resolutions).toHaveLength(2);
    expect(actor.update).toHaveBeenCalledTimes(1);
    expect(skill.system.applyChanceGain).toHaveBeenCalledTimes(1);
  });

  it("rolls POW before abilities, since a POW gain can shift a skill category modifier for the rest of the batch", async () => {
    const skill = createSkillItem();
    const actor = characterActor({ items: [skill] });
    actor._source.system.characteristics.power.hasExperience = true;
    queue = [{ total: 1 }, { total: 2 }, { total: 99 }, { total: 4 }];

    const results = await rollAllExperienceRollEntries(actor, "random", "Vasana", speaker);

    expect(results[0]!.entry.kind).toBe("power");
    expect(results[1]!.entry.kind).toBe("skill");
  });

  it("skips disabled entries and returns an empty list when nothing is rollable", async () => {
    const actor = characterActor();
    actor._source.system.characteristics.power = {
      value: 21,
      hasExperience: true,
      formula: "3d6",
    };

    const resolutions = await rollAllExperienceRollEntries(actor, "random", "Vasana", speaker);

    expect(resolutions).toEqual([]);
    expect(actor.update).not.toHaveBeenCalled();
  });

  it("returns an empty list for an empty queue", async () => {
    const actor = characterActor();

    const resolutions = await rollAllExperienceRollEntries(actor, "random", "Vasana", speaker);

    expect(resolutions).toEqual([]);
  });
});

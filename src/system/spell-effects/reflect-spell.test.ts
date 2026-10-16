import { beforeEach, describe, expect, it, vi } from "vitest";
import { reflectResistedSpell } from "./reflect-spell";
import { spellBehaviorForEffect } from "./spell-behavior";
import { createResistanceRequest } from "../../applications/resistance-roll-dialog/create-resistance-request";

vi.mock("./spell-behavior", () => ({ spellBehaviorForEffect: vi.fn() }));
vi.mock("../../applications/resistance-roll-dialog/create-resistance-request", () => ({
  createResistanceRequest: vi.fn(async () => undefined),
}));
vi.mock("../../applications/resistance-roll-dialog/resistance-roll-shared", () => ({
  resolveCharacteristicSide: vi.fn(() => ({ value: 16, label: "POW", actorName: "Jar-eel" })),
}));
vi.mock("../util", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  safeFromJSON: vi.fn(() => castRoll),
}));

const castRoll = { options: { levelUsed: 2, magicPointBoost: 1 }, flavor: "Befuddle" };
const reflection = { name: "Reflection", active: true };
const spell = {
  type: "spiritMagic",
  name: "Befuddle",
  flags: {},
  system: { duration: "temporal" },
};
const target = { name: "Harrek", allApplicableEffects: () => [reflection] };

function request(system: Record<string, unknown> = {}) {
  return {
    id: "request",
    system: {
      isSpellCast: true,
      reflectedFromMessageId: "",
      spellCastMessageId: "",
      spellUuid: "Actor.caster.Item.befuddle",
      spellCasterUuid: "Scene.s.Token.caster",
      targetTokenOrActorUuid: "Actor.harrek",
      castRoll: { formula: "1d100" },
      activeValue: 18,
      rollMode: "public",
      ...system,
    },
  } as any;
}

function onResisted(outcome: "reflected" | "pass") {
  const hook = vi.fn(async () => ({ outcome }));
  vi.mocked(spellBehaviorForEffect).mockReturnValue({ onResisted: hook } as any);
  return hook;
}

describe("reflectResistedSpell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).TokenDocument ??= class {};
    const documents: Record<string, unknown> = {
      [request().system.spellUuid]: spell,
      "Actor.harrek": target,
    };
    vi.mocked(fromUuid).mockImplementation((async (uuid: string) => documents[uuid]) as any);
  });

  it("sends a reflected spell back at its caster, with the caster's POW when they cast it", async () => {
    const hook = onResisted("reflected");

    await reflectResistedSpell(request());

    expect(hook).toHaveBeenCalledWith(
      expect.objectContaining({
        spell: spell,
        targetActor: target,
        effects: [reflection],
        cast: expect.objectContaining({ level: 2, magicPointsSpent: 3, runePointsSpent: 0 }),
      }),
    );
    expect(createResistanceRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        targetTokenOrActorUuid: "Scene.s.Token.caster",
        rollerCharacteristics: "power",
        frozenValue: 18,
        isSpellCast: true,
        spellCast: {
          castRoll: castRoll,
          casterTokenOrActorUuid: "Scene.s.Token.caster",
          spellUuid: "Actor.caster.Item.befuddle",
        },
        reflectedFrom: { messageId: "request", reflectorName: "Harrek" },
      }),
    );
  });

  it("leaves the spell where it is when no effect reflects it", async () => {
    onResisted("pass");

    await reflectResistedSpell(request());

    expect(createResistanceRequest).not.toHaveBeenCalled();
  });

  it("asks the GM to reflect a hidden cast, whose cast message the player can't see", async () => {
    const query = vi.fn(async () => undefined);
    (globalThis as any).game.users = { activeGM: { query } };
    (globalThis as any).game.messages = { has: () => false, get: () => undefined };
    const hook = onResisted("reflected");

    await reflectResistedSpell(
      request({
        spellUuid: "",
        spellCasterUuid: "",
        castRoll: undefined,
        spellCastMessageId: "cast",
      }),
    );

    expect(query).toHaveBeenCalledWith("rqg.reflectResistedSpell", { requestId: "request" });
    expect(hook).not.toHaveBeenCalled();
  });

  it("never reflects a reflected spell again, or a request that isn't a spell", async () => {
    const hook = onResisted("reflected");

    await reflectResistedSpell(request({ reflectedFromMessageId: "earlier" }));
    await reflectResistedSpell(request({ isSpellCast: false }));

    expect(hook).not.toHaveBeenCalled();
    expect(createResistanceRequest).not.toHaveBeenCalled();
  });
});

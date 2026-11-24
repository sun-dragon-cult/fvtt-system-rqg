import { describe, expect, it, vi } from "vitest";

const base = vi.hoisted(() => {
  const state = { canDetect: true };
  class DetectionMode {
    static DETECTION_TYPES = { SIGHT: 0 };
    constructor(data: object) {
      Object.assign(this, data);
    }
  }
  class DetectionModeAll extends DetectionMode {
    _canDetect() {
      return state.canDetect;
    }
  }
  class Token {
    constructor(public document: unknown) {}
  }
  const g = globalThis as any;
  g.foundry = {
    ...g.foundry,
    canvas: {
      ...g.foundry?.canvas,
      perception: { DetectionMode, DetectionModeAll },
      rendering: { filters: { AbstractBaseFilter: class {} } },
      placeables: { Token },
    },
  };
  return { state, Token };
});

import { hasPowAura, PowAuraDetectionMode } from "./pow-aura-detection-mode";

function tokenWithPow(value: unknown, statuses: string[] = []) {
  return {
    actor: { system: { characteristics: { power: { value } } } },
    hasStatusEffect: (id: string) => statuses.includes(id),
  } as any;
}

function canDetect(target: unknown): boolean {
  const mode = new PowAuraDetectionMode({} as any) as any;
  return mode._canDetect({}, target);
}

describe("POW aura detection mode", () => {
  it.each([
    [12, true],
    [1, true],
    [0, false],
    [null, false],
    [undefined, false],
  ])("a being with POW %j has an aura: %s", (pow, expected) => {
    expect(hasPowAura(tokenWithPow(pow))).toBe(expected);
  });

  it("has no aura without an actor", () => {
    expect(hasPowAura({ actor: null } as any)).toBe(false);
    expect(hasPowAura(undefined)).toBe(false);
  });

  it("detects a token whose actor has POW", () => {
    base.state.canDetect = true;
    expect(canDetect(new base.Token(tokenWithPow(14)))).toBe(true);
  });

  it("doesn't detect undead, without POW", () => {
    base.state.canDetect = true;
    expect(canDetect(new base.Token(tokenWithPow(null)))).toBe(false);
  });

  it("doesn't detect a discorporate being, in the Spirit World", () => {
    base.state.canDetect = true;
    expect(canDetect(new base.Token(tokenWithPow(14, ["discorporate"])))).toBe(false);
  });

  it("detects an invisible being by its POW", () => {
    base.state.canDetect = true;
    expect(canDetect(new base.Token(tokenWithPow(14, ["invisible"])))).toBe(true);
  });

  it("doesn't detect what isn't a token", () => {
    base.state.canDetect = true;
    expect(canDetect({ document: tokenWithPow(14) })).toBe(false);
  });

  it("fails when core's see-all mode does, like for a blinded viewer", () => {
    base.state.canDetect = false;
    expect(canDetect(new base.Token(tokenWithPow(14)))).toBe(false);
  });
});

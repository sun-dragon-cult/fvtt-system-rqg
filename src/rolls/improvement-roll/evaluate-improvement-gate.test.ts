import { describe, expect, it } from "vitest";

import { evaluateImprovementGate } from "./evaluate-improvement-gate";
import type { ImprovementGateSpec } from "./improvement-roll.types";

const abilityGate: ImprovementGateSpec = {
  formula: "1d100",
  comparator: "roll-over",
  threshold: 65,
};

const skillGate: ImprovementGateSpec = {
  ...abilityGate,
  naturalHundredAlwaysSucceeds: true,
};

const characteristicGate: ImprovementGateSpec = {
  formula: "1d100",
  comparator: "roll-under",
  threshold: 45,
};

describe("evaluateImprovementGate", () => {
  describe("roll-over (abilities)", () => {
    it("gains when the roll beats the threshold", () => {
      expect(evaluateImprovementGate(abilityGate, 66)).toBe(true);
    });

    it("does not gain when the roll equals the threshold", () => {
      expect(evaluateImprovementGate(abilityGate, 65)).toBe(false);
    });

    it("does not gain when the roll is below the threshold", () => {
      expect(evaluateImprovementGate(abilityGate, 12)).toBe(false);
    });

    it("gains on a natural 100 even when a negative category modifier pushed the threshold above 100", () => {
      expect(evaluateImprovementGate({ ...skillGate, threshold: 120 }, 100, 100)).toBe(true);
    });

    it("ignores a natural 100 when the domain did not ask for that exception", () => {
      expect(evaluateImprovementGate({ ...abilityGate, threshold: 90 }, 75, 100)).toBe(false);
    });
  });

  describe("roll-under (characteristics)", () => {
    it("gains when the roll is below the threshold", () => {
      expect(evaluateImprovementGate(characteristicGate, 12)).toBe(true);
    });

    it("gains when the roll equals the threshold", () => {
      expect(evaluateImprovementGate(characteristicGate, 45)).toBe(true);
    });

    it("does not gain when the roll is above the threshold", () => {
      expect(evaluateImprovementGate(characteristicGate, 46)).toBe(false);
    });

    it("does not treat a natural 100 as a success", () => {
      expect(evaluateImprovementGate(characteristicGate, 100, 100)).toBe(false);
    });
  });

  it("fails when the roll produced no total", () => {
    expect(evaluateImprovementGate(abilityGate, undefined)).toBe(false);
    expect(evaluateImprovementGate(characteristicGate, undefined)).toBe(false);
  });
});

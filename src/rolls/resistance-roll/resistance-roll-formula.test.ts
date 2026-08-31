import { describe, it, expect } from "vitest";
import { computeResistanceTargetChance } from "./resistance-roll-formula";

// Core rulebook: "General Use" text on p.146, Resistance Table on p.147.
describe("computeResistanceTargetChance", () => {
  describe("equal and opposed characteristic values", () => {
    it("is 50% when the active equals the passive", () => {
      expect(computeResistanceTargetChance(1, 1)).toBe(50);
      expect(computeResistanceTargetChance(10, 10)).toBe(50);
      expect(computeResistanceTargetChance(21, 21)).toBe(50);
    });

    it("gains 5% for every point the active is above the passive", () => {
      expect(computeResistanceTargetChance(11, 10)).toBe(55);
      expect(computeResistanceTargetChance(15, 10)).toBe(75);
      expect(computeResistanceTargetChance(19, 10)).toBe(95);
    });

    it("loses 5% for every point the active is below the passive", () => {
      expect(computeResistanceTargetChance(10, 11)).toBe(45);
      expect(computeResistanceTargetChance(10, 15)).toBe(25);
      expect(computeResistanceTargetChance(10, 19)).toBe(5);
    });

    it("is not clamped to 0-100 - the 1-5/96-00 rule is a roll-time concern, not the target%", () => {
      expect(computeResistanceTargetChance(20, 1)).toBe(145);
      expect(computeResistanceTargetChance(1, 11)).toBe(0);
      expect(computeResistanceTargetChance(1, 21)).toBe(-50);
    });
  });

  describe("modifiers", () => {
    it("applies no modifier by default", () => {
      expect(computeResistanceTargetChance(12, 10)).toBe(60);
    });

    it("adds a positive modifier (augment / Meditate)", () => {
      expect(computeResistanceTargetChance(10, 10, [20])).toBe(70);
    });

    it("subtracts a negative modifier (failed augment)", () => {
      expect(computeResistanceTargetChance(10, 10, [-20])).toBe(30);
    });

    it("sums several modifiers with the characteristic difference", () => {
      // 50 + (10 - 12) * 5 + (20 + 15 - 5)
      expect(computeResistanceTargetChance(10, 12, [20, 15, -5])).toBe(70);
    });

    it("treats a non-finite modifier entry as 0", () => {
      expect(computeResistanceTargetChance(10, 10, [Number.NaN, 10])).toBe(60);
    });
  });

  describe("fractional inputs round the target% up, toward the active side", () => {
    it("rounds a fractional gain up", () => {
      expect(computeResistanceTargetChance(10, 10, [2.5])).toBe(53);
    });

    it("rounds a fractional penalty up (a smaller penalty than the raw value)", () => {
      expect(computeResistanceTargetChance(10, 10, [-2.5])).toBe(48);
    });

    it("rounds a fractional characteristic difference up", () => {
      expect(computeResistanceTargetChance(10.5, 10)).toBe(53);
    });

    it("leaves an already-whole result alone", () => {
      expect(computeResistanceTargetChance(10, 10, [1.5, 0.5])).toBe(52);
    });
  });

  describe("agrees with the printed Resistance Table (Core p.147)", () => {
    // Transcribed row by row as printed: line index = passive 1..21, entry index = active 1..21.
    // "-" is the table's "—" dash (no positive chance; the active side can still only make it on a 1-5).
    const printedRows = [
      "50 55 60 65 70 75 80 85 90 95 100 105 110 115 120 125 130 135 140 145 150",
      "45 50 55 60 65 70 75 80 85 90 95 100 105 110 115 120 125 130 135 140 145",
      "40 45 50 55 60 65 70 75 80 85 90 95 100 105 110 115 120 125 130 135 140",
      "35 40 45 50 55 60 65 70 75 80 85 90 95 100 105 110 115 120 125 130 135",
      "30 35 40 45 50 55 60 65 70 75 80 85 90 95 100 105 110 115 120 125 130",
      "25 30 35 40 45 50 55 60 65 70 75 80 85 90 95 100 105 110 115 120 125",
      "20 25 30 35 40 45 50 55 60 65 70 75 80 85 90 95 100 105 110 115 120",
      "15 20 25 30 35 40 45 50 55 60 65 70 75 80 85 90 95 100 105 110 115",
      "10 15 20 25 30 35 40 45 50 55 60 65 70 75 80 85 90 95 100 105 110",
      "5 10 15 20 25 30 35 40 45 50 55 60 65 70 75 80 85 90 95 100 105",
      "- 5 10 15 20 25 30 35 40 45 50 55 60 65 70 75 80 85 90 95 100",
      "- - 5 10 15 20 25 30 35 40 45 50 55 60 65 70 75 80 85 90 95",
      "- - - 5 10 15 20 25 30 35 40 45 50 55 60 65 70 75 80 85 90",
      "- - - - 5 10 15 20 25 30 35 40 45 50 55 60 65 70 75 80 85",
      "- - - - - 5 10 15 20 25 30 35 40 45 50 55 60 65 70 75 80",
      "- - - - - - 5 10 15 20 25 30 35 40 45 50 55 60 65 70 75",
      "- - - - - - - 5 10 15 20 25 30 35 40 45 50 55 60 65 70",
      "- - - - - - - - 5 10 15 20 25 30 35 40 45 50 55 60 65",
      "- - - - - - - - - 5 10 15 20 25 30 35 40 45 50 55 60",
      "- - - - - - - - - - 5 10 15 20 25 30 35 40 45 50 55",
      "- - - - - - - - - - - 5 10 15 20 25 30 35 40 45 50",
    ];

    printedRows.forEach((printedRow, rowIndex) => {
      const passive = rowIndex + 1;
      it(`reproduces every active 1-21 vs passive ${passive} cell`, () => {
        const expected = printedRow.split(" ").map((cell) => (cell === "-" ? null : Number(cell)));
        const actual = expected.map((_, colIndex) => {
          const chance = computeResistanceTargetChance(colIndex + 1, passive);
          return chance > 0 ? chance : null;
        });
        expect(actual).toEqual(expected);
      });
    });
  });

  describe("matches the worked examples in the rulebook text", () => {
    it("Vasana's Demoralize: POW 15 vs POW 14 is 55% (p.146)", () => {
      expect(computeResistanceTargetChance(15, 14)).toBe(55);
    });

    it("Vasana's Demoralize with a +15% Meditate bonus is 70% (p.146)", () => {
      expect(computeResistanceTargetChance(15, 14, [15])).toBe(70);
    });

    it("Sorala vs the gas: CON 11 vs POT 8 is 65%, leaving the gas a 35% chance (p.147)", () => {
      const soralaChance = computeResistanceTargetChance(11, 8);
      expect(soralaChance).toBe(65);
      expect(100 - soralaChance).toBe(35);
    });
  });
});

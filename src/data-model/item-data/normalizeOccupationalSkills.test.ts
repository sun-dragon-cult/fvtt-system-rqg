import { normalizeOccupationalSkills } from "./occupationData";
import { describe, it, expect } from "vitest";

describe("normalizeOccupationalSkills", () => {
  it("returns empty array for undefined input", () => {
    expect(normalizeOccupationalSkills(undefined)).toStrictEqual([]);
  });

  it("returns empty array for null input", () => {
    expect(normalizeOccupationalSkills(null)).toStrictEqual([]);
  });

  it("returns empty array for non-array input", () => {
    expect(normalizeOccupationalSkills({})).toStrictEqual([]);
  });

  it("returns empty array for empty array input", () => {
    expect(normalizeOccupationalSkills([])).toStrictEqual([]);
  });

  it("normalizes valid skills with skillRqidLink", () => {
    const input = [
      {
        incomeSkill: true,
        bonus: 10,
        skillRqidLink: { rqid: "i.skill.farming", name: "Farming" },
      },
    ];
    expect(normalizeOccupationalSkills(input)).toStrictEqual([
      {
        incomeSkill: true,
        bonus: 10,
        skillRqidLink: { rqid: "i.skill.farming", name: "Farming" },
      },
    ]);
  });

  it("falls back to top-level rqid/name when skillRqidLink is absent", () => {
    const input = [
      {
        incomeSkill: false,
        bonus: 5,
        rqid: "i.skill.sword",
        name: "Sword",
      },
    ];
    expect(normalizeOccupationalSkills(input)).toStrictEqual([
      {
        incomeSkill: false,
        bonus: 5,
        skillRqidLink: { rqid: "i.skill.sword", name: "Sword" },
      },
    ]);
  });

  it("filters out entries with empty rqid", () => {
    const input = [
      { skillRqidLink: { rqid: "", name: "Empty" } },
      { skillRqidLink: { rqid: "i.skill.dodge", name: "Dodge" } },
    ];
    expect(normalizeOccupationalSkills(input)).toStrictEqual([
      {
        incomeSkill: false,
        bonus: 0,
        skillRqidLink: { rqid: "i.skill.dodge", name: "Dodge" },
      },
    ]);
  });

  it("falls back name to rqid when name is empty", () => {
    const input = [{ skillRqidLink: { rqid: "i.skill.dodge", name: "" } }];
    expect(normalizeOccupationalSkills(input)).toStrictEqual([
      {
        incomeSkill: false,
        bonus: 0,
        skillRqidLink: { rqid: "i.skill.dodge", name: "i.skill.dodge" },
      },
    ]);
  });

  it("defaults incomeSkill to false when absent", () => {
    const input = [{ skillRqidLink: { rqid: "i.skill.dodge", name: "Dodge" } }];
    expect(normalizeOccupationalSkills(input)[0]?.incomeSkill).toBe(false);
  });

  it("defaults bonus to 0 when absent", () => {
    const input = [{ skillRqidLink: { rqid: "i.skill.dodge", name: "Dodge" } }];
    expect(normalizeOccupationalSkills(input)[0]?.bonus).toBe(0);
  });

  it("handles NaN bonus by defaulting to 0", () => {
    const input = [{ skillRqidLink: { rqid: "i.skill.dodge", name: "Dodge" }, bonus: "abc" }];
    expect(normalizeOccupationalSkills(input)[0]?.bonus).toBe(0);
  });

  it("handles negative bonus values", () => {
    const input = [{ skillRqidLink: { rqid: "i.skill.dodge", name: "Dodge" }, bonus: -5 }];
    expect(normalizeOccupationalSkills(input)[0]?.bonus).toBe(-5);
  });

  it("handles multiple skills", () => {
    const input = [
      { skillRqidLink: { rqid: "i.skill.dodge", name: "Dodge" }, bonus: 5, incomeSkill: false },
      { skillRqidLink: { rqid: "i.skill.farming", name: "Farming" }, bonus: 10, incomeSkill: true },
    ];
    expect(normalizeOccupationalSkills(input)).toStrictEqual([
      {
        incomeSkill: false,
        bonus: 5,
        skillRqidLink: { rqid: "i.skill.dodge", name: "Dodge" },
      },
      {
        incomeSkill: true,
        bonus: 10,
        skillRqidLink: { rqid: "i.skill.farming", name: "Farming" },
      },
    ]);
  });
});

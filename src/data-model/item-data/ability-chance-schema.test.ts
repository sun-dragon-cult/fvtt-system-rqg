import { describe, expect, it } from "vitest";
import { SkillDataModel } from "./skill-data-model";
import { RuneDataModel } from "./rune-data-model";
import { PassionDataModel } from "./passion-data-model";

describe("Ability item chance persistence", () => {
  it("does not persist `chance` for skill (it's purely derived from baseChance + gainedChance)", () => {
    const schema = SkillDataModel.defineSchema();
    expect(schema).not.toHaveProperty("chance");
    expect(schema).toHaveProperty("baseChance");
    expect(schema).toHaveProperty("gainedChance");
  });

  it("persists `chance` for rune", () => {
    const schema = RuneDataModel.defineSchema();
    expect(schema).toHaveProperty("chance");
  });

  it("persists `chance` for passion", () => {
    const schema = PassionDataModel.defineSchema();
    expect(schema).toHaveProperty("chance");
  });
});

import { RqgCalculations } from "./rqgCalculations";

describe("Skill Category Modifiers are correct for", () => {
  it("average character with normal rules", () => {
    const skillCategoryModifiers = RqgCalculations.skillCategoryModifiers(
      13,
      11,
      15,
      12,
      15,
      11,
      false
    );
    expect(skillCategoryModifiers).toStrictEqual({
      agility: 5,
      communication: 0,
      knowledge: 0,
      magic: 5,
      manipulation: 5,
      perception: 0,
      stealth: 5,
      meleeWeapons: 5,
      missileWeapons: 5,
      naturalWeapons: 5,
      shields: 5,
      otherSkills: 0,
    });
  });

  it("creature", () => {
    const skillCategoryModifiers = RqgCalculations.skillCategoryModifiers(
      170,
      65,
      13,
      19,
      26,
      21,
      true
    );
    expect(skillCategoryModifiers).toStrictEqual({
      agility: 0,
      communication: 0,
      knowledge: 0,
      magic: 0,
      manipulation: 0,
      perception: 0,
      stealth: 0,
      meleeWeapons: 0,
      missileWeapons: 0,
      naturalWeapons: 0,
      shields: 0,
      otherSkills: 0,
    });
  });
});

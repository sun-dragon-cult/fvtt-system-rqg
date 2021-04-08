import { RqgCalculations } from "./rqgCalculations";

describe("Skill Category Modifiers are correct for", () => {
  it("average character with normal rules", () => {
    const skillCategoryModifiers = RqgCalculations.skillCategoryModifiers(13, 11, 15, 12, 15, 11);
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

  it("extreme beast with house rule dampened increase", () => {
    const skillCategoryModifiers = RqgCalculations.skillCategoryModifiers(170, 65, 13, 19, 26, 21);
    expect(skillCategoryModifiers).toStrictEqual({
      agility: 54,
      communication: 31,
      knowledge: 25,
      magic: 30,
      manipulation: 69,
      perception: 25,
      stealth: -70,
      meleeWeapons: 69,
      missileWeapons: 69,
      naturalWeapons: 69,
      shields: 69,
      otherSkills: 0,
    });
  });
});

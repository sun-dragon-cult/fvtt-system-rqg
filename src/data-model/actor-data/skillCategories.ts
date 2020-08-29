export class SkillCategories {
  constructor(
    public agility: number = 0,
    public communication: number = 0,
    public knowledge: number = 0,
    public magic: number = 0,
    public manipulation: number = 0,
    public perception: number = 0,
    public stealth: number = 0,
    public meleeWeapons: number = 0,
    public missileWeapons: number = 0,
    public shields: number = 0,
    public naturalWeapons: number = 0,
    public otherSkills: number = 0
  ) {}
}

export const emptySkillCategories = new SkillCategories();

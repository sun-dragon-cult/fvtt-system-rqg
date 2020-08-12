export class SkillCategories {
  constructor(
    public Agility: number = 0,
    public Communication: number = 0,
    public Knowledge: number = 0,
    public Magic: number = 0,
    public Manipulation: number = 0,
    public Perception: number = 0,
    public Stealth: number = 0
  ) {}
}

export const emptySkillCategories = new SkillCategories();

import type { RqgItem } from "@items/rqgItem.ts";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { abilitySchemaFields } from "../shared/abilitySchemaFields";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqidLinkField";
import type { RqidLink } from "../shared/rqidLink";
import type { RqidString } from "../../system/api/rqidApi";
import { enumChoices } from "../shared/enumChoices";

export type SkillItem = RqgItem & { system: Item.SystemOfType<"skill"> };

export const SkillCategoryEnum = {
  Agility: "agility",
  Communication: "communication",
  Knowledge: "knowledge",
  Magic: "magic",
  Manipulation: "manipulation",
  Perception: "perception",
  Stealth: "stealth",
  MeleeWeapons: "meleeWeapons",
  MissileWeapons: "missileWeapons",
  Shields: "shields",
  NaturalWeapons: "naturalWeapons",
  OtherSkills: "otherSkills",
} as const;
export type SkillCategoryEnum = (typeof SkillCategoryEnum)[keyof typeof SkillCategoryEnum];

const { NumberField, StringField } = foundry.data.fields;

type SkillSchema = ReturnType<typeof SkillDataModel.defineSchema>;

export class SkillDataModel extends RqgItemDataModel<
  SkillSchema,
  { chance: number; categoryMod: number }
> {
  declare runeRqidLinks: RqidLink<`i.rune.${string}`>[];
  declare descriptionRqidLink: RqidLink<RqidString>;

  static override defineSchema() {
    return {
      ...abilitySchemaFields(),
      descriptionRqidLink: rqidLinkSchemaField({ nullable: true }),
      category: new StringField({
        blank: false,
        nullable: false,
        initial: SkillCategoryEnum.Magic,
        choices: enumChoices(SkillCategoryEnum, "RQG.Actor.Skill.SkillCategory."),
      }),
      skillName: new StringField({ blank: true, nullable: false, initial: "" }),
      specialization: new StringField({ blank: true, nullable: false, initial: "" }),
      baseChance: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
      gainedChance: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
      runeRqidLinks: rqidLinkArraySchemaField(),
    } as const;
  }
}

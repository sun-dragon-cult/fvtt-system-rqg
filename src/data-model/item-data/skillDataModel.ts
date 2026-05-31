import type { RqgItem } from "@items/rqgItem.ts";
import { AbilityDataModel } from "./abilityDataModel";
import { abilitySchemaFields } from "../shared/abilitySchemaFields";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqidLinkField";
import type { RqidLink } from "../shared/rqidLink";
import type { RqidString } from "../../system/api/rqidApi";
import { enumChoices } from "../shared/enumChoices";
import { RqgError } from "../../system/util";

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

export class SkillDataModel extends AbilityDataModel<
  SkillSchema,
  { chance: number; categoryMod: number }
> {
  declare baseChance: number;
  declare gainedChance: number;
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

  override async applyChanceGain(gain: number): Promise<void> {
    const item = this.parent;
    if (!item) {
      throw new RqgError("Tried to improve a skill item that isn't embedded on an actor", item);
    }

    const newGainedChance = Number(this.gainedChance) + gain;
    await item.update({
      system: { hasExperience: false, gainedChance: newGainedChance },
    });
  }
}

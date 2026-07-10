import type { RqgItem } from "@items/rqg-item.ts";
import { AbilityDataModel } from "./ability-data-model";
import { abilitySchemaFields } from "../shared/ability-schema-fields";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqid-link-field";
import type { RqidLink } from "../shared/rqid-link";
import type { RqidString } from "../../system/api/rqid-api";
import { enumChoices } from "../shared/enum-choices";
import { RqgLogger } from "../../system/logging/rqg-logger";

const logger = new RqgLogger("SkillDataModel");

export type SkillItem = RqgItem & { system: Item.SystemOfType<"skill"> };

import { SkillCategoryEnum } from "./skill-enums";

const { NumberField, StringField } = foundry.data.fields;

function defineSkillSchema() {
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

type SkillSchema = ReturnType<typeof defineSkillSchema>;

export class SkillDataModel extends AbilityDataModel<
  SkillSchema,
  { chance: number; categoryMod: number }
> {
  declare baseChance: number;
  declare gainedChance: number;
  declare runeRqidLinks: RqidLink<`i.rune.${string}`>[];
  declare descriptionRqidLink: RqidLink<RqidString>;

  static override defineSchema() {
    return defineSkillSchema();
  }

  override async applyChanceGain(gain: number): Promise<void> {
    const item = this.parent;
    if (!item) {
      logger.throw("Tried to improve a skill item that isn't embedded on an actor", item);
    }

    const newGainedChance = Number(this.gainedChance) + gain;
    await item.update({
      system: { hasExperience: false, gainedChance: newGainedChance },
    });
  }
}

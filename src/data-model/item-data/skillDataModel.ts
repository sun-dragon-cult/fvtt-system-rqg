import { RqgItemDataModel } from "./RqgItemDataModel";
import { abilitySchemaFields } from "../shared/abilitySchemaFields";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqidLinkField";
import { SkillCategoryEnum } from "./skillData";

const { NumberField, StringField } = foundry.data.fields;

type SkillSchema = ReturnType<typeof SkillDataModel.defineSchema>;

export class SkillDataModel extends RqgItemDataModel<SkillSchema> {
  static override defineSchema() {
    return {
      ...abilitySchemaFields(),
      descriptionRqidLink: rqidLinkSchemaField({ nullable: true }),
      category: new StringField({
        blank: false,
        nullable: false,
        initial: SkillCategoryEnum.Magic,
        choices: Object.fromEntries(
          Object.values(SkillCategoryEnum).map((v) => [v, `RQG.Actor.Skill.SkillCategory.${v}`]),
        ),
      }),
      skillName: new StringField({ blank: true, nullable: false, initial: "" }),
      specialization: new StringField({ blank: true, nullable: false, initial: "" }),
      baseChance: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
      gainedChance: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
      runeRqidLinks: rqidLinkArraySchemaField(),
    } as const;
  }
}

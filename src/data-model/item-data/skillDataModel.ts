import type { RqgItem } from "@items/rqgItem.ts";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { abilitySchemaFields } from "../shared/abilitySchemaFields";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqidLinkField";
import type { RqidLink } from "../shared/rqidLink";
import type { RqidString } from "../../system/api/rqidApi";
import { enumChoices } from "../shared/enumChoices";
import { assertDocumentSubType, isDocumentSubType } from "../../system/util";
import { documentRqidFlags } from "../shared/rqgDocumentFlags";
import { systemId } from "../../system/config";
import { ActorTypeEnum, type CharacterActor } from "../actor-data/rqgActorData";
import type { SkillCategories } from "../actor-data/skillCategories";
import type { ArmorItem } from "./armorDataModel";
import { ItemTypeEnum } from "./itemTypes";

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

  override onActorPrepareDerivedData(): void {
    const skillItem = this.parent as SkillItem;
    const actor = skillItem.actor!;
    assertDocumentSubType<CharacterActor>(
      actor,
      ActorTypeEnum.Character,
      "RQG.Item.Notification.ActorNotCharacterError",
    );
    const actorSystem = actor.system;

    // Add the category modifier to be displayed by the Skill sheet
    skillItem.system.categoryMod =
      actorSystem.skillCategoryModifiers![skillItem.system.category as keyof SkillCategories];

    let mod = 0;

    // Special modifiers for Dodge & Move Quietly
    const skillRqid = skillItem.getFlag(systemId, documentRqidFlags)?.id;
    if (skillRqid === CONFIG.RQG.skillRqid.dodge) {
      mod = -Math.min(
        actorSystem.attributes.encumbrance?.equipped || 0,
        actorSystem.attributes.encumbrance?.max || 0,
      );
    } else if (skillRqid === CONFIG.RQG.skillRqid.moveQuietly) {
      const equippedArmor = actor.items.filter(
        (i) =>
          isDocumentSubType<ArmorItem>(i, ItemTypeEnum.Armor) &&
          i.system.equippedStatus === "equipped",
      ) as ArmorItem[];
      mod = -Math.max(0, ...equippedArmor.map((a) => Math.abs(a.system.moveQuietlyPenalty)));
    }

    // Calculate the effective skill chance including skill category modifier.
    // If skill base chance is 0 you need to have studied to get an effective chance
    skillItem.system.chance =
      skillItem.system.baseChance > 0 ||
      skillItem.system.baseChance + skillItem.system.gainedChance > 0
        ? Math.max(
            0,
            skillItem.system.baseChance +
              skillItem.system.gainedChance +
              (skillItem.system.categoryMod || 0) +
              mod,
          )
        : 0;
  }
}

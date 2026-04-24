import type { RqgItem } from "@items/rqgItem.ts";
import type { RqidString } from "../../system/api/rqidApi";
import { RqidLink } from "../shared/rqidLink";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { physicalItemSchemaFields } from "../shared/physicalItemSchemaFields";
import { rqidLinkSchemaField } from "../shared/rqidLinkField";
import { resourceSchemaField } from "../shared/resourceSchemaField";
import { enumChoices } from "../shared/enumChoices";
import { legacyWeaponSkillRefsFlag, preserveLegacyWeaponSkillReference } from "./weaponSkillLink";

export type WeaponItem = RqgItem & { system: Item.SystemOfType<"weapon"> };

export const damageType = {
  Crush: "crush",
  Slash: "slash",
  Impale: "impale",
  Parry: "parry",
  Special: "special",
} as const;
export type DamageType = (typeof damageType)[keyof typeof damageType];

export const damageTypeOptions: SelectOptionData<DamageType>[] = Object.values(damageType).map(
  (damageType) => ({
    value: damageType,
    label: "RQG.Item.Weapon.DamageTypeEnum." + damageType,
  }),
);

export type UsageType = "oneHand" | "twoHand" | "offHand" | "missile";

export type CombatManeuver = {
  //** name used to identify this maneuver */
  name: string;
  damageType: DamageType | string;
  description?: string | null;
};

export type Usage = {
  /** The corresponding skill */
  skillRqidLink: RqidLink<RqidString | ""> | undefined;
  combatManeuvers: CombatManeuver[];
  /** Weapon damage formula */
  damage: string;
  minStrength: number;
  minDexterity: number;
  //** Melee weapon SR */
  strikeRank?: number | null;
};

const { ArrayField, BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

function usageSchemaField() {
  return new SchemaField({
    skillRqidLink: rqidLinkSchemaField({ nullable: true }),
    combatManeuvers: new ArrayField(
      new SchemaField({
        name: new StringField({ blank: true, nullable: false, initial: "" }),
        damageType: new StringField({
          blank: false,
          nullable: false,
          initial: damageType.Crush,
          choices: enumChoices(damageType, "RQG.Item.Weapon.DamageTypeEnum."),
        }),
        description: new StringField({ blank: true, nullable: true, initial: "" }),
      }),
    ),
    damage: new StringField({ blank: true, nullable: false, initial: "" }),
    minStrength: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
    minDexterity: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
    strikeRank: new NumberField({ integer: true, min: 0, nullable: true, initial: 0 }),
  });
}

type WeaponSchema = ReturnType<typeof WeaponDataModel.defineSchema>;

export class WeaponDataModel extends RqgItemDataModel<WeaponSchema> {
  static override defineSchema() {
    return {
      ...physicalItemSchemaFields(),
      usage: new SchemaField({
        oneHand: usageSchemaField(),
        offHand: usageSchemaField(),
        twoHand: usageSchemaField(),
        missile: usageSchemaField(),
      }),
      defaultUsage: new StringField({
        blank: false,
        nullable: true,
        initial: undefined,
        choices: {
          oneHand: "RQG.Game.WeaponUsage.oneHand-full",
          twoHand: "RQG.Game.WeaponUsage.twoHand-full",
          offHand: "RQG.Game.WeaponUsage.offHand-full",
          missile: "RQG.Game.WeaponUsage.missile-full",
        },
      }),
      hitPoints: resourceSchemaField(),
      hitPointLocation: new StringField({ blank: true, nullable: false, initial: "" }),
      isNatural: new BooleanField({ nullable: false, initial: false }),
      rate: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
      range: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
      isProjectile: new BooleanField({ nullable: false, initial: false }),
      isProjectileWeapon: new BooleanField({ nullable: false, initial: false }),
      isThrownWeapon: new BooleanField({ nullable: false, initial: false }),
      isRangedWeapon: new BooleanField({ nullable: false, initial: false }),
      projectileId: new StringField({ blank: true, nullable: false, initial: "" }),
    } as const;
  }

  /**
   * Preserve legacy weapon skill link inputs in flags before schema cleaning
   * strips them, so migrations can still convert them into a valid rqid link.
   */
  static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
    const usage = source["usage"] as Record<string, Record<string, unknown>> | undefined;
    const legacyRefsByUsage: Record<string, { skillOrigin?: string; skillId?: string }> = {};

    if (usage && typeof usage === "object") {
      for (const usageType of ["oneHand", "offHand", "twoHand", "missile"]) {
        const u = usage[usageType];
        if (!u || typeof u !== "object") {
          continue;
        }
        const legacyRef = preserveLegacyWeaponSkillReference(u);
        if (legacyRef?.skillOrigin || legacyRef?.skillId) {
          legacyRefsByUsage[usageType] = legacyRef;
        }
      }
    }

    if (Object.keys(legacyRefsByUsage).length > 0) {
      const flags = (source["flags"] as Record<string, unknown> | undefined) ?? {};
      source["flags"] = flags;

      const rqgFlags = (flags["rqg"] as Record<string, unknown> | undefined) ?? {};
      flags["rqg"] = rqgFlags;

      const existingLegacyRefs =
        (rqgFlags[legacyWeaponSkillRefsFlag] as Record<string, unknown> | undefined) ?? {};

      rqgFlags[legacyWeaponSkillRefsFlag] = {
        ...existingLegacyRefs,
        ...legacyRefsByUsage,
      };
    }

    return super.migrateData(source);
  }
}

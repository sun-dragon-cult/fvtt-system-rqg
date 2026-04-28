import type { RqgItem } from "@items/rqgItem.ts";
import type { RqidString } from "../../system/api/rqidApi";
import { RqidLink } from "../shared/rqidLink";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { physicalItemSchemaFields } from "../shared/physicalItemSchemaFields";
import { rqidLinkSchemaField } from "../shared/rqidLinkField";
import { resourceSchemaField } from "../shared/resourceSchemaField";
import { enumChoices } from "../shared/enumChoices";
import { encodeLegacyWeaponSkillReferenceInRqid } from "./weaponSkillLink";
import { assertDocumentSubType, requireValue, RqgError } from "../../system/util";
import { ActorTypeEnum, type CharacterActor } from "../actor-data/rqgActorData";
import { DamageDegree } from "../../system/combatCalculations.defs";
import {
  formatDamagePart,
  getNormalizedDamageFormulaAndDamageBonus,
} from "../../system/combatCalculations";

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
      rate: new NumberField({ integer: true, min: 0, max: 5, nullable: false, initial: 0 }),
      range: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
      isProjectile: new BooleanField({ nullable: false, initial: false }),
      isProjectileWeapon: new BooleanField({ nullable: false, initial: false }),
      isThrownWeapon: new BooleanField({ nullable: false, initial: false }),
      isRangedWeapon: new BooleanField({ nullable: false, initial: false }),
      projectileId: new StringField({ blank: true, nullable: false, initial: "" }),
    } as const;
  }

  /**
   * Encode legacy weapon skill link data into the rqid field as a legacy-encoded rqid
   * so it survives schema cleaning and can be resolved by migrations.
   */
  static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
    const parsedRate = Math.trunc(Number(source["rate"]));
    source["rate"] = Number.isFinite(parsedRate) ? Math.max(0, Math.min(5, parsedRate)) : 0;

    const usage = source["usage"] as Record<string, Record<string, unknown>> | undefined;

    if (usage && typeof usage === "object") {
      for (const usageType of ["oneHand", "offHand", "twoHand", "missile"]) {
        const u = usage[usageType];
        if (!u || typeof u !== "object") {
          continue;
        }
        const encoded = encodeLegacyWeaponSkillReferenceInRqid(u);
        if (encoded) {
          u["skillRqidLink"] = encoded;
        }
      }
    }

    return super.migrateData(source);
  }

  /**
   * Open an attackDialog to initiate an attack sequence.
   */
  async attack(): Promise<void> {
    // Dynamic import to avoid circular dependency through AttackDialogV2 → itemTypes.ts → weapon.ts → rqgItem.ts
    const { AttackDialogV2 } = await import("../../applications/AttackFlow/attackDialogV2");
    await new AttackDialogV2(this.parent as unknown as WeaponItem).render(true);
  }

  /**
   * Get a damage Roll depending on weapon usage and success level.
   * The damageBonus description & actual formula is added in applyDamageBonusToFormula
   * during combat calculations. From here it's only a placeholder like "+db".
   */
  getDamageFormula(
    usage: UsageType | undefined,
    damageDegree: DamageDegree,
    damageTypeArg: DamageType,
  ): string | undefined {
    if (!usage) {
      return undefined;
    }
    const weaponDamage = this.usage[usage].damage;
    const actor = this.parent?.parent;
    assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character, "Item is not embedded");
    const damageBonus = actor.system.attributes.damageBonus ?? "0";

    requireValue(
      damageTypeArg,
      "Could not get damageType when calculating damage formula",
      this.parent,
      usage,
      damageDegree,
      damageTypeArg,
    );

    if (damageDegree === "none") {
      return undefined;
    }

    const { damageFormula, damageBonusPlaceholder } =
      getNormalizedDamageFormulaAndDamageBonus(weaponDamage);

    if (damageDegree === "normal") {
      const wd = formatDamagePart(damageFormula, "RQG.Roll.DamageRoll.WeaponDamage");
      return `${wd}${damageBonusPlaceholder}`;
    }

    if (damageDegree === "special") {
      switch (damageTypeArg) {
        case "crush": {
          const maximisedDamageBonus = this.getMaximisedDamageBonusValue(damageBonus);
          const wd = formatDamagePart(damageFormula, "RQG.Roll.DamageRoll.WeaponDamage");
          const specialDamage = formatDamagePart(
            maximisedDamageBonus,
            "RQG.Roll.DamageRoll.SpecialDamage",
            "+",
          );
          return `${wd}${damageBonusPlaceholder}${specialDamage}`;
        }
        case "slash":
        case "impale": {
          const wd = formatDamagePart(damageFormula, "RQG.Roll.DamageRoll.WeaponDamage");
          const specialDamage = formatDamagePart(
            damageFormula,
            "RQG.Roll.DamageRoll.SpecialDamage",
            "+",
          );
          return `${wd}${specialDamage}${damageBonusPlaceholder}`;
        }
        default: {
          return undefined; // parry or special
        }
      }
    }

    if (damageDegree === "maxSpecial") {
      const maximisedDamageBonus = this.getMaximisedDamageBonusValue(damageBonus);
      const evaluatedDamageBonus = formatDamagePart(
        maximisedDamageBonus,
        "RQG.Roll.DamageRoll.DamageBonus",
        "+",
      );

      const damageFormulaRoll = new Roll(damageFormula);
      damageFormulaRoll.evaluateSync({ maximize: true });
      const evaluatedWeaponDamage = formatDamagePart(
        damageFormulaRoll.total?.toString() ?? "",
        "RQG.Roll.DamageRoll.WeaponDamage",
      );

      switch (damageTypeArg) {
        case "crush": {
          const evaluatedSpecialDamage = formatDamagePart(
            maximisedDamageBonus,
            "RQG.Roll.DamageRoll.SpecialDamage",
            "+",
          );
          return `${evaluatedWeaponDamage}${evaluatedDamageBonus}${evaluatedSpecialDamage}`;
        }

        case "slash":
        case "impale": {
          const evaluatedSpecialDamage = formatDamagePart(
            damageFormulaRoll.total?.toString() ?? "",
            "RQG.Roll.DamageRoll.SpecialDamage",
            "+",
          );
          return `${evaluatedWeaponDamage}${evaluatedDamageBonus}${evaluatedSpecialDamage}`;
        }

        default: {
          return undefined; // parry or special
        }
      }
    }

    throw new RqgError("Tried to get damageFormula for invalid damageDegree");
  }

  /**
   * Create a string with the maximised or minimised result of a damage bonus roll.
   */
  getMaximisedDamageBonusValue(dbFormula: string): string {
    const dbRoll = new Roll(dbFormula);
    if (dbFormula.startsWith("-")) {
      // TODO Actors with negative db will actually do less damage with special success! Rule inconsistency.
      dbRoll.evaluateSync({ minimize: true });
    } else {
      dbRoll.evaluateSync({ maximize: true });
    }
    return dbRoll.total?.toString() ?? "";
  }
}

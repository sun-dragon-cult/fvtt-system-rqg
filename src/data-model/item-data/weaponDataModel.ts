import { RqgItemDataModel } from "./RqgItemDataModel";
import { physicalItemSchemaFields } from "../shared/physicalItemSchemaFields";
import { rqidLinkSchemaField } from "../shared/rqidLinkField";
import { resourceSchemaField } from "../shared/resourceSchemaField";
import { damageType } from "./weaponData";

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
          choices: Object.fromEntries(
            Object.values(damageType).map((v) => [v, `RQG.Item.Weapon.DamageTypeEnum.${v}`]),
          ),
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
}

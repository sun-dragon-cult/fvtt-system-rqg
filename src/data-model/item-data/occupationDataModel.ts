import { RqgItemDataModel } from "./RqgItemDataModel";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqidLinkField";
import { StandardOfLivingEnum } from "./occupationData";

const { ArrayField, BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

type OccupationSchema = ReturnType<typeof OccupationDataModel.defineSchema>;

export class OccupationDataModel extends RqgItemDataModel<OccupationSchema> {
  static override defineSchema() {
    return {
      occupation: new StringField({ blank: true, nullable: false, initial: "" }),
      occupationRqidLink: rqidLinkSchemaField({ nullable: true }),
      specialization: new StringField({ blank: true, nullable: false, initial: "" }),
      homelands: new ArrayField(new StringField({ blank: true, nullable: false, initial: "" })),
      occupationalSkills: new ArrayField(
        new SchemaField({
          incomeSkill: new BooleanField({ nullable: false, initial: false }),
          bonus: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
          skillRqidLink: rqidLinkSchemaField({ nullable: true }),
        }),
      ),
      standardOfLiving: new StringField({
        blank: false,
        nullable: false,
        initial: StandardOfLivingEnum.Free,
        choices: Object.fromEntries(
          Object.values(StandardOfLivingEnum).map((v) => [
            v,
            `RQG.Item.Occupation.StandardOfLivingEnum.${v}`,
          ]),
        ),
      }),
      baseIncome: new NumberField({ min: 0, nullable: false, initial: 0 }),
      baseIncomeNotes: new StringField({ blank: true, nullable: false, initial: "" }),
      cultRqidLinks: rqidLinkArraySchemaField(),
      ransom: new NumberField({ min: 0, nullable: false, initial: 0 }),
      startingEquipmentRqidLinks: rqidLinkArraySchemaField(),
    } as const;
  }
}

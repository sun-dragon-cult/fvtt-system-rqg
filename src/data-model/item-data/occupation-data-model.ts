import type { RqgItem } from "@items/rqg-item.ts";
import { RqidLink } from "../shared/rqid-link";
import { RqgItemDataModel } from "./rqg-item-data-model";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqid-link-field";
import { enumChoices } from "../shared/enum-choices";
import { StandardOfLivingEnum } from "./occupation-enums";

export type OccupationItem = RqgItem & { system: Item.SystemOfType<"occupation"> };

export class OccupationalSkill {
  incomeSkill: boolean = false;
  bonus: number = 0;
  skillRqidLink: RqidLink | undefined = undefined;
}

const { ArrayField, BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

function defineOccupationSchema() {
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
      choices: enumChoices(StandardOfLivingEnum, "RQG.Item.Occupation.StandardOfLivingEnum."),
    }),
    baseIncome: new NumberField({ min: 0, nullable: false, initial: 0 }),
    baseIncomeNotes: new StringField({ blank: true, nullable: false, initial: "" }),
    cultRqidLinks: rqidLinkArraySchemaField(),
    ransom: new NumberField({ min: 0, nullable: false, initial: 0 }),
    startingEquipmentRqidLinks: rqidLinkArraySchemaField(),
  } as const;
}

type OccupationSchema = ReturnType<typeof defineOccupationSchema>;

export class OccupationDataModel extends RqgItemDataModel<OccupationSchema> {
  static override defineSchema() {
    return defineOccupationSchema();
  }
}

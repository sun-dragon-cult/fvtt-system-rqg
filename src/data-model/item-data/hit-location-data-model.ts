import type { RqgItem } from "@items/rqg-item.ts";
import { RqgItemDataModel } from "./rqg-item-data-model";
import { resourceSchemaField } from "../shared/resource-schema-field";
import { actorHealthStatuses } from "../actor-data/attributes";
import { enumChoices } from "../shared/enum-choices";

export type HitLocationItem = RqgItem & { system: Item.SystemOfType<"hitLocation"> };

// TODO differentiate between severed & maimed? slash / crush or impale
export const hitLocationHealthStatuses = ["healthy", "wounded", "useless", "severed"] as const;
export type HitLocationHealthState = (typeof hitLocationHealthStatuses)[number];

export const hitLocationHealthStatusOptions: SelectOptionData<HitLocationHealthState>[] =
  hitLocationHealthStatuses.map((status) => ({
    value: status,
    label: "RQG.Item.HitLocation.HealthStatusEnum." + status,
  }));

export const HitLocationTypesEnum = {
  Limb: "limb",
  Head: "head",
  Chest: "chest",
  Abdomen: "abdomen",
} as const;
export type HitLocationTypesEnum = (typeof HitLocationTypesEnum)[keyof typeof HitLocationTypesEnum];

const { ArrayField, NumberField, StringField } = foundry.data.fields;

function defineHitLocationSchema() {
  return {
    dieFrom: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
    dieTo: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
    hitPoints: resourceSchemaField(),
    baseHpDelta: new NumberField({ integer: true, nullable: false, initial: 0 }),
    naturalAp: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
    wounds: new ArrayField(new NumberField({ integer: true, min: 0, nullable: false, initial: 0 })),
    hitLocationHealthState: new StringField({
      blank: false,
      nullable: false,
      initial: "healthy",
      choices: enumChoices(hitLocationHealthStatuses, "RQG.Item.HitLocation.HealthStatusEnum."),
    }),
    actorHealthImpact: new StringField({
      blank: false,
      nullable: false,
      initial: "healthy",
      choices: enumChoices(actorHealthStatuses, "RQG.Actor.Attributes.Health."),
    }),
    hitLocationType: new StringField({
      blank: false,
      nullable: false,
      initial: HitLocationTypesEnum.Limb,
      choices: enumChoices(HitLocationTypesEnum, "RQG.Item.HitLocationType."),
    }),
    connectedTo: new StringField({ blank: true, nullable: false, initial: "" }),
  } as const;
}

type HitLocationSchema = ReturnType<typeof defineHitLocationSchema>;

export class HitLocationDataModel extends RqgItemDataModel<
  HitLocationSchema,
  { armorPoints: number }
> {
  static override defineSchema() {
    return defineHitLocationSchema();
  }
}

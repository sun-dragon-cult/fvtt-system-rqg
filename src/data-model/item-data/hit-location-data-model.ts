import type { RqgItem } from "@items/rqg-item.ts";
import { RqgItemDataModel } from "./rqg-item-data-model";
import { resourceSchemaField } from "../shared/resource-schema-field";
import { actorHealthStatuses } from "../actor-data/attributes";
import { enumChoices } from "../shared/enum-choices";
import { hitLocationHealthStatuses, HitLocationTypesEnum } from "./hit-location-enums";

export type HitLocationItem = RqgItem & { system: Item.SystemOfType<"hitLocation"> };

export const hitLocationHealthStatusOptions: SelectOptionData<
  (typeof hitLocationHealthStatuses)[number]
>[] = hitLocationHealthStatuses.map((status) => ({
  value: status,
  label: "RQG.Item.HitLocation.HealthStatusEnum." + status,
}));

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

import type { RqgItem } from "@items/rqgItem.ts";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { resourceSchemaField } from "../shared/resourceSchemaField";
import { actorHealthStatuses } from "../actor-data/attributes";
import { enumChoices } from "../shared/enumChoices";

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

type HitLocationSchema = ReturnType<typeof HitLocationDataModel.defineSchema>;

export class HitLocationDataModel extends RqgItemDataModel<
  HitLocationSchema,
  { armorPoints: number }
> {
  static override defineSchema() {
    return {
      dieFrom: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
      dieTo: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
      hitPoints: resourceSchemaField(),
      baseHpDelta: new NumberField({ integer: true, nullable: false, initial: 0 }),
      naturalAp: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
      wounds: new ArrayField(
        new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
      ),
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
}

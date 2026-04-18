import { RqgItemDataModel } from "./RqgItemDataModel";
import { resourceSchemaField } from "../shared/resourceSchemaField";
import { hitLocationHealthStatuses, HitLocationTypesEnum } from "./hitLocationData";
import { actorHealthStatuses } from "../actor-data/attributes";

const { ArrayField, NumberField, StringField } = foundry.data.fields;

type HitLocationSchema = ReturnType<typeof HitLocationDataModel.defineSchema>;

export class HitLocationDataModel extends RqgItemDataModel<HitLocationSchema> {
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
        choices: Object.fromEntries(
          [...hitLocationHealthStatuses].map((v) => [
            v,
            `RQG.Item.HitLocation.HealthStatusEnum.${v}`,
          ]),
        ),
      }),
      actorHealthImpact: new StringField({
        blank: false,
        nullable: false,
        initial: "healthy",
        choices: Object.fromEntries(
          [...actorHealthStatuses].map((v) => [v, `RQG.Actor.Attributes.Health.${v}`]),
        ),
      }),
      hitLocationType: new StringField({
        blank: false,
        nullable: false,
        initial: HitLocationTypesEnum.Limb,
        choices: Object.fromEntries(
          Object.values(HitLocationTypesEnum).map((v) => [v, `RQG.Item.HitLocationType.${v}`]),
        ),
      }),
      connectedTo: new StringField({ blank: true, nullable: false, initial: "" }),
    } as const;
  }
}

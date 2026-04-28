import type { RqgItem } from "@items/rqgItem.ts";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { resourceSchemaField } from "../shared/resourceSchemaField";
import { actorHealthStatuses } from "../actor-data/attributes";
import { enumChoices } from "../shared/enumChoices";
import { assertDocumentSubType, isDocumentSubType, localize, RqgError } from "../../system/util";
import { ActorTypeEnum, type CharacterActor } from "../actor-data/rqgActorData";
import { ItemTypeEnum } from "./itemTypes";
import type { ArmorItem } from "./armorDataModel";

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

  override onActorPrepareEmbeddedEntities(): void {
    const item = this.parent as HitLocationItem;
    if (!isDocumentSubType<HitLocationItem>(item, ItemTypeEnum.HitLocation)) {
      const msg = localize("RQG.Item.Notification.ItemWasNotHitLocationError");
      ui.notifications?.error(msg);
      throw new RqgError(msg, item);
    }
    const actor = item.actor;
    assertDocumentSubType<CharacterActor>(
      actor,
      ActorTypeEnum.Character,
      "RQG.Item.Notification.HitLocationDoesNotHaveActorError",
    );
    const actorData = actor.system;

    // Add equipped armor absorptions for this hit location
    const armorAbsorption = actor.items.reduce((sum, armorItem) => {
      if (
        isDocumentSubType<ArmorItem>(armorItem, ItemTypeEnum.Armor) &&
        armorItem.system.equippedStatus === "equipped" &&
        armorItem.system.hitLocationRqidLinks.some(
          (l) => l.rqid === item.flags?.rqg?.documentRqidFlags?.id,
        )
      ) {
        sum += armorItem.system.absorbs;
      }
      return sum;
    }, 0);

    item.system.armorPoints = item.system.naturalAp + armorAbsorption;

    // Calc HP
    const totalHp = actorData.attributes.hitPoints.max ?? CONFIG.RQG.minTotalHitPoints;
    // Remove any healed wounds
    item.system.wounds = item.system.wounds.filter((w) => w > 0);

    item.system.hitPoints.max = HitLocationDataModel.hitPointsPerLocation(
      totalHp,
      item.system.baseHpDelta,
    );
    item.system.hitPoints.value = item.system.wounds.reduce(
      (acc: number, w: number) => acc - w,
      item.system.hitPoints.max,
    );
  }

  private static hitPointsPerLocation(totalHitPoints: number, baseHpDelta: number): number {
    return Math.max(2, Math.ceil(totalHitPoints / 3)) + (baseHpDelta || 0);
  }
}

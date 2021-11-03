import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { ItemUpdate } from "../migrate";
import { CombatManeuver } from "../../data-model/item-data/meleeWeaponData";
import type {
  CombatManeuver as WeaponCombatManeuver,
  WeaponDataProperties,
} from "../../data-model/item-data/weaponData";
import { DeepPartial } from "snowpack";
import { ActorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";
import { deleteKeyPrefix } from "../util";

export async function migrateToWeaponItem(
  itemData: ItemData,
  owningActorData?: ActorData
): Promise<ItemUpdate> {
  const cmTranslation = new Map([
    [
      CombatManeuver.Crush,
      {
        name: "Shoot",
        damageType: "crush",
      },
    ],
    [
      CombatManeuver.Slash,
      {
        name: "Cut",
        damageType: "slash",
      },
    ],
    [
      CombatManeuver.Impale,
      {
        name: "Shoot",
        damageType: "impale",
      },
    ],
    [
      CombatManeuver.Grapple,
      {
        name: "Grapple",
        damageType: "special",
      },
    ],
    [
      CombatManeuver.Knockback,
      {
        name: "Knockback",
        damageType: "special",
      },
    ],
    [
      CombatManeuver.Parry,
      {
        name: "Parry",
        damageType: "parry",
      },
    ],
    [
      CombatManeuver.Special,
      {
        name: "Special",
        damageType: "special",
        description: "Migrated from previous Missile- / Melee- Item Special damage",
      },
    ],
  ]);

  if (itemData.type === ItemTypeEnum.MeleeWeapon) {
    const newCombatManeuvers = itemData.data.combatManeuvers.map(
      (cm) => cmTranslation.get(cm) as WeaponCombatManeuver
    );
    let skill;
    let isSkillOriginFound = false;
    try {
      skill = itemData.data.skillOrigin ? await fromUuid(itemData.data.skillOrigin) : null;
    } catch (e) {
      if (!skill) {
        const msg = `RQG | Couldn't find skill Origin id [${itemData.data.skillOrigin}] that was referenced by MeleeWeapon [${itemData.name}] on actor [${owningActorData?.name}].
        Possibly because referenced compendium is no longer present. Will try to use embedded skill item data.`;
        ui.notifications?.warn(msg);
        console.warn(msg, itemData, owningActorData);
      }
    }
    isSkillOriginFound = !!skill;
    if (!isSkillOriginFound && owningActorData) {
      skill = owningActorData.items.find((i) => i._id === itemData.data.skillId) ?? null;
    }
    if (!skill) {
      const msg = `RQG | Couldn't find skill Origin id [${itemData.data.skillOrigin}] or owned skill [${itemData.data.skillId}] on actor [${owningActorData?.name}]that was referenced by MeleeWeapon [${itemData.name}])`;
      ui.notifications?.warn(msg);
      console.warn(msg, itemData, owningActorData);
    } else if (!isSkillOriginFound) {
      ui.notifications?.info(
        `RQG | Found embedded skill [${skill.name}] (but not skill origin) to use for weapon migration`
      );
      console.log(
        `RQG | Found embedded skill [${skill.name}] to use for weapon migration`,
        skill,
        itemData,
        owningActorData
      );
    }

    const skillName = skill ? skill.name ?? "" : "";
    // Default to 1H usage
    const usage = skillName.includes("2H") ? "twoHand" : "oneHand";

    const updateData: DeepPartial<WeaponDataProperties> = {
      type: ItemTypeEnum.Weapon,
      data: {
        usage: {
          oneHand: {
            skillId: "",
            skillOrigin: "",

            combatManeuvers: [],
            damage: "",
            minStrength: 0,
            minDexterity: 0,
            strikeRank: 0,
          },
          offHand: {
            skillId: "",
            skillOrigin: "",
            combatManeuvers: [],
            damage: "",
            minStrength: 0,
            minDexterity: 0,
            strikeRank: 0,
          },
          twoHand: {
            skillId: "",
            skillOrigin: "",
            combatManeuvers: [],
            damage: "",
            minStrength: 0,
            minDexterity: 0,
            strikeRank: 0,
          },
          missile: {
            skillId: "",
            skillOrigin: "",
            combatManeuvers: [],
            damage: "",
            minStrength: 0,
            minDexterity: 0,
          },
        },
        hitPointLocation: "",
        isRangedWeapon: false,
      },
    };

    (updateData.data!.usage as any)[usage] = {
      skillId: itemData.data.skillId,
      skillOrigin: itemData.data.skillOrigin,
      combatManeuvers: newCombatManeuvers,
      damage: itemData.data.damage,
      minStrength: itemData.data.minStrength,
      minDexterity: itemData.data.minDexterity,
      strikeRank: itemData.data.strikeRank,
    };

    // Remove deprecated data
    (updateData.data as any)[`${deleteKeyPrefix}skillId`] = null;
    (updateData.data as any)[`${deleteKeyPrefix}skillOrigin`] = null;
    (updateData.data as any)[`${deleteKeyPrefix}damage`] = null;
    (updateData.data as any)[`${deleteKeyPrefix}combatManeuvers`] = null;
    (updateData.data as any)[`${deleteKeyPrefix}minStrength`] = null;
    (updateData.data as any)[`${deleteKeyPrefix}minDexterity`] = null;
    (updateData.data as any)[`${deleteKeyPrefix}strikeRank`] = null;

    return updateData;
  }

  if (itemData.type === ItemTypeEnum.MissileWeapon) {
    const newCombatManeuvers = itemData.data.combatManeuvers.map(
      (cm) => cmTranslation.get(cm) as WeaponCombatManeuver
    );

    const updateData: DeepPartial<WeaponDataProperties> = {
      type: ItemTypeEnum.Weapon,
      data: {
        usage: {
          oneHand: {
            skillId: "",
            skillOrigin: "",

            combatManeuvers: [],
            damage: "",
            minStrength: 0,
            minDexterity: 0,
            strikeRank: 0,
          },
          offHand: {
            skillId: "",
            skillOrigin: "",
            combatManeuvers: [],
            damage: "",
            minStrength: 0,
            minDexterity: 0,
            strikeRank: 0,
          },
          twoHand: {
            skillId: "",
            skillOrigin: "",
            combatManeuvers: [],
            damage: "",
            minStrength: 0,
            minDexterity: 0,
            strikeRank: 0,
          },
          missile: {
            skillId: itemData.data.skillId,
            skillOrigin: itemData.data.skillId,
            combatManeuvers: newCombatManeuvers,
            damage: itemData.data.damage,
            minStrength: itemData.data.minStrength,
            minDexterity: itemData.data.minDexterity,
          },
        },
        hitPointLocation: "",
        isRangedWeapon: false,
      },
    };

    // Remove deprecated data
    (updateData.data as any)[`${deleteKeyPrefix}skillId`] = null;
    (updateData.data as any)[`${deleteKeyPrefix}skillOrigin`] = null;
    (updateData.data as any)[`${deleteKeyPrefix}damage`] = null;
    (updateData.data as any)[`${deleteKeyPrefix}combatManeuvers`] = null;
    (updateData.data as any)[`${deleteKeyPrefix}minStrength`] = null;
    (updateData.data as any)[`${deleteKeyPrefix}minDexterity`] = null;

    return updateData;
  }

  return {};
}

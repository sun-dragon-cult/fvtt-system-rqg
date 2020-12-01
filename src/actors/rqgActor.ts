import { RqgCalculations } from "../system/rqgCalculations";
import { RqgActorData } from "../data-model/actor-data/rqgActorData";
import { ItemTypeEnum, ResponsibleItemClass } from "../data-model/item-data/itemTypes";
import { RqgActorSheet } from "./rqgActorSheet";
import { RqgItem } from "../items/rqgItem";

export class RqgActor extends Actor<RqgActorData> {
  static init() {
    CONFIG.Actor.entityClass = (RqgActor as unknown) as typeof Actor;

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("rqg", RqgActorSheet, { makeDefault: true });
  }

  /**
   * First prepare any derived data which is actor-specific and does not depend on Items or Active Effects
   */
  prepareBaseData() {
    // @ts-ignore (until foundry-pc-types are updated for 0.7)
    super.prepareBaseData();

    const actorData = this.data;
    const data = actorData.data;
    // Set this here before Active effects to allow POW crystals to boost it.
    data.attributes.magicPoints.max = data.characteristics.power.value;
    // const flags = actorData.flags;
    console.debug("*** RqgActor prepareBaseData  actorData", actorData);
  }

  prepareEmbeddedEntities(): void {
    super.prepareEmbeddedEntities();
    const actorData = this.data;
    const data = actorData.data;

    // Shorthand access to characteristics
    const str = data.characteristics.strength.value;
    const con = data.characteristics.constitution.value;
    const siz = data.characteristics.size.value;
    const dex = data.characteristics.dexterity.value;
    const int = data.characteristics.intelligence.value;
    const pow = data.characteristics.power.value;
    const cha = data.characteristics.charisma.value;

    data.attributes.hitPoints.max = RqgCalculations.hitPoints(con, siz, pow);

    data.skillCategoryModifiers = RqgCalculations.skillCategoryModifiers(
      str,
      siz,
      dex,
      int,
      pow,
      cha
    );

    this.items.forEach((item: RqgItem) =>
      ResponsibleItemClass.get(item.type).prepareAsEmbeddedItem(item)
    );
  }

  /**
   * Apply any transformations to the Actor data which are caused by ActiveEffects.
   */
  applyActiveEffects() {
    super.applyActiveEffects();
    // @ts-ignore 0.7
    console.debug("!! ***applyActiveEffects", this.effects);
  }

  /**
   * Apply final transformations to the Actor data after all effects have been applied
   */
  prepareDerivedData() {
    // @ts-ignore (until foundry-pc-types are updated for 0.7)
    super.prepareDerivedData();
    console.debug("!! ***prepareDerivedData");

    const actorData = this.data;
    const data = actorData.data;

    // Shorthand access to characteristics
    const str = data.characteristics.strength.value;
    const con = data.characteristics.constitution.value;
    const siz = data.characteristics.size.value;
    const dex = data.characteristics.dexterity.value;
    const pow = data.characteristics.power.value;
    const cha = data.characteristics.charisma.value;

    // *** Setup calculated stats ***

    data.attributes.dexStrikeRank = RqgCalculations.dexSR(dex);
    data.attributes.sizStrikeRank = RqgCalculations.sizSR(siz);
    data.attributes.damageBonus = RqgCalculations.damageBonus(str, siz);
    data.attributes.healingRate = RqgCalculations.healingRate(con);
    data.attributes.spiritCombatDamage = RqgCalculations.spiritCombatDamage(pow, cha);
    data.attributes.maximumEncumbrance = Math.round(Math.min(str, (str + con) / 2));

    data.attributes.equippedEncumbrance = this.items.reduce((sum, i) => {
      const enc = i.data.data.isEquipped
        ? (i.data.data.quantity || 1) * (i.data.data.encumbrance || 0)
        : 0;
      return sum + enc;
    }, 0);
    data.attributes.equippedEncumbrance = Math.round(data.attributes.equippedEncumbrance);

    data.attributes.travelEncumbrance = this.items.reduce(
      (sum, i) => sum + (i.data.data.quantity || 1) * (i.data.data.encumbrance || 0),
      0
    );
    data.attributes.travelEncumbrance = Math.round(data.attributes.travelEncumbrance);

    const movementPenalty = Math.max(
      0,
      data.attributes.equippedEncumbrance - data.attributes.maximumEncumbrance
    );
    data.attributes.movementRate = 8 - movementPenalty; // TODO Humanoids only for now
    // @ts-ignore 0.7
    data.effects = [...this.effects].map((effect) => effect.data);
  }

  // Defaults when creating a new Actor
  static async create(data: any, options?: object): Promise<Entity> {
    data.token = data.token || {};
    if (data.type === "character") {
      mergeObject(
        data.token,
        {
          vision: true,
          dimSight: 30,
          brightSight: 0,
          actorLink: true,
          disposition: 1,
        },
        { overwrite: false }
      );
    }
    return await super.create(data, options);
  }
  // @ts-ignore
  async _onCreateEmbeddedEntity(embeddedName, child, options, userId) {
    if (embeddedName === "OwnedItem") {
      // TODO Break out? into ResponsibleItemClass[child.type].onOwnItem()
      if ([ItemTypeEnum.MeleeWeapon, ItemTypeEnum.MissileWeapon].includes(child.type)) {
        if (!child.data.skillId) {
          // Not connected - look for weapon skill on actor
          const weaponSkill = this.items
            .filter((i) => i.type === ItemTypeEnum.Skill)
            .find((i: Item) => i.data.flags?.core?.sourceId || i._id === child.data.skillSourceId);
          if (weaponSkill) {
            // Found the skill - populate the id
            child.data.skillId = weaponSkill._id;
          } else {
            // No skill on actor - find the skill using skillSourceCompendium & skillSourceId
            let weaponSkillRef;
            if (child.data.skillSourceCompendium) {
              // Try to find the skill in the compendium
              const weaponSkillsPack = await game.packs.get(child.data.skillSourceCompendium);
              const compendiumContent = await weaponSkillsPack.getContent();
              weaponSkillRef = compendiumContent
                .filter((i) => i.type === ItemTypeEnum.Skill)
                .find((w) => w.data.flags?.core?.sourceId || w._id === child.data.skillSourceId);
            } else {
              // No compendium - search in game items
              weaponSkillRef = game.items
                .filter((i) => i.type === ItemTypeEnum.Skill)
                .find((w) => w.data.flags?.core?.sourceId || w._id === child.data.skillSourceId);
            }
            if (weaponSkillRef) {
              // Found the skill in a compendium - add as owned items and connect
              const embeddedWeaponSkill = await this.createOwnedItem(weaponSkillRef);
              child.data.skillId = embeddedWeaponSkill._id;
            } else {
              // Didn't find any compendium skill - open the item sheet to let the user select skill
              options.renderSheet = true;
            }
          }
        }
      }
    }
    // @ts-ignore
    super._onCreateEmbeddedEntity(embeddedName, child, options, userId);
  }
}

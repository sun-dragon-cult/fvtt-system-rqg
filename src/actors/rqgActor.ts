import { RqgCalculations } from "../system/rqgCalculations";
import { RqgActorData } from "../data-model/actor-data/rqgActorData";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { Skill } from "../items/skill-item/skill";

export class RqgActor extends Actor<RqgActorData> {
  /**
   * First prepare any derived data which is actor-specific and does not depend on Items or Active Effects
   */
  prepareBaseData() {
    // @ts-ignore (until foundry-pc-types are updated for 0.7)
    super.prepareBaseData();

    const actorData = this.data;
    const data = actorData.data;
    // const flags = actorData.flags;
    console.debug("*** RqgActor prepareBaseData  actorData", actorData);

    // Shorthand access to characteristics
    const str = data.characteristics.strength.value;
    const con = data.characteristics.constitution.value;
    const siz = data.characteristics.size.value;
    const dex = data.characteristics.dexterity.value;
    const int = data.characteristics.intelligence.value;
    const pow = data.characteristics.power.value;
    const cha = data.characteristics.charisma.value;

    // *** Setup calculated stats ***
    data.attributes.magicPoints.max = pow;
    data.attributes.dexStrikeRank = RqgCalculations.dexSR(dex);
    data.attributes.sizStrikeRank = RqgCalculations.sizSR(siz);
    data.attributes.hitPoints.max = RqgCalculations.hitPoints(con, siz, pow);
    data.attributes.damageBonus = RqgCalculations.damageBonus(str, siz);
    data.attributes.healingRate = RqgCalculations.healingRate(con);
    data.attributes.spiritCombatDamage = RqgCalculations.spiritCombatDamage(
      pow,
      cha
    );
    data.attributes.maximumEncumbrance = Math.min(str, (str + con) / 2);
    data.attributes.movementRate = 8; // TODO Humans only for now

    const agilityMod =
      RqgCalculations.flattenedMod(str) -
      RqgCalculations.flattenedMod(siz) +
      RqgCalculations.linearMod(dex) +
      RqgCalculations.flattenedMod(pow);

    const communicationMod = RqgCalculations.flattenedMod(
      int + RqgCalculations.flattenedMod(pow) + RqgCalculations.linearMod(cha)
    );
    const knowledgeMod =
      RqgCalculations.linearMod(int) + RqgCalculations.flattenedMod(pow);
    const magicMod =
      RqgCalculations.linearMod(pow) + RqgCalculations.flattenedMod(cha);
    const manipulationMod =
      RqgCalculations.flattenedMod(str) +
      RqgCalculations.linearMod(dex) +
      RqgCalculations.linearMod(int) +
      RqgCalculations.flattenedMod(pow);
    const perceptionMod =
      RqgCalculations.linearMod(int) + RqgCalculations.flattenedMod(pow);
    const stealthMod =
      RqgCalculations.linearMod(dex) -
      RqgCalculations.linearMod(siz) +
      RqgCalculations.linearMod(int) -
      RqgCalculations.flattenedMod(pow);

    data.skillCategoryModifiers = {
      agility: agilityMod,
      communication: communicationMod,
      knowledge: knowledgeMod,
      magic: magicMod,
      manipulation: manipulationMod,
      perception: perceptionMod,
      stealth: stealthMod,
      meleeWeapons: manipulationMod,
      missileWeapons: manipulationMod,
      naturalWeapons: manipulationMod,
      shields: manipulationMod,
      otherSkills: 0,
    };
  }

  prepareEmbeddedEntities(): void {
    super.prepareEmbeddedEntities();
    // TODO refactor this !!!!!
    console.log("THIS prepareEmbeddedEntities", this);
    this.items
      .filter((i: Item) => i.data.type === ItemTypeEnum.Skill.toString())
      .forEach(async (skill) => {
        console.log("*** RqgActor.prepareEmbeddedEntities skill", skill);
        await Skill.prepareItemForActorSheet(skill);
      });

    this.items
      .filter((i: Item) => i.data.type === ItemTypeEnum.HitLocation)
      .forEach(async (hitLocation) => {
        console.log(
          "*** RqgActor.prepareEmbeddedEntities hitLocation",
          hitLocation
        );
        await Skill.prepareItemForActorSheet(hitLocation);
      });
  }

  /**
   * Apply any transformations to the Actor data which are caused by ActiveEffects.
   */
  applyActiveEffects() {
    // @ts-ignore

    console.debug("!! ***applyActiveEffects");
  }

  /**
   * Apply final transformations to the Actor data after all effects have been applied
   */
  prepareDerivedData() {
    // @ts-ignore
    super.prepareBaseData();
    console.debug("!! ***prepareDerivedData");
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
    return super.create(data, options);
  }

  protected _onUpdate(
    data: object,
    options: object,
    userId: string,
    context: object
  ) {
    console.log("*** RqgActor _onUpdate", data, options, userId, context);

    this.prepareEmbeddedEntities(); // Make sure all embedded items get a chance to recalculate from new actor characteristics.
    super._onUpdate(data, options, userId, context);
  }

  RollData() {
    // const data = super.getRollData();
    // const shorthand = game.settings.get("rqg", "macroShorthand");
    //
    // // Re-map all attributes onto the base roll data
    // if (!!shorthand) {
    //     for (let [k, v] of Object.entries(data.attributes)) {
    //         if (!(k in data)) data[k] = v.value;
    //     }
    //     delete data.attributes;
    // }
    // Map all items data using their slugified names
    // data.items = this.data.items.reduce((obj, i) => {
    //     let key = i.name.slugify({strict: true});
    //     let itemData = duplicate(i.data);
    //     if (!!shorthand) {
    //         for (let [k, v] of Object.entries(itemData.attributes)) {
    //             if (!(k in itemData)) itemData[k] = v.value;
    //         }
    //         delete itemData["attributes"];
    //     }
    //     obj[key] = itemData;
    //     return obj;
    // }, {});
    // return data;
  }
}

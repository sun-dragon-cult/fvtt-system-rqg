/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
import { RqgActorData } from "../data-model/actor-data/rqgActorData";
import { RqgCalculations } from "../rqgCalculations";
import { HitLocation } from "../data-model/actor-data/hitLocation";

export class RqgActor extends Actor {
  /**
   * Augment the basic actor data with additional dynamic data.
   */
  /** @override */
  prepareData() {
    super.prepareData();

    const actorData: ActorData = this.data;
    const data: RqgActorData = actorData.data;
    const flags = actorData.flags;

    // Shorthand access to charactertistics
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

    RqgCalculations.hitPointsPerLocation(data.attributes.hitPoints.max).forEach(
      (tuple) => {
        const location = data.hitLocations[tuple[0]];
        if (location) {
          // TODO Check if this location exists (for this race) - needs work...
          data.hitLocations[tuple[0]].hp.max = tuple[1];
          const damage = data.hitLocations[tuple[0]].hp.wounds
            ? data.hitLocations[tuple[0]].hp.wounds.reduce(
                (acc, wound) => acc - wound
              )
            : 0;
          data.hitLocations[tuple[0]].hp.value =
            data.hitLocations[tuple[0]].hp.max - damage;
        }
      }
    );

    RqgCalculations.hitPointsPerLocation(data.attributes.hitPoints.max).forEach(
      (tuple) => {
        const hitLocations: [string, HitLocation][] = Object.entries(
          data.hitLocations
        );
        hitLocations.find((l) => l[0] === tuple[0])[1].hp.max = tuple[1];
      }
    );

    data.attributes.damageBonus = RqgCalculations.damageBonus(str, siz);
    data.attributes.healingRate = RqgCalculations.healingRate(con);
    data.attributes.spiritCombatDamage = RqgCalculations.spiritCombatDamage(
      pow,
      cha
    );
    data.attributes.maximumEncumbrance = Math.min(str, (str + con) / 2);
    data.attributes.movementRate = 8; // TODO Humans only for now

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    // if (actorData.type === 'character') this._prepareCharacterData(actorData);

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
      Agility: agilityMod,
      Communication: communicationMod,
      Knowledge: knowledgeMod,
      Magic: magicMod,
      Manipulation: manipulationMod,
      Perception: perceptionMod,
      Stealth: stealthMod,
      MeleeWeapons: manipulationMod,
      MissileWeapons: manipulationMod,
      NaturalWeapons: manipulationMod,
      Shields: manipulationMod,
      OtherSkills: 0,
    };
  }

  // prepareEmbeddedEntities(): void {
  //   super.prepareEmbeddedEntities();
  //   console.log("THIS prepareEmbeddedEntities", this);
  //   this.items
  //     .filter((i: Item) => i.data.type === ItemTypeEnum.Skill.toString())
  //     .forEach((skill) => {
  //       console.log("*** RqgActor.prepareEmbeddedEntities skill", skill);
  //       SkillSheet.calculateSkillChance(skill);
  //     });
  // }

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

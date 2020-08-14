/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
import { RqgActorData } from "../data-model/actor-data/rqgActorData";
import { RqgCalculations } from "../rqgCalculations";
import { HitLocation } from "../data-model/actor-data/hitLocation";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";

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
    };

    console.log("THIS items", this);
  }

  // prepareEmbeddedEntities(): void {
  //   super.prepareEmbeddedEntities();
  //
  //   // Add the calculated skill chance including skill category modifiers
  //   const skillCatMod = this.data.data.skillCategoryModifiers;
  //
  //   console.log("*** RqgActor.prepareEmbeddedEntities items", this.items);
  //
  //   this.items
  //     .filter((i) => i.data.type === ItemTypeEnum.Skill)
  //     .forEach((s) => {
  //       // Unless you've learned a base 0 skill you can't use your category modifier.
  //       s.data.data.chance =
  //         s.data.data.baseChance > 0 || s.data.data.learnedChance > 0
  //           ? s.data.data.learnedChance + skillCatMod[s.data.data.category]
  //           : 0;
  //     });
  // }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    const data: RqgActorData = actorData.data;

    // Make modifications to data here.

    // TODO  modifying the base chance
    //   private static calcHitPoints(data: RqgActorData): number {
    //     return data.characteristics.constitution.value;
    //   }

    // Loop through ability scores, and add their modifiers to our sheet output.
    // for (let [key, ability] of Object.entries(data.abilities)) {
    //   // Calculate the modifier using d20 rules.
    //   ability.mod = Math.floor((ability.value - 10) / 2);
    // }
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

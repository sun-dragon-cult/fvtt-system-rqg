/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
import {ActorDataRqg} from "../data-model/Actor/actor-data-rqg";

export class ActorRqg extends Actor {

  /**
   * Augment the basic actor data with additional dynamic data.
   */
  /** @override */
  // prepareData() {
  //   super.prepareData();
  //
  //   const actorData: ActorData = this.data;
  //   const data: ActorDataRqg = actorData.data;
  //   // data.mergeObject(ActorRqg.create())
  //   const flags = actorData.flags;
  //
  //   // Make separate methods for each Actor type (character, npc, etc.) to keep
  //   // things organized.
  //   if (actorData.type === 'character') this._prepareCharacterData(actorData);
  // }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    const data: ActorDataRqg = actorData.data;

    // Make modifications to data here.

    // TODO  modifying the base value
//   private static calcHitPoints(data: ActorDataRqg): number {
//     return data.characteristics.constitution.value;
//   }




    // Loop through ability scores, and add their modifiers to our sheet output.
    // for (let [key, ability] of Object.entries(data.abilities)) {
    //   // Calculate the modifier using d20 rules.
    //   ability.mod = Math.floor((ability.value - 10) / 2);
    // }
  }

  /** @override */
  getRollData() {
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

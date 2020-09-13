import { humanoid, RqgCalculations } from "../system/rqgCalculations";
import { RqgActorData } from "../data-model/actor-data/rqgActorData";
import { Item2TypeClass } from "../data-model/item-data/itemTypes";
import elementalRunes from "../assets/default-items/elementalRunes";
import powerRunes from "../assets/default-items/powerRunes";
import hitLocations from "../assets/default-items/hitLocations";
import { RqgActorSheet } from "./rqgActorSheet";

export class RqgActor extends Actor<RqgActorData> {
  static init() {
    CONFIG.Actor.entityClass = RqgActor as typeof Actor;

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("rqg", RqgActorSheet, { makeDefault: true });

    Hooks.on(
      "createActor",
      async (actor: RqgActor, options: any, userId: String) => {
        if (actor.data.type === "character" && options.renderSheet) {
          await actor.createOwnedItem(elementalRunes);
          await actor.createOwnedItem(powerRunes);
          // TODO Add support for other races than humanoid - is race even set at this point?
          await actor.createOwnedItem(
            hitLocations.filter((h) => humanoid.includes(h.name))
          );
          // );
        }
      }
    );
  }

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
    this.items.forEach(
      async (item: Item) =>
        await Item2TypeClass.get(item.type).prepareItemForActorSheet(item)
    );
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
    // @ts-ignore (until foundry-pc-types are updated for 0.7)
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
}

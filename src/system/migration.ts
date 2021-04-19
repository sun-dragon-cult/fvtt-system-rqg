import { RqgActor } from "../actors/rqgActor";
import { RqgActorData } from "../data-model/actor-data/rqgActorData";
import { ItemTypeEnum, RqgItemData } from "../data-model/item-data/itemTypes";
import { RqgItem } from "../items/rqgItem";
import { HitLocationsEnum, HitLocationTypesEnum } from "../data-model/item-data/hitLocationData";

type Updates = {
  updateData: object;
  deleteEmbeddedActiveEffectsIds: string[];
};

export class Migrate {
  /**
   * Perform a system migration for the entire World, applying migrations for Actors, Items, and Compendium packs
   */
  public static async world(): Promise<void> {
    if (game.system.data.version === game.settings.get("rqg", "systemMigrationVersion")) {
      return; // Already updated
    }

    ui.notifications?.info(
      `Applying RQG System Migration for version ${game.system.data.version}. Please be patient and do not close your game or shut down your server.`,
      { permanent: true }
    );

    // Migrate World Actors
    for (let actor of game.actors!.entities as RqgActor[]) {
      try {
        const updates = Migrate.actor(actor);
        if (!isObjectEmpty(updates.updateData)) {
          console.log(`RQG | Migrating Actor entity ${actor.name}`);
          await actor.update(updates.updateData, { enforceTypes: false });
        }
        if (updates.deleteEmbeddedActiveEffectsIds) {
          console.log(`RQG | Cleaning Actor Active Effects entity ${actor.name}`);
          // @ts-ignore arg can be string | string[] TODO make a PR on the typings
          await actor.deleteEmbeddedEntity("ActiveEffect", updates.deleteEmbeddedActiveEffectsIds);
        }
      } catch (err) {
        console.error("RQG | World Actors Migration Error:", err);
      }
    }

    // Migrate World Items
    for (let item of game.items!.entities as RqgItem[]) {
      try {
        const updateData = Migrate.itemData(item.data);
        if (!isObjectEmpty(updateData)) {
          console.log(`RQG | Migrating Item entity ${item.name}`);
          await item.update(updateData, { enforceTypes: false });
        }
      } catch (err) {
        console.error("RQG | World Items Migration Error:", err);
      }
    }

    // Migrate Actor Override Tokens
    for (let scene of game.scenes!.entities) {
      try {
        const updateData = Migrate.sceneData(scene.data);
        if (!isObjectEmpty(updateData)) {
          console.log(`RQG | Migrating Scene entity ${scene.name}`);
          await scene.update(updateData, { enforceTypes: false });
        }
      } catch (err) {
        console.error("RQG | Actor Override Tokens Migration Error:", err);
      }
    }

    // Migrate World Compendium Packs
    const packs: Compendium[] =
      game.packs?.filter((p) => {
        return (
          p.metadata.package === "world" && ["Actor", "Item", "Scene"].includes(p.metadata.entity)
        );
      }) || [];
    for (let p of packs) {
      await Migrate.compendium(p);
    }

    // Set the migration as complete
    await game.settings.set("rqg", "systemMigrationVersion", game.system.data.version);
    ui.notifications?.info(
      `RQG System Migration to version ${game.system.data.version} completed!`,
      { permanent: true }
    );
  }

  /* -------------------------------------------- */

  /**
   * Apply migration rules to all Entities within a single Compendium pack
   * @param pack
   * @return {Promise}
   */
  private static async compendium(pack: Compendium): Promise<void> {
    const entity: string = pack.metadata.entity;
    if (!["Actor", "Item", "Scene"].includes(entity)) {
      return;
    }

    // Begin by requesting server-side data model migration and get the migrated content
    await pack.migrate({});
    const content = (await pack.getContent()) as Entity[];

    // Iterate over compendium entries - applying fine-tuned migration functions
    for (let ent of content) {
      try {
        let updateData = {} as DeepPartial<Data>; // TODO Not a good way - assign _id and update at the same time instead?
        if (entity === "Item") {
          updateData = Migrate.itemData(ent.data as RqgItemData);
        } else if (entity === "Actor") {
          updateData = Migrate.actor(ent as RqgActor);
        } else if (entity === "Scene") {
          updateData = Migrate.sceneData(ent.data as Scene.Data);
        }
        if (!isObjectEmpty(updateData)) {
          expandObject(updateData);
          updateData["_id"] = ent._id;
          await pack.updateEntity(updateData as Data);
          console.log(
            `RQG | Migrated ${entity} entity ${ent.name} in Compendium ${pack.collection}`
          );
        }
      } catch (err) {
        console.error("RQG | Compendium Migration Error:", err);
      }
    }
    console.log(`RQG | Migrated all ${entity} entities from Compendium ${pack.collection}`);
  }

  /* -------------------------------------------- */
  /*  Entity Type Migration Helpers               */
  /* -------------------------------------------- */

  private static actor(actor: RqgActor): Updates {
    let updates: Updates = { updateData: [], deleteEmbeddedActiveEffectsIds: [] };

    updates.deleteEmbeddedActiveEffectsIds = [].concat(
      // @ts-ignore look into
      updates.deleteEmbeddedActiveEffectsIds,
      Migrate.removeOrphanedActiveEffects(actor)
    );
    updates.deleteEmbeddedActiveEffectsIds = [].concat(
      // @ts-ignore look into
      updates.deleteEmbeddedActiveEffectsIds,
      Migrate.removeDuplicatedActiveEffects(actor)
    );

    updates.updateData = Migrate.actorData(actor.data);
    return updates;
  }

  /**
   * Migrate a single Actor entity to incorporate latest data model changes
   * Return an Object of updateData to be applied
   * @param {Actor} actorData   The actor to Update
   * @return {Object}       The updateData to apply
   */
  private static actorData(actorData: RqgActorData): object {
    let updateData: any = {};
    Migrate.removeDeprecatedFields(actorData, updateData);

    // Migrate Owned Items
    if (!actorData.items) {
      return actorData;
    }
    let hasItemUpdates = false;
    const items = actorData.items.map((i) => {
      // Migrate the Owned Item
      let itemUpdate = Migrate.itemData(i); // TODO rätt?

      // Update the Owned Item
      if (!isObjectEmpty(itemUpdate)) {
        hasItemUpdates = true;
        return mergeObject(i, itemUpdate, { enforceTypes: false, inplace: false });
      } else {
        return i;
      }
    });
    if (hasItemUpdates) {
      updateData.items = items;
    }
    return updateData;
  }

  // Return an array of active Effects Ids to be deleted because they miss origin
  private static removeOrphanedActiveEffects(actor: RqgActor): string[] {
    return actor.data.effects.filter((e) => !e.origin).map((e) => e._id);
  }

  // Return an array of active Effects Ids to be deleted because they are duplicated
  // (have identical origin)
  private static removeDuplicatedActiveEffects(actor: RqgActor): string[] {
    let duplicateActiveEffectIds: string[] = [];
    let activeEffectOrigins: any[] = [];
    actor.data.effects.forEach((e: any) => {
      if (activeEffectOrigins.includes(e.origin)) {
        duplicateActiveEffectIds.push(e._id);
      }
      activeEffectOrigins.push(e.origin);
    });
    return duplicateActiveEffectIds;
  }

  /* -------------------------------------------- */

  /**
   * Scrub an Actor's system data, removing all keys which are not explicitly defined in the system template
   * @param {Object} actorData    The data object for an Actor
   * @return {Object}             The scrubbed Actor data
   */
  private static cleanActorData(actorData: any) {
    // Scrub system data
    const model: any = game.system.model.Actor[actorData.type];
    actorData.data = filterObject(actorData.data, model);

    // // Scrub system flags
    // const allowedFlags = CONFIG.DND5E.allowedActorFlags.reduce((obj, f) => {
    //   obj[f] = null;
    //   return obj;
    // }, {});
    // if (actorData.flags.dnd5e) {
    //   actorData.flags.dnd5e = filterObject(actorData.flags.dnd5e, allowedFlags);
    // }

    // Return the scrubbed data
    return actorData;
  }

  /* -------------------------------------------- */

  /**
   * Migrate a single Item entity to incorporate latest data model changes
   * @param itemData
   */
  private static itemData(itemData: RqgItemData): object {
    let updateData = {};
    updateData = mergeObject(updateData, Migrate.itemEstimatedPrice(itemData));
    updateData = mergeObject(updateData, Migrate.hitLocationType(itemData));
    Migrate.removeDeprecatedFields(itemData, updateData);
    return updateData;
  }

  // Migrate price to new model definition in v0.14.0 +
  private static itemEstimatedPrice(itemData: RqgItemData) {
    let updateData = {};
    if (
      "physicalItemType" in itemData.data &&
      itemData.data.physicalItemType &&
      typeof itemData.data.price !== "object"
    ) {
      const currentPrice = itemData.data.price;
      updateData = {
        data: {
          price: {
            real: currentPrice,
            estimated: 0,
          },
        },
      };
    }
    return updateData;
  }

  // Migrate hitLocation type for damage calculations in v0.16.0 +
  private static hitLocationType(itemData: RqgItemData) {
    let updateData = {};
    if (itemData.type === ItemTypeEnum.HitLocation && !itemData.data.hitLocationType) {
      let hitLocationType: HitLocationTypesEnum;
      if (itemData.name === HitLocationsEnum.Abdomen) {
        hitLocationType = HitLocationTypesEnum.Abdomen;
      } else if (itemData.name === HitLocationsEnum.Head) {
        hitLocationType = HitLocationTypesEnum.Head;
      } else if (itemData.name === HitLocationsEnum.Chest) {
        hitLocationType = HitLocationTypesEnum.Chest;
      } else {
        hitLocationType = HitLocationTypesEnum.Limb;
        if (itemData.name.includes("Leg")) {
          itemData.data.connectedTo = HitLocationsEnum.Abdomen;
        }
      }
      updateData = {
        data: {
          hitLocationType: hitLocationType,
        },
      };
    }
    return updateData;
  }

  /* -------------------------------------------- */

  /**
   * Migrate a single Scene entity to incorporate changes to the data model of it's actor data overrides
   * Return an Object of updateData to be applied
   * @param {Object} scene  The Scene data to Update
   * @return {Object}       The updateData to apply
   */
  private static sceneData(scene: Scene.Data): object {
    const tokens = duplicate(scene.tokens) as Token.Data[];
    return {
      tokens: tokens.map((t: Token.Data) => {
        if (!t.actorId || t.actorLink || !t.actorData.data) {
          t.actorData = {};
          return t;
        }
        const token = new Token(t);
        if (!token.actor) {
          // @ts-ignore null to required string
          t.actorId = null;
          t.actorData = {};
        } else if (!t.actorLink) {
          const updateData = Migrate.actorData(token.data.actorData as RqgActorData);
          t.actorData = mergeObject(token.data.actorData, updateData);
        }
        return t;
      }),
    };
  }

  /* -------------------------------------------- */

  /**
   * A general migration to remove all fields from the data model which are flagged with a _deprecated tag
   */
  private static removeDeprecatedFields(ent: any, updateData: any) {
    const flat = flattenObject(ent.data);

    // Identify objects to deprecate
    const toDeprecate = Object.entries(flat)
      .filter((e) => e[0].endsWith("_deprecated") && e[1] === true)
      .map((e) => {
        let parent = e[0].split(".");
        parent.pop();
        return parent.join(".");
      });

    // Remove them
    for (let k of toDeprecate) {
      let parts = k.split(".");
      parts[parts.length - 1] = "-=" + parts[parts.length - 1];
      updateData[`data.${parts.join(".")}`] = null;
    }
  }
}

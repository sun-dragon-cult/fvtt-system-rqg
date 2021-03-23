import { RqgActor } from "../actors/rqgActor";

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

    ui.notifications.info(
      `Applying RQG System Migration for version ${game.system.data.version}. Please be patient and do not close your game or shut down your server.`,
      { permanent: true }
    );

    // Migrate World Actors
    for (let a of game.actors.entities) {
      try {
        const updates = Migrate.actor(a as any);
        if (!isObjectEmpty(updates.updateData)) {
          console.log(`RQG | Migrating Actor entity ${a.name}`);
          await a.update(updates.updateData, { enforceTypes: false });
        }
        if (updates.deleteEmbeddedActiveEffectsIds) {
          console.log(`RQG | Cleaning Actor Active Effects entity ${a.name}`);
          await a.deleteEmbeddedEntity("ActiveEffect", updates.deleteEmbeddedActiveEffectsIds);
        }
      } catch (err) {
        console.error("RQG | World Actors Migration Error:", err);
      }
    }

    // Migrate World Items
    for (let i of game.items.entities) {
      try {
        const updateData = Migrate.itemData(i.data);
        if (!isObjectEmpty(updateData)) {
          console.log(`RQG | Migrating Item entity ${i.name}`);
          await i.update(updateData, { enforceTypes: false });
        }
      } catch (err) {
        console.error("RQG | World Items Migration Error:", err);
      }
    }

    // Migrate Actor Override Tokens
    // @ts-ignore
    for (let s of game.scenes.entities) {
      try {
        const updateData = Migrate.sceneData(s.data);
        if (!isObjectEmpty(updateData)) {
          console.log(`RQG | Migrating Scene entity ${s.name}`);
          await s.update(updateData, { enforceTypes: false });
        }
      } catch (err) {
        console.error("RQG | Actor Override Tokens Migration Error:", err);
      }
    }

    // Migrate World Compendium Packs
    const packs = game.packs.filter((p) => {
      return (
        p.metadata.package === "world" && ["Actor", "Item", "Scene"].includes(p.metadata.entity)
      );
    });
    for (let p of packs) {
      await Migrate.compendium(p);
    }

    // Set the migration as complete
    await game.settings.set("rqg", "systemMigrationVersion", game.system.data.version);
    ui.notifications.info(
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
  private static async compendium(pack) {
    const entity = pack.metadata.entity;
    if (!["Actor", "Item", "Scene"].includes(entity)) return;

    // Begin by requesting server-side data model migration and get the migrated content
    await pack.migrate({});
    const content = await pack.getContent();

    // Iterate over compendium entries - applying fine-tuned migration functions
    for (let ent of content) {
      try {
        let updateData = null;
        if (entity === "Item") updateData = Migrate.itemData(ent.data);
        else if (entity === "Actor") updateData = Migrate.actor(ent);
        else if (entity === "Scene") updateData = Migrate.sceneData(ent.data);
        if (!isObjectEmpty(updateData)) {
          expandObject(updateData);
          updateData["_id"] = ent._id;
          await pack.updateEntity(updateData);
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
      updates.deleteEmbeddedActiveEffectsIds,
      Migrate.removeOrphanedActiveEffects(actor)
    );
    updates.deleteEmbeddedActiveEffectsIds = [].concat(
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
  private static actorData(actorData): object {
    let updateData = {};
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
      // @ts-ignore
      updateData.items = items;
    }
    return updateData;
  }

  // Return an array of active Effects Ids to be deleted because they miss origin
  private static removeOrphanedActiveEffects(actor): string[] {
    return actor.data.effects.filter((e) => !e.origin).map((e) => e._id);
  }

  // Return an array of active Effects Ids to be deleted because they are duplicated
  // (have identical origin)
  private static removeDuplicatedActiveEffects(actor): string[] {
    let duplicateActiveEffectIds: string[] = [];
    let activeEffectOrigins = [];
    actor.data.effects.forEach((e) => {
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
  private static cleanActorData(actorData) {
    // Scrub system data
    const model = game.system.model.Actor[actorData.type];
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
  private static itemData(itemData) {
    let updateData = {};
    updateData = mergeObject(updateData, Migrate.itemEstimatedPrice(itemData));
    Migrate.removeDeprecatedFields(itemData, updateData);
    return updateData;
  }

  // Migrate price to new model definition in v0.14.0 +
  private static itemEstimatedPrice(itemData) {
    let updateData = {};
    if (itemData.data.physicalItemType && typeof itemData.data.price !== "object") {
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

  /* -------------------------------------------- */

  /**
   * Migrate a single Scene entity to incorporate changes to the data model of it's actor data overrides
   * Return an Object of updateData to be applied
   * @param {Object} scene  The Scene data to Update
   * @return {Object}       The updateData to apply
   */
  private static sceneData(scene) {
    const tokens = duplicate(scene.tokens);
    return {
      tokens: tokens.map((t) => {
        if (!t.actorId || t.actorLink || !t.actorData.data) {
          t.actorData = {};
          return t;
        }
        const token = new Token(t);
        if (!token.actor) {
          t.actorId = null;
          t.actorData = {};
        } else if (!t.actorLink) {
          const updateData = Migrate.actorData(token.data.actorData);
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
  private static removeDeprecatedFields(ent, updateData) {
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

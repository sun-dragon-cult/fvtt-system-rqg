import { RqgCalculations } from "../system/rqgCalculations";
import { RqgActorData } from "../data-model/actor-data/rqgActorData";
import { ResponsibleItemClass } from "../data-model/item-data/itemTypes";
import { RqgActorSheet } from "./rqgActorSheet";
import { RqgItem } from "../items/rqgItem";
import { getItemIdsInSameLocationTree } from "../items/shared/locationNode";

export class RqgActor extends Actor<RqgActorData> {
  static init() {
    CONFIG.Actor.entityClass = (RqgActor as unknown) as typeof Actor;

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("rqg", RqgActorSheet, { makeDefault: true });
  }

  /**
   * First prepare any derived data which is actor-specific and does not depend on Items or Active Effects
   */
  prepareBaseData(): void {
    // @ts-ignore (until foundry-pc-types are updated for 0.7)
    super.prepareBaseData();
    const actorData = this.data;
    const data = actorData.data;

    console.debug("rqgActor # prepareBaseData", this.name, data);
    // Set this here before Active effects to allow POW crystals to boost it.
    data.attributes.magicPoints.max = data.characteristics.power.value;
  }

  prepareEmbeddedEntities(): void {
    super.prepareEmbeddedEntities();
    const [data, str, con, siz, dex, int, pow, cha] = this.actorCharacteristics();
    console.debug("rqgActor # prepareEmbeddedEntities", this.name, data);

    data.attributes.hitPoints.max = RqgCalculations.hitPoints(con, siz, pow);

    this.items.forEach((item: RqgItem) =>
      ResponsibleItemClass.get(item.type).onActorPrepareEmbeddedEntities(item)
    );
  }

  /**
   * Apply any transformations to the Actor data which are caused by ActiveEffects.
   */
  applyActiveEffects(): void {
    console.debug("rqgActor # applyActiveEffects", this.name);

    super.applyActiveEffects();
    // @ts-ignore 0.7
    console.debug("!! ***applyActiveEffects", this.effects);
  }

  /**
   * Apply final transformations to the Actor data after all effects have been applied
   */
  prepareDerivedData(): void {
    // @ts-ignore (until foundry-pc-types are updated for 0.7)
    super.prepareDerivedData();

    const [data, str, con, siz, dex, int, pow, cha] = this.actorCharacteristics();
    console.debug("rqgActor # prepareDerivedData", this.name, data);

    data.skillCategoryModifiers = RqgCalculations.skillCategoryModifiers(
      str,
      siz,
      dex,
      int,
      pow,
      cha
    );
    data.attributes.maximumEncumbrance = Math.round(Math.min(str, (str + con) / 2));
    const movementEncumbrancePenalty = Math.min(
      0,
      data.attributes.maximumEncumbrance - data.attributes.equippedEncumbrance
    );

    data.attributes.move += movementEncumbrancePenalty;
    data.skillCategoryModifiers.agility += movementEncumbrancePenalty * 5;
    data.skillCategoryModifiers.manipulation += movementEncumbrancePenalty * 5;
    data.skillCategoryModifiers.stealth += movementEncumbrancePenalty * 5;
    data.skillCategoryModifiers.meleeWeapons += movementEncumbrancePenalty * 5;
    data.skillCategoryModifiers.missileWeapons += movementEncumbrancePenalty * 5;
    data.skillCategoryModifiers.naturalWeapons += movementEncumbrancePenalty * 5;
    data.skillCategoryModifiers.shields += movementEncumbrancePenalty * 5;

    this.items.forEach((item: RqgItem) =>
      ResponsibleItemClass.get(item.type).onActorPrepareDerivedData(item)
    );

    // *** Setup calculated stats ***

    data.attributes.dexStrikeRank = RqgCalculations.dexSR(dex);
    data.attributes.sizStrikeRank = RqgCalculations.sizSR(siz);
    data.attributes.damageBonus = RqgCalculations.damageBonus(str, siz);
    data.attributes.healingRate = RqgCalculations.healingRate(con);
    data.attributes.spiritCombatDamage = RqgCalculations.spiritCombatDamage(pow, cha);

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
          bar1: { attribute: "attributes.hitPoints" },
          bar2: { attribute: "attributes.magicPoints" },
          displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
        },
        { overwrite: false }
      );
    }
    return await super.create(data, options);
  }

  // @ts-ignore
  protected async _onCreateEmbeddedEntity(
    embeddedName: string,
    child: ItemData,
    options,
    userId: string
  ) {
    console.debug("rqgActor # _onCreateEmbeddedEntity", child.name, child);

    if (embeddedName === "OwnedItem") {
      const updateData = await ResponsibleItemClass.get(child.type).onEmbedItem(
        this,
        child,
        options,
        userId
      );
      updateData && (await this.updateOwnedItem(updateData));
    }
    // @ts-ignore
    return super._onCreateEmbeddedEntity(embeddedName, child, options, userId);
  }

  // @ts-ignore
  protected async _onDeleteEmbeddedEntity(embeddedName, child: ItemData, options, userId: string) {
    console.debug("rqgActor # _onDeleteEmbeddedEntity", child.name, child);

    if (embeddedName === "OwnedItem") {
      const updateData = await ResponsibleItemClass.get(child.type).onDeleteItem(
        this,
        child,
        options,
        userId
      );
      updateData && (await this.updateOwnedItem(updateData));
    }
    // @ts-ignore
    return super._onDeleteEmbeddedEntity(embeddedName, child, options, userId);
  }

  // @ts-ignore
  protected async _onUpdateEmbeddedEntity(
    embeddedName: string,
    child: ItemData,
    update: any,
    options: any,
    userId: string
  ) {
    console.debug("rqgActor # _onUpdateEmbeddedEntity", child.name, child);
    if (embeddedName === "OwnedItem") {
      const updateData = await ResponsibleItemClass.get(child.type).onUpdateItem(
        this,
        child,
        update,
        options,
        userId
      );
      updateData && (await this.updateOwnedItem(updateData));
    }
    // @ts-ignore
    return super._onUpdateEmbeddedEntity(embeddedName, child, update, options, userId);
  }

  // @ts-ignore
  _onModifyEmbeddedEntity(embeddedName, ...args) {
    // @ts-ignore
    console.debug("rqgActor # _onModifyEmbeddedEntity", this.name, args);
    if (embeddedName === "OwnedItem") {
      this.updateEquippedStatus(args[0]).then(
        () =>
          // Try doing stuff after actor has updated
          setTimeout(this.updateEncumbrance.bind(this), 0) // TODO Solve without releasing thread?
      );
    }
    // @ts-ignore
    super._onModifyEmbeddedEntity(embeddedName, ...args);
  }

  private async updateEquippedStatus(changes) {
    const equippedStatusChanges: any[] = changes.filter(
      (i) => i.data.equippedStatus || typeof i.data.location !== "undefined"
    );
    if (equippedStatusChanges.length) {
      // Check that equippedStatus has changed

      // const item = this.actor.getOwnedItem(itemId);
      const newEquippedStatus =
        equippedStatusChanges[0].data.equippedStatus ||
        this.getOwnedItem(equippedStatusChanges[0]._id).data.data.equippedStatus; // TODO Always correct?

      const itemsToUpdate = equippedStatusChanges.map((i) =>
        getItemIdsInSameLocationTree(this.items.get(i._id).data, this).map((id) => {
          return { _id: id, "data.equippedStatus": newEquippedStatus };
        })
      );
      await this.updateEmbeddedEntity("OwnedItem", itemsToUpdate[0]); // TODO fix nested arrays
      // await item.update({ "data.equippedStatus": newStatus }, {});
    }
  }

  private async updateEncumbrance() {
    const equippedEncumbrance = Math.round(
      this.items
        .filter((i) => i.data.data.equippedStatus === "equipped")
        .reduce((sum, i) => {
          const enc = (i.data.data.quantity || 1) * (i.data.data.encumbrance || 0);
          return sum + enc;
        }, 0)
    );

    const travelEncumbrance = Math.round(
      this.items
        .filter((i) => ["carried", "equipped"].includes(i.data.data.equippedStatus))
        .reduce((sum, i) => {
          const enc = (i.data.data.quantity || 1) * (i.data.data.encumbrance || 0);
          return sum + enc;
        }, 0)
    );
    if (
      this.data.data.attributes.equippedEncumbrance !== equippedEncumbrance ||
      this.data.data.attributes.travelEncumbrance !== travelEncumbrance
    ) {
      await this.update(
        {
          _id: this._id,
          data: {
            attributes: {
              equippedEncumbrance: equippedEncumbrance,
              travelEncumbrance: travelEncumbrance,
            },
          },
        },
        { render: true }
      );
    }
  }

  // Return shorthand access to actor data & characteristics
  private actorCharacteristics(): [
    RqgActorData,
    number,
    number,
    number,
    number,
    number,
    number,
    number
  ] {
    const actorData = this.data;
    const data = actorData.data;

    const str = data.characteristics.strength.value;
    const con = data.characteristics.constitution.value;
    const siz = data.characteristics.size.value;
    const dex = data.characteristics.dexterity.value;
    const int = data.characteristics.intelligence.value;
    const pow = data.characteristics.power.value;
    const cha = data.characteristics.charisma.value;
    return [data, str, con, siz, dex, int, pow, cha];
  }
}

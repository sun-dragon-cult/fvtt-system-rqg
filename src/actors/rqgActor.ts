import { RqgCalculations } from "../system/rqgCalculations";
import { RqgActorData } from "../data-model/actor-data/rqgActorData";
import { ResponsibleItemClass } from "../data-model/item-data/itemTypes";
import { RqgActorSheet } from "./rqgActorSheet";
import { getItemIdsInSameLocationTree } from "../items/shared/locationNode";
import { logBug } from "../system/util";
import { RqgItem } from "../items/rqgItem";

export class RqgActor extends Actor<RqgActorData, RqgItem> {
  static init() {
    CONFIG.Actor.entityClass = RqgActor;

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("rqg", RqgActorSheet, { makeDefault: true });
  }

  /**
   * First prepare any derived data which is actor-specific and does not depend on Items or Active Effects
   */
  prepareBaseData(): void {
    super.prepareBaseData();
    const actorData = this.data;
    const data = actorData.data;
    // Set this here before Active effects to allow POW crystals to boost it.
    data.attributes.magicPoints.max = data.characteristics.power.value;
  }

  prepareEmbeddedEntities(): void {
    super.prepareEmbeddedEntities();
    const data = this.data.data;
    const [str, con, siz, dex, int, pow, cha] = this.actorCharacteristics();
    data.attributes.hitPoints.max = RqgCalculations.hitPoints(con, siz, pow);
    this.items.forEach((item) =>
      ResponsibleItemClass.get(item.type)?.onActorPrepareEmbeddedEntities(item)
    );
  }

  /**
   * Apply any transformations to the Actor data which are caused by ActiveEffects.
   */
  applyActiveEffects(): void {
    super.applyActiveEffects();
  }

  /**
   * Apply final transformations to the Actor data after all effects have been applied
   */
  prepareDerivedData(): void {
    super.prepareDerivedData();
    const data = this.data.data;
    const [str, con, siz, dex, int, pow, cha] = this.actorCharacteristics();
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
      data.attributes.maximumEncumbrance || 0 - (data.attributes.equippedEncumbrance || 0)
    );

    data.attributes.move += movementEncumbrancePenalty;
    data.skillCategoryModifiers.agility += movementEncumbrancePenalty * 5;
    data.skillCategoryModifiers.manipulation += movementEncumbrancePenalty * 5;
    data.skillCategoryModifiers.stealth += movementEncumbrancePenalty * 5;
    data.skillCategoryModifiers.meleeWeapons += movementEncumbrancePenalty * 5;
    data.skillCategoryModifiers.missileWeapons += movementEncumbrancePenalty * 5;
    data.skillCategoryModifiers.naturalWeapons += movementEncumbrancePenalty * 5;
    data.skillCategoryModifiers.shields += movementEncumbrancePenalty * 5;

    this.items.forEach((item) =>
      ResponsibleItemClass.get(item.type)?.onActorPrepareDerivedData(item)
    );

    // *** Setup calculated stats ***

    data.attributes.dexStrikeRank = RqgCalculations.dexSR(dex);
    data.attributes.sizStrikeRank = RqgCalculations.sizSR(siz);
    data.attributes.damageBonus = RqgCalculations.damageBonus(str, siz);
    data.attributes.healingRate = RqgCalculations.healingRate(con);
    data.attributes.spiritCombatDamage = RqgCalculations.spiritCombatDamage(pow, cha);
  }

  // Entity-specific actions that should occur when the Entity is first created
  protected _onCreate(...args: any[]) {
    // @ts-ignore TODO remove
    super._onCreate(...args);
    const actorData = args[0];

    // There might be effects with a different actor.id but same itemData.id if the actor
    // is copied or imported, make sure the actor id is pointing to this new actor.
    const effectsOriginUpdates = actorData.effects.map((effect: ActiveEffect) => {
      return {
        _id: effect.id,
        // @ts-ignore origin
        origin: RqgActor.updateEffectOrigin(effect.origin, actorData._id),
      };
    });
    this.updateEmbeddedEntity("ActiveEffect", effectsOriginUpdates);
  }

  private static updateEffectOrigin(origin: string, actorId: string): string {
    let [actorLiteral, effectActorId, ownedItemLiteral, effectOwnedItemId] =
      origin && origin.split(".");
    if (effectActorId && actorId !== effectActorId) {
      origin = `${actorLiteral}.${actorId}.${ownedItemLiteral}.${effectOwnedItemId}`;
    }
    return origin;
  }

  // Defaults when creating a new Actor
  static async create(data: any, options?: object | undefined): Promise<Entity> {
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
    const actor = await super.create(data, options);
    if (actor) {
      return actor;
    } else {
      logBug("Couldn't create actor");
      return new Actor();
    }
  }

  // @ts-ignore TODO remove
  protected async _onCreateEmbeddedEntity(
    embeddedName: string,
    child: Item.Data,
    options: any,
    userId: string
  ): Promise<void> {
    if (embeddedName === "OwnedItem" && this.owner) {
      const updateData = await ResponsibleItemClass.get(child.type)?.onEmbedItem(
        this,
        child,
        options,
        userId
      );
      updateData && (await this.updateOwnedItem(updateData));
    }
    // @ts-ignore TODO remove
    return super._onCreateEmbeddedEntity(embeddedName, child, options, userId);
  }

  // @ts-ignore TODO remove
  protected async _onDeleteEmbeddedEntity(
    embeddedName: string,
    child: Item.Data,
    options: any,
    userId: string
  ) {
    if (embeddedName === "OwnedItem" && this.owner) {
      const updateData = await ResponsibleItemClass.get(child.type)?.onDeleteItem(
        this,
        child,
        options,
        userId
      );
      updateData && (await this.updateOwnedItem(updateData));
    }
    // @ts-ignore TODO remove
    return super._onDeleteEmbeddedEntity(embeddedName, child, options, userId);
  }

  protected async _onUpdateEmbeddedEntity(
    embeddedName: string,
    child: Item.Data,
    update: any,
    options: any,
    userId: string
  ) {
    if (embeddedName === "OwnedItem" && this.owner) {
      const updateData = await ResponsibleItemClass.get(child.type)?.onUpdateItem(
        this,
        child,
        update,
        options,
        userId
      );
      updateData && (await this.updateOwnedItem(updateData));
    }
    return super._onUpdateEmbeddedEntity(embeddedName, child, update, options, userId);
  }

  // @ts-ignore TODO remove
  _onModifyEmbeddedEntity(embeddedName, ...args) {
    if (embeddedName === "OwnedItem" && this.owner) {
      this.updateEquippedStatus(args[0]).then(
        () =>
          // Try doing stuff after actor has updated
          setTimeout(this.updateEncumbrance.bind(this), 0) // TODO Solve without releasing thread?
      );
    }
    // @ts-ignore TODO remove
    super._onModifyEmbeddedEntity(embeddedName, ...args);
  }

  private async updateEquippedStatus(changes: any) {
    const equippedStatusChanges: any[] = changes.filter(
      // FIXME changes can be a list of id:s if removed *** *** ***
      (i: any) => i?.data?.equippedStatus || typeof i?.data?.location !== "undefined"
    );
    if (equippedStatusChanges.length) {
      // Check that equippedStatus has changed

      // const item = this.actor.getOwnedItem(itemId);
      const newEquippedStatus =
        equippedStatusChanges[0].data.equippedStatus ||
        (this.getOwnedItem(equippedStatusChanges[0]._id).data.data as any).equippedStatus; // TODO Always correct?

      const itemsToUpdate = equippedStatusChanges.map((i) => {
        const item = this.items.get(i._id);
        if (item) {
          return getItemIdsInSameLocationTree(item.data, this).map((id) => {
            return { _id: id, "data.equippedStatus": newEquippedStatus };
          });
        } else {
          logBug("couldn't find item when updating equipped status", i);
        }
      });
      await this.updateEmbeddedEntity("OwnedItem", itemsToUpdate[0]); // TODO fix nested arrays
      // await item.update({ "data.equippedStatus": newStatus }, {});
    }
  }

  private async updateEncumbrance() {
    const equippedEncumbrance = Math.round(
      this.items
        .filter(
          (i: RqgItem) =>
            "equippedStatus" in i.data.data && i.data.data.equippedStatus === "equipped"
        )
        .reduce((sum, i: RqgItem) => {
          const quantity =
            "quantity" in i.data.data && i.data.data.quantity ? i.data.data.quantity : 1;
          const encumbrance =
            "encumbrance" in i.data.data && i.data.data.encumbrance ? i.data.data.encumbrance : 0;
          return sum + quantity * encumbrance;
        }, 0)
    );

    const travelEncumbrance = Math.round(
      this.items
        .filter((i: Item<any>) => ["carried", "equipped"].includes(i.data.data.equippedStatus))
        .reduce((sum, i: Item<any>) => {
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
  private actorCharacteristics(): [number, number, number, number, number, number, number] {
    const characteristics = this.data.data.characteristics;
    const str = characteristics.strength.value;
    const con = characteristics.constitution.value;
    const siz = characteristics.size.value;
    const dex = characteristics.dexterity.value;
    const int = characteristics.intelligence.value;
    const pow = characteristics.power.value;
    const cha = characteristics.charisma.value;
    return [str, con, siz, dex, int, pow, cha];
  }
}

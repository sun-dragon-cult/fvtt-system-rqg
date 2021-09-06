import { RqgCalculations } from "../system/rqgCalculations";
import { RqgActorData } from "../data-model/actor-data/rqgActorData";
import { ResponsibleItemClass } from "../data-model/item-data/itemTypes";
import { RqgActorSheet } from "./rqgActorSheet";
import { RqgItem } from "../items/rqgItem";
import { DamageCalculations } from "../system/damageCalculations";

export class RqgActor extends Actor<RqgActorData, RqgItem> {
  static init() {
    // @ts-ignore 0.8
    CONFIG.Actor.documentClass = RqgActor;

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("rqg", RqgActorSheet, {
      label: "Character Sheet",
      types: ["character"],
      makeDefault: true,
    });
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
    const actorData = this.data.data;
    const { con, siz, pow } = this.actorCharacteristics();
    actorData.attributes.hitPoints.max = RqgCalculations.hitPoints(con, siz, pow);
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
    const { attributes, skillCategoryModifiers } = this.data.data;
    const { str, con, siz, dex, int, pow, cha } = this.actorCharacteristics();
    this.data.data.skillCategoryModifiers = RqgCalculations.skillCategoryModifiers(
      str,
      siz,
      dex,
      int,
      pow,
      cha
    );
    attributes.maximumEncumbrance = Math.round(Math.min(str, (str + con) / 2));
    attributes.equippedEncumbrance = Math.round(
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

    const movementEncumbrancePenalty = Math.min(
      0,
      (attributes.maximumEncumbrance || 0) - (attributes.equippedEncumbrance || 0)
    );

    attributes.travelEncumbrance = Math.round(
      this.items
        .filter((i: Item<any>) => ["carried", "equipped"].includes(i.data.data.equippedStatus))
        .reduce((sum, i: Item<any>) => {
          const enc = (i.data.data.quantity || 1) * (i.data.data.encumbrance || 0);
          return sum + enc;
        }, 0)
    );

    attributes.move = this.data._source.data.attributes.move + movementEncumbrancePenalty;
    skillCategoryModifiers!.agility += movementEncumbrancePenalty * 5;
    skillCategoryModifiers!.manipulation += movementEncumbrancePenalty * 5;
    skillCategoryModifiers!.stealth += movementEncumbrancePenalty * 5;
    skillCategoryModifiers!.meleeWeapons += movementEncumbrancePenalty * 5;
    skillCategoryModifiers!.missileWeapons += movementEncumbrancePenalty * 5;
    skillCategoryModifiers!.naturalWeapons += movementEncumbrancePenalty * 5;
    skillCategoryModifiers!.shields += movementEncumbrancePenalty * 5;

    this.items.forEach((item) =>
      ResponsibleItemClass.get(item.type)?.onActorPrepareDerivedData(item)
    );

    attributes.dexStrikeRank = RqgCalculations.dexSR(dex);
    attributes.sizStrikeRank = RqgCalculations.sizSR(siz);
    attributes.damageBonus = RqgCalculations.damageBonus(str, siz);
    attributes.healingRate = RqgCalculations.healingRate(con);
    attributes.spiritCombatDamage = RqgCalculations.spiritCombatDamage(pow, cha);

    attributes.health = DamageCalculations.getCombinedActorHealth(this.data);
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
    effectsOriginUpdates.length &&
      // @ts-ignore 0.8
      this.updateEmbeddedDocuments("ActiveEffect", [effectsOriginUpdates]);
  }

  private static updateEffectOrigin(origin: string, actorId: string): string {
    let [actorLiteral, effectActorId, ownedItemLiteral, effectOwnedItemId] =
      origin && origin.split(".");
    if (effectActorId && actorId !== effectActorId) {
      origin = `${actorLiteral}.${actorId}.${ownedItemLiteral}.${effectOwnedItemId}`;
    }
    return origin;
  }

  protected _preCreateEmbeddedDocuments(
    embeddedName: string,
    result: RqgItem[],
    options: object[],
    userId: string
  ): void {
    if (embeddedName === "Item" && game.user?.id === userId) {
      result.forEach((d) => {
        ResponsibleItemClass.get(d.type)?.preEmbedItem(this, d, options, userId);
      });
    }
  }

  protected _onCreateEmbeddedDocuments(
    embeddedName: string,
    documents: any[], // Document[]
    result: object[],
    options: object[],
    userId: string
    // TODO *** REWORK FOR 0.8 !!! ***
  ): void {
    if (embeddedName === "Item" && game.user?.id === userId) {
      documents.forEach((d) => {
        ResponsibleItemClass.get(d.type)
          ?.onEmbedItem(this, d, options, userId)
          .then((updateData: any) => {
            // @ts-ignore 0.8
            updateData && this.updateEmbeddedDocuments("Item", [updateData]); // TODO move the actual update outside the loop (map instead of forEach)
          });
      });
    }
    // @ts-ignore 0.8
    super._onCreateEmbeddedDocuments(embeddedName, documents, result, options, userId);
  }

  protected _onDeleteEmbeddedDocuments(
    embeddedName: string,
    documents: any[], // Document[]
    result: object[],
    options: object[],
    userId: string
  ): void {
    if (embeddedName === "Item" && game.user?.id === userId) {
      documents.forEach((d) => {
        const updateData = ResponsibleItemClass.get(d.type)?.onDeleteItem(this, d, options, userId);
        // @ts-ignore 0.8
        updateData && this.updateEmbeddedDocuments("Item", [updateData]);
      });
    }
    // @ts-ignore 0.8
    super._onDeleteEmbeddedDocuments(embeddedName, documents, options, userId);
  }

  // Return shorthand access to actor data & characteristics
  private actorCharacteristics(): {
    str: number;
    con: number;
    siz: number;
    dex: number;
    int: number;
    pow: number;
    cha: number;
  } {
    const characteristics = this.data.data.characteristics;
    const str = characteristics.strength.value;
    const con = characteristics.constitution.value;
    const siz = characteristics.size.value;
    const dex = characteristics.dexterity.value;
    const int = characteristics.intelligence.value;
    const pow = characteristics.power.value;
    const cha = characteristics.charisma.value;
    return { str, con, siz, dex, int, pow, cha };
  }
}

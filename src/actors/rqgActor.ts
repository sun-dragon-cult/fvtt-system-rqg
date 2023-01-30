import { RqgCalculations } from "../system/rqgCalculations";
import { ActorTypeEnum, CharacterDataPropertiesData } from "../data-model/actor-data/rqgActorData";
import { ResponsibleItemClass } from "../data-model/item-data/itemTypes";
import { RqgActorSheet } from "./rqgActorSheet";
import { RqgItem } from "../items/rqgItem";
import { DamageCalculations } from "../system/damageCalculations";
import { getGame, hasOwnProperty, localize } from "../system/util";
import { DocumentModificationOptions } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs";
import { ActorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";
import { initializeAllCharacteristics } from "./context-menus/characteristic-context-menu";
import EmbeddedCollection from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/embedded-collection.mjs";
import { systemId } from "../system/config";
import { ResultEnum } from "../data-model/shared/ability";
import { Rqid } from "../system/api/rqidApi";
import { PrototypeTokenData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";

export class RqgActor extends Actor {
  static init() {
    CONFIG.Actor.documentClass = RqgActor;

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet(systemId, RqgActorSheet as any, {
      label: "Character Sheet",
      types: [ActorTypeEnum.Character],
      makeDefault: true,
    });
  }
  declare system: CharacterDataPropertiesData; // v10 type workaround
  declare prototypeToken: PrototypeTokenData; // v10 type workaround

  /**
   * First prepare any derived data which is actor-specific and does not depend on Items or Active Effects
   */
  prepareBaseData(): void {
    super.prepareBaseData();
    // Set this here before Active effects to allow POW crystals to boost it.
    this.system.attributes.magicPoints.max = this.system.characteristics.power.value;
  }

  prepareEmbeddedDocuments(): void {
    // @ts-expect-error Foundry 9
    super.prepareEmbeddedDocuments();
    const actorSystem = this.system;
    const { con, siz, pow } = this.actorCharacteristics();
    actorSystem.attributes.hitPoints.max = RqgCalculations.hitPoints(con, siz, pow);

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
    const attributes = this.system.attributes;
    const { str, con, siz, dex, int, pow, cha } = this.actorCharacteristics();
    const skillCategoryModifiers = (this.system.skillCategoryModifiers =
      RqgCalculations.skillCategoryModifiers(
        str,
        siz,
        dex,
        int,
        pow,
        cha,
        this.system.attributes.isCreature
      ));

    attributes.encumbrance = {
      max: this.calcMaxEncumbrance(
        str,
        con,
        attributes.move?.[attributes.move?.currentLocomotion]?.carryingFactor
      ),
      travel: this.calcTravelEncumbrance(this.items),
      equipped: this.calcEquippedEncumbrance(this.items),
    };

    const equippedMovementEncumbrancePenalty = Math.min(
      0,
      (attributes.encumbrance.max || 0) - (attributes.encumbrance.equipped || 0)
    );

    attributes.move.value =
      this.system.attributes.move?.[attributes.move?.currentLocomotion]?.value || 0;

    attributes.move.equipped = attributes.move.value + equippedMovementEncumbrancePenalty;
    skillCategoryModifiers.agility += equippedMovementEncumbrancePenalty * 5;
    skillCategoryModifiers.manipulation += equippedMovementEncumbrancePenalty * 5;
    skillCategoryModifiers.stealth += equippedMovementEncumbrancePenalty * 5;
    skillCategoryModifiers.meleeWeapons += equippedMovementEncumbrancePenalty * 5;
    skillCategoryModifiers.missileWeapons += equippedMovementEncumbrancePenalty * 5;
    skillCategoryModifiers.naturalWeapons += equippedMovementEncumbrancePenalty * 5;
    skillCategoryModifiers.shields += equippedMovementEncumbrancePenalty * 5;

    const travelMovementEncumbrancePenalty = Math.min(
      0,
      attributes.encumbrance.max - attributes.encumbrance.travel
    );
    attributes.move.travel = attributes.move.value + travelMovementEncumbrancePenalty;

    this.items.forEach((item) =>
      ResponsibleItemClass.get(item.type)?.onActorPrepareDerivedData(item)
    );

    attributes.dexStrikeRank = RqgCalculations.dexSR(dex);
    attributes.sizStrikeRank = RqgCalculations.sizSR(siz);
    attributes.damageBonus = RqgCalculations.damageBonus(str, siz);
    attributes.healingRate = RqgCalculations.healingRate(con);
    attributes.spiritCombatDamage = RqgCalculations.spiritCombatDamage(pow, cha);

    attributes.health = DamageCalculations.getCombinedActorHealth(this);
  }

  private calcMaxEncumbrance(
    str: number | undefined,
    con: number | undefined,
    carryingFactor: number | undefined
  ): number {
    if (!str || !con) {
      return 0;
    }
    return Math.round(Math.min(str, (str + con) / 2) * (carryingFactor ?? 1));
  }

  private calcTravelEncumbrance(items: EmbeddedCollection<typeof RqgItem, ActorData>): number {
    return Math.round(
      items.reduce((sum: number, item: RqgItem) => {
        if (
          hasOwnProperty(item.system, "equippedStatus") &&
          ["carried", "equipped"].includes(item.system.equippedStatus)
        ) {
          const enc = (item.system.quantity ?? 1) * (item.system.encumbrance ?? 0);
          return sum + enc;
        }
        return sum;
      }, 0)
    );
  }

  private calcEquippedEncumbrance(items: EmbeddedCollection<typeof RqgItem, ActorData>): number {
    return Math.round(
      items.reduce((sum, item: RqgItem) => {
        if (
          hasOwnProperty(item.system, "physicalItemType") &&
          item.system.equippedStatus === "equipped"
        ) {
          const quantity = item.system.quantity ?? 1;
          const encumbrance = item.system.encumbrance ?? 0;
          return sum + quantity * encumbrance;
        }
        return sum;
      }, 0)
    );
  }

  // Entity-specific actions that should occur when the Entity is first created
  // @ts-ignore
  protected _onCreate(actorData: ActorData, options: DocumentModificationOptions, userId: string) {
    super._onCreate(actorData as any, options, userId); // TODO type bug ??

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
      this.updateEmbeddedDocuments("ActiveEffect", effectsOriginUpdates);

    if (!this.prototypeToken.actorLink) {
      initializeAllCharacteristics(this);
    }
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
    result: Record<string, unknown>[],
    options: DocumentModificationOptions,
    userId: string
  ): void {
    if (embeddedName === "Item" && getGame().user?.id === userId) {
      result.forEach((d) => {
        // @ts-ignore
        ResponsibleItemClass.get(d.type)?.preEmbedItem(this, d, options, userId);
      });
    }
  }

  protected _onCreateEmbeddedDocuments(
    embeddedName: string,
    documents: foundry.abstract.Document<any, any>[],
    result: Record<string, unknown>[],
    options: DocumentModificationOptions,
    userId: string
  ): void {
    if (embeddedName === "Item" && getGame().user?.id === userId) {
      documents.forEach((d: any) => {
        // TODO any bailout - fix types!
        ResponsibleItemClass.get(d.type)
          ?.onEmbedItem(this, d, options, userId)
          .then((updateData: any) => {
            updateData && this.updateEmbeddedDocuments("Item", [updateData]); // TODO move the actual update outside the loop (map instead of forEach)
          });
      });
    }
    super._onCreateEmbeddedDocuments(embeddedName, documents, result, options, userId);
  }

  protected _onDeleteEmbeddedDocuments(
    embeddedName: string,
    documents: foundry.abstract.Document<any, any>[],
    result: string[],
    options: DocumentModificationContext,
    userId: string
  ): void {
    if (embeddedName === "Item" && getGame().user?.id === userId) {
      documents.forEach((d) => {
        // @ts-expect-error type
        const updateData = ResponsibleItemClass.get(d.type)?.onDeleteItem(
          this,
          d as RqgItem, // TODO type bailout - fixme
          options,
          userId
        );
        if (updateData?.length) {
          this.updateEmbeddedDocuments("Item", updateData);
        }
      });
    }

    super._onDeleteEmbeddedDocuments(embeddedName, documents, result, options, userId);
  }

  // Return shorthand access to actor data & characteristics
  private actorCharacteristics(): {
    str: number | undefined;
    con: number | undefined;
    siz: number | undefined;
    dex: number | undefined;
    int: number | undefined;
    pow: number | undefined;
    cha: number | undefined;
  } {
    const characteristics = this.system.characteristics;
    const str = characteristics.strength.value;
    const con = characteristics.constitution.value;
    const siz = characteristics.size.value;
    const dex = characteristics.dexterity.value;
    const int = characteristics.intelligence.value;
    const pow = characteristics.power.value;
    const cha = characteristics.charisma.value;
    return { str, con, siz, dex, int, pow, cha };
  }

  public async drawMagicPoints(amount: number, result: ResultEnum): Promise<void> {
    if (result <= ResultEnum.Success) {
      const newMp = (this.system.attributes.magicPoints.value || 0) - amount;
      await this.update({ "system.attributes.magicPoints.value": newMp });
      ui.notifications?.info(
        localize("RQG.Dialog.spiritMagicChat.SuccessfullyCastInfo", { amount: amount })
      );
    }
  }

  /**
   * Only handles embedded Items
   */
  public getEmbeddedDocumentsByRqid(rqid: string): RqgItem[] {
    return this.items.filter((i) => i.getFlag(systemId, "documentRqidFlags.id") === rqid);
  }

  public getBestEmbeddedDocumentByRqid(rqid: string): RqgItem | undefined {
    return this.getEmbeddedDocumentsByRqid(rqid).sort(Rqid.compareRqidPrio)[0];
  }
}

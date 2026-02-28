import { RqgCalculations } from "../system/rqgCalculations";
import {
  ActorTypeEnum,
  type CharacterActor,
  type CharacterDataSource,
} from "../data-model/actor-data/rqgActorData";
import { ItemTypeEnum, type PhysicalItem, ResponsibleItemClass } from "@item-model/itemTypes.ts";
import { RqgActorSheet } from "./rqgActorSheet";
import { DamageCalculations } from "../system/damageCalculations";
import {
  assertDocumentSubType,
  getTokenFromActor,
  isDocumentSubType,
  localize,
  localizeCharacteristic,
  requireValue,
  RqgError,
  usersIdsThatOwnActor,
} from "../system/util";
import { initializeAllCharacteristics } from "./context-menus/characteristic-context-menu";
import { RQG_CONFIG, systemId } from "../system/config";
import { Rqid } from "../system/api/rqidApi";
import { AbilitySuccessLevelEnum } from "../rolls/AbilityRoll/AbilityRoll.defs";
import type { CharacteristicRollOptions } from "../rolls/CharacteristicRoll/CharacteristicRoll.types";
import { CharacteristicRoll } from "../rolls/CharacteristicRoll/CharacteristicRoll";
import type { Characteristic, Characteristics } from "../data-model/actor-data/characteristics";
import { CharacteristicRollDialogV2 } from "../applications/CharacteristicRollDialog/characteristicRollDialogV2";
import type { AbilityRollOptions } from "../rolls/AbilityRoll/AbilityRoll.types";
import { AbilityRollDialogV2 } from "../applications/AbilityRollDialog/abilityRollDialogV2";
import { AbilityRoll } from "../rolls/AbilityRoll/AbilityRoll";
import type { PartialAbilityItem } from "../applications/AbilityRollDialog/AbilityRollDialogData.types.ts";
import type { ActorHealthState } from "../data-model/actor-data/attributes";
import type { DamageType } from "@item-model/weaponData.ts";
import { Skill } from "../items/skill-item/skill";
import type { RqgItem } from "@items/rqgItem.ts";

import type { HitLocationItem } from "@item-model/hitLocationData.ts";

import type { DeepPartial } from "fvtt-types/utils";
import { physicalItemTypes } from "@item-model/IPhysicalItem.ts";
import type { SkillItem } from "@item-model/skillData.ts";

import Actor = foundry.documents.Actor;

export class RqgActor extends Actor {
  static init() {
    CONFIG.Actor.documentClass = RqgActor;

    const Actors = foundry.documents.collections.Actors;

    Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);

    Actors.registerSheet(systemId, RqgActorSheet, {
      types: [ActorTypeEnum.Character],
      label: "RQG.SheetName.Actor.Character",
      makeDefault: true,
    });
  }

  /**
   * Only handles embedded Items
   */
  public getEmbeddedDocumentsByRqid(rqid: string | undefined): RqgItem[] {
    if (!rqid) {
      return [];
    }
    return this.items.filter(
      (i) => i.getFlag(systemId, "documentRqidFlags")?.id === rqid,
    ) as RqgItem[];
  }

  public getBestEmbeddedDocumentByRqid(rqid: string | undefined): RqgItem | undefined {
    return this.getEmbeddedDocumentsByRqid(rqid).sort(Rqid.compareRqidPrio)[0];
  }

  public async characteristicRoll(characteristicName: keyof Characteristics): Promise<void> {
    await new CharacteristicRollDialogV2(this, characteristicName).render(true);
  }

  /**
   * Do a characteristic roll and notify the user if POW experience rules apply.
   */
  public async characteristicRollImmediate(
    characteristicName: keyof Characteristics,
    options: Omit<CharacteristicRollOptions, "characteristicValue" | "characteristicName"> = {},
  ): Promise<void> {
    const rollOptions = this.getCharacteristicRollDefaults(characteristicName, options);
    const characteristicRoll = await CharacteristicRoll.rollAndShow(rollOptions);
    await this.checkExperience(rollOptions.characteristicName, characteristicRoll.successLevel);
  }

  private getCharacteristicRollDefaults(
    characteristicName: keyof Characteristics,
    options: Partial<CharacteristicRollOptions>,
  ): CharacteristicRollOptions {
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);

    const actorCharacteristics = this.system.characteristics;
    const rollCharacteristic = actorCharacteristics[characteristicName] as
      | Characteristic
      | undefined;

    if (!rollCharacteristic) {
      throw new RqgError(
        `Tried to roll characteristic with unknown characteristic name [${options.characteristicName}]`,
      );
    }

    return foundry.utils.mergeObject(
      options,
      {
        actor: this,
        characteristicName: characteristicName,
        characteristicValue: rollCharacteristic.value ?? 0,
        difficulty: 5,
        speaker: ChatMessage.getSpeaker({ token: getTokenFromActor(this), actor: this }),
      },
      { overwrite: false },
    ) as CharacteristicRollOptions;
  }

  /**
   * Open an ability roll dialog for reputation   */
  public async reputationRoll(): Promise<void> {
    await new AbilityRollDialogV2(this.createReputationFakeItem()).render(true);
  }

  /**
   * Do a reputation (ability) Roll
   */
  public async reputationRollImmediate(
    options: Omit<AbilityRollOptions, "naturalSkill"> = {},
  ): Promise<void> {
    const reputationItem = this.createReputationFakeItem();
    const speaker = ChatMessage.getSpeaker({ token: this.token ?? undefined, actor: this });

    const combinedOptions = foundry.utils.mergeObject(
      options,
      {
        naturalSkill: reputationItem.system.chance,
        modifiers: [],
        abilityName: reputationItem.name ?? undefined,
        abilityImg: reputationItem.img ?? undefined,
        speaker: speaker,
      },
      { overwrite: false },
    );

    await AbilityRoll.rollAndShow(combinedOptions);
  }

  private createReputationFakeItem(): PartialAbilityItem {
    const defaultItemIconSettings: any = game.settings?.get(systemId, "defaultItemIconSettings");
    const token = getTokenFromActor(this);
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);
    return {
      name: "Reputation",
      img: defaultItemIconSettings.reputation,
      system: {
        chance: this.system.background.reputation ?? 0,
      },
      ownership: { default: 0 },
      actingToken: token,
    } as const;
  }

  // TODO should use result: SpiritMagicSuccessLevelEnum
  public async drawMagicPoints(amount: number, result: AbilitySuccessLevelEnum): Promise<void> {
    if (result <= AbilitySuccessLevelEnum.Success) {
      assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);
      const newMp = (this.system.attributes.magicPoints.value || 0) - amount;
      await this.update(
        foundry.utils.expandObject({ "system.attributes.magicPoints.value": newMp }),
      );
      ui.notifications?.info(
        localize("RQG.Dialog.SpiritMagicRoll.SuccessfullyCastInfo", { amount: amount.toString() }),
      );
    }
  }

  /**
   * First prepare any derived data which is actor-specific and does not depend on Items or Active Effects
   */
  override prepareBaseData(): void {
    super.prepareBaseData();
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);
    // Set this here before Active effects to allow POW crystals to boost it.
    this.system.attributes.magicPoints.max = this.system.characteristics.power.value;
  }

  override prepareEmbeddedDocuments(): void {
    super.prepareEmbeddedDocuments();
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);

    const { con, siz, pow } = this.actorCharacteristics();
    this.system.attributes.hitPoints.max = RqgCalculations.hitPoints(con, siz, pow);

    this.items.forEach((item) =>
      ResponsibleItemClass.get(item.type)?.onActorPrepareEmbeddedEntities(item as RqgItem),
    );
  }

  /**
   * Apply any transformations to the Actor data which are caused by ActiveEffects.
   */
  override applyActiveEffects(): void {
    super.applyActiveEffects();
  }

  /**
   * Apply final transformations to the Actor data after all effects have been applied
   */
  override prepareDerivedData(): void {
    super.prepareDerivedData();
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);
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
        this.system.attributes.isCreature,
      ));

    attributes.encumbrance = {
      max: this.calcMaxEncumbrance(
        str,
        con,
        attributes.move?.[attributes.move?.currentLocomotion]?.carryingFactor,
      ),
      travel: this.calcTravelEncumbrance(this.items),
      equipped: this.calcEquippedEncumbrance(this.items),
    };

    const equippedMovementEncumbrancePenalty = Math.min(
      0,
      (attributes.encumbrance.max || 0) - (attributes.encumbrance.equipped || 0),
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
      attributes.encumbrance.max - attributes.encumbrance.travel,
    );
    attributes.move.travel = attributes.move.value + travelMovementEncumbrancePenalty;

    this.items.forEach((item) =>
      ResponsibleItemClass.get(item.type)?.onActorPrepareDerivedData(item as RqgItem),
    );

    attributes.dexStrikeRank = RqgCalculations.dexSR(dex);
    attributes.sizStrikeRank = RqgCalculations.sizSR(siz);
    attributes.damageBonus = RqgCalculations.damageBonus(str, siz);
    attributes.healingRate = RqgCalculations.healingRate(con);
    attributes.spiritCombatDamage = RqgCalculations.spiritCombatDamage(pow, cha);

    attributes.health = DamageCalculations.getCombinedActorHealth(this);
  }

  /**
   * Return the bodyType of an actor. Currently only "humanoid" or "other"
   */
  public getBodyType(): string {
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);
    const actorHitlocationRqids = this.items
      .filter((i) => isDocumentSubType<HitLocationItem>(i, ItemTypeEnum.HitLocation))
      .map((hl: HitLocationItem) => hl.flags?.rqg?.documentRqidFlags?.id ?? "");
    if (
      CONFIG.RQG.bodytypes.humanoid.length === actorHitlocationRqids.length &&
      CONFIG.RQG.bodytypes.humanoid.every((hitLocationRqid) =>
        actorHitlocationRqids.includes(hitLocationRqid),
      )
    ) {
      return "humanoid";
    } else {
      return "other";
    }
  }

  // POW experience is not awarded automatically on a successful roll.
  // It can only be gained through specific activities (see RQG rules p.417-418).
  public async checkExperience(
    characteristicName: string,
    result: AbilitySuccessLevelEnum | undefined,
  ): Promise<void> {
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);
    if (
      result != null &&
      result <= AbilitySuccessLevelEnum.Success &&
      characteristicName === "power"
    ) {
      ui.notifications?.info(localize("RQG.Actor.AwardExperience.PowExperienceInfo"), {
        permanent: true,
      });
    }
  }

  /**
   * Award a POW experience check if the actor doesn't already have one this session.
   */
  public async awardPowExperience(): Promise<void> {
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);
    if (!this.system.characteristics.power.hasExperience) {
      await this.update(
        foundry.utils.expandObject({ "system.characteristics.power.hasExperience": true }),
      );
      const msg = localize("RQG.Actor.AwardExperience.GainedExperienceInfo", {
        actorName: this.name,
        itemName: localizeCharacteristic("power"),
      });
      ui.notifications?.info(msg);
    }
  }

  /**
   * Apply damage to a hitLocation and this actor.
   * The HitLocation AP will be subtracted unless ignoreAP is true.
   * damageAmount is the amount of damage to apply, if parrying weapon has absorbed anything this should be the reduced amount.
   */
  public async applyDamage(
    damageAmount: number,
    hitLocationRollTotal: number,
    ignoreAP: boolean = false,
    applyToActorHP: boolean = true,
    damageType: DamageType,
    wasDamagedReducedByParry: boolean = false,
    attackSuccessLevel?: AbilitySuccessLevelEnum | undefined,
  ): Promise<void> {
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);
    const damagedHitLocation = this.items.find(
      (i) =>
        isDocumentSubType<HitLocationItem>(i, ItemTypeEnum.HitLocation) &&
        hitLocationRollTotal >= i.system.dieFrom &&
        hitLocationRollTotal <= i.system.dieTo,
    ) as HitLocationItem | undefined;
    assertDocumentSubType<HitLocationItem>(damagedHitLocation, ItemTypeEnum.HitLocation);

    const hitLocationAP = damagedHitLocation?.system.armorPoints ?? 0;
    const damageAfterAP = ignoreAP ? damageAmount : Math.max(0, damageAmount - hitLocationAP);
    if (damageAfterAP === 0) {
      if (wasDamagedReducedByParry) {
        ui.notifications?.info(
          "The attack strikes through the parrying weapon, but is stopped by the armor",
        );
      } else if (damageAmount > 0) {
        ui.notifications?.info("The attack bounces off the armor");
      }

      return;
    }
    const speaker = ChatMessage.getSpeaker({ actor: this, token: this.token ?? undefined });
    const { hitLocationUpdates, actorUpdates, notification, uselessLegs } =
      DamageCalculations.addWound(
        damageAfterAP,
        applyToActorHP,
        damagedHitLocation,
        this,
        speaker.alias!,
      );

    for (const update of uselessLegs) {
      const leg = this.items.get(update._id) as HitLocationItem | undefined;
      assertDocumentSubType<HitLocationItem>(leg, ItemTypeEnum.HitLocation);
      await leg.update(update);
    }

    if (hitLocationUpdates) {
      await damagedHitLocation.update(hitLocationUpdates);
    }
    if (actorUpdates) {
      await this.update(actorUpdates);
    }

    // Incapacitating Rule
    const incapacitatingText = // include crit / special check!
      damageType === "slash" &&
      (attackSuccessLevel ?? Infinity) <= AbilitySuccessLevelEnum.Special &&
      damageAfterAP >= (damagedHitLocation.system.hitPoints.max ?? 0)
        ? `<p>${localize("RQG.Item.HitLocation.IncapacitationRule", {
            damage: damageAfterAP.toString(),
          })}</p>`
        : "";

    // TODO should this be part of the attack chat message? Or should it still only be visible to attacker & defender?
    await ChatMessage.create({
      speaker: speaker,
      content:
        localize("RQG.Item.HitLocation.AddWoundChatContent", {
          actorName: this.name,
          hitLocationName: damagedHitLocation.name,
          notification: notification,
        }) + incapacitatingText,
      whisper: usersIdsThatOwnActor(damagedHitLocation!.parent),
    });

    await this.updateTokenEffectFromHealth();
  }

  /**
   * Calculate and set actor token effects ("shock", "unconscious""dead")
   * from what the actors health is.
   */
  public async updateTokenEffectFromHealth(): Promise<void> {
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);
    const health2Effect: Map<ActorHealthState, CONFIG.StatusEffect> = new Map([
      ["shock", this.findEffect("shock")],
      ["unconscious", this.findEffect("unconscious")],
      ["dead", this.findEffect("dead")],
    ]);

    const newEffect = health2Effect.get(this.system.attributes.health);

    for (const status of health2Effect.values()) {
      const actorHasEffectAlready = this.statuses.has(status?.id);
      if (newEffect?.id === status.id && !actorHasEffectAlready) {
        const asOverlay = status.id === "dead";
        // Turn on the new effect
        await this.toggleStatusEffect(status.id, {
          overlay: asOverlay,
          active: true,
        });
      } else if (newEffect?.id !== status.id && actorHasEffectAlready) {
        // This is not the effect we're applying, but it is on, so we need to turn it off
        await this.toggleStatusEffect(status.id, {
          overlay: false,
          active: false,
        });
      }
    }
  }

  private findEffect(health: ActorHealthState): CONFIG.StatusEffect {
    const effect = CONFIG.statusEffects.find((e) => e.id === health);
    requireValue(effect, `Required statusEffect ${health} is missing`); // TODO translate message
    return effect;
  }

  private calcMaxEncumbrance(
    str: number | undefined,
    con: number | undefined,
    carryingFactor: number | undefined,
  ): number {
    if (!str) {
      return 0;
    }
    return Math.round(Math.min(str, (str + (con ?? 0)) / 2) * (carryingFactor ?? 1));
  }

  private calcTravelEncumbrance(items: RqgActor["items"]): number {
    return Math.round(
      items.reduce((sum: number, item) => {
        if (
          isDocumentSubType<PhysicalItem>(item, physicalItemTypes) &&
          ["carried", "equipped"].includes(item.system.equippedStatus)
        ) {
          const enc = (item.system.quantity ?? 1) * (item.system.encumbrance ?? 0);
          return sum + enc;
        }
        return sum;
      }, 0),
    );
  }

  private calcEquippedEncumbrance(items: RqgActor["items"]): number {
    return Math.round(
      items.reduce((sum, item) => {
        if (
          isDocumentSubType<PhysicalItem>(item, physicalItemTypes) &&
          item.system.equippedStatus === "equipped"
        ) {
          const quantity = item.system.quantity ?? 1;
          const encumbrance = item.system.encumbrance ?? 0;
          return sum + quantity * encumbrance;
        }
        return sum;
      }, 0),
    );
  }

  // Entity-specific actions that should occur when the Entity is first created
  protected override _onCreate(
    data: Actor.CreateData,
    options: Actor.Database.OnCreateOperation,
    userId: string,
  ) {
    super._onCreate(data, options, userId);

    if (
      !this.prototypeToken.actorLink &&
      isDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character)
    ) {
      initializeAllCharacteristics(this).then(void this.updateDexBasedSkills());
    } else {
      void this.updateDexBasedSkills();
    }
  }

  private async updateDexBasedSkills(): Promise<void> {
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);
    const dodgeItem = this.getBestEmbeddedDocumentByRqid(RQG_CONFIG.skillRqid.dodge);
    assertDocumentSubType<SkillItem>(dodgeItem, ItemTypeEnum.Skill);
    const dodgeBaseChance = Skill.dodgeBaseChance(this.system.characteristics.dexterity.value ?? 0);
    if (dodgeItem && dodgeItem.system.baseChance !== dodgeBaseChance) {
      await dodgeItem.update({ system: { baseChance: dodgeBaseChance } });
    }

    const jumpItem = this.getBestEmbeddedDocumentByRqid(RQG_CONFIG.skillRqid.jump);
    assertDocumentSubType<SkillItem>(jumpItem, ItemTypeEnum.Skill);
    const jumpBaseChance = Skill.jumpBaseChance(this.system.characteristics.dexterity.value ?? 0);
    if (jumpItem && jumpItem.system.baseChance !== jumpBaseChance) {
      await jumpItem.update({ system: { baseChance: jumpBaseChance } });
    }
  }

  protected override _onCreateDescendantDocuments(
    ...args: Actor.OnCreateDescendantDocumentsArgs
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [parent, collection, documents, data, options, userId] = args;
    if (
      isDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character) &&
      collection === "items" &&
      game.user?.id === userId
    ) {
      documents.forEach((d) => {
        ResponsibleItemClass.get(d.type)
          ?.onEmbedItem(this, d as RqgItem, options, userId)
          .then((updateData) => {
            if (!foundry.utils.isEmpty(updateData)) {
              this.updateEmbeddedDocuments("Item", [updateData]); // TODO move the actual update outside the loop (map instead of forEach)
            }
          });
      });
    }

    super._onCreateDescendantDocuments(...args);
  }

  protected override _onDeleteDescendantDocuments(
    ...args: Actor.OnDeleteDescendantDocumentsArgs
  ): void {
    const [parent, collection, documents, , options, userId] = args;
    if (
      isDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character) &&
      parent === this &&
      collection === "items" &&
      game.user?.id === userId
    ) {
      documents.forEach((d) => {
        const updateData = ResponsibleItemClass.get(d.type)?.onDeleteItem(
          this,
          d as RqgItem,
          options,
          userId,
        );
        if (updateData?.length) {
          this.updateEmbeddedDocuments("Item", updateData);
        }
      });
    }
    super._onDeleteDescendantDocuments(...args);
  }

  // Update the baseChance for Dodge & Jump skills that depend on actor DEX
  override async _preUpdate(
    changes: Actor.UpdateData,
    options: Actor.Database.PreUpdateOptions,
    user: User.Implementation,
  ): Promise<boolean | void> {
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);

    const actorDex =
      (changes as DeepPartial<CharacterDataSource>)?.system?.characteristics?.dexterity?.value ??
      this.system.characteristics.dexterity.value;
    if (actorDex != null) {
      const dodgeSkill = this.getBestEmbeddedDocumentByRqid(RQG_CONFIG.skillRqid.dodge);
      if (dodgeSkill && dodgeSkill._source.system.baseChance !== Skill.dodgeBaseChance(actorDex)) {
        await dodgeSkill.update({ system: { baseChance: Skill.dodgeBaseChance(actorDex) } });
      }

      const jumpSkill = this.getBestEmbeddedDocumentByRqid(RQG_CONFIG.skillRqid.jump);
      if (jumpSkill && jumpSkill._source.system.baseChance !== Skill.jumpBaseChance(actorDex)) {
        await jumpSkill.update({ system: { baseChance: Skill.jumpBaseChance(actorDex) } });
      }
    }
    return super._preUpdate(changes, options, user);
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
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);
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
}

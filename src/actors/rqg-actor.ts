import { ActorTypeEnum, type CharacterActor } from "../data-model/actor-data/rqg-actor-data";
import { ItemTypeEnum, type PhysicalItem } from "@item-model/item-types.ts";
import { RqgActorSheet } from "./rqg-actor-sheet";
import { RqgActorSheetV2 } from "./rqg-actor-sheet-v2";
import { DamageCalculations } from "../items/hit-location-item/hit-location-damage-calculations";
import {
  assertDocumentSubType,
  getSpeakerDisplayName,
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
import { Rqid } from "../system/api/rqid-api";
import type { RqidString } from "../system/api/rqid-api";
import { AbilitySuccessLevelEnum } from "../rolls/ability-roll/ability-roll.defs";
import type { CharacteristicRollOptions } from "../rolls/characteristic-roll/characteristic-roll.types";
import { CharacteristicRoll } from "../rolls/characteristic-roll/characteristic-roll";
import type { Characteristic, Characteristics } from "../data-model/actor-data/characteristics";
import { CharacteristicRollDialogV2 } from "../applications/characteristic-roll-dialog/characteristic-roll-dialog-v2";
import type { AbilityRollOptions } from "../rolls/ability-roll/ability-roll.types";
import { AbilityRollDialogV2 } from "../applications/ability-roll-dialog/ability-roll-dialog-v2";
import { AbilityRoll } from "../rolls/ability-roll/ability-roll";
import type { PartialAbilityItem } from "../applications/ability-roll-dialog/ability-roll-dialog-data.types.ts";
import type { ActorHealthState } from "../data-model/actor-data/attributes";
import type { DamageType } from "@item-model/weapon-enums.ts";
import { dodgeBaseChance, jumpBaseChance } from "../items/skill-item/skill-formulas";
import { RqgItem } from "@items/rqg-item.ts";
import { getConfigStatusEffects, getSpeakerCompat } from "../system/fvtt-type-compat";

import type { HitLocationItem } from "@item-model/hit-location-data-model.ts";
import { CharacterDataModel } from "../data-model/actor-data/character-data-model";
import { applyEquippedEncumbrancePenalty } from "../data-model/actor-data/derived-character-values";

import type { DeepPartial } from "fvtt-types/utils";
import { physicalItemTypes } from "@item-model/i-physical-item.ts";
import type { SkillItem } from "@item-model/skill-data-model.ts";
import {
  handleActorOnCreateDescendantDocuments,
  handleActorOnDeleteDescendantDocumentsUpdates,
  handleActorPrepareDerivedData,
  handleActorPrepareEmbeddedDocuments,
} from "@items/item-lifecycle-strategy.ts";

import Actor = foundry.documents.Actor;

type HealthTransitionSnapshot = {
  health: ActorHealthState;
  hitPoints: number;
  magicPoints: number;
};

export class RqgActor extends Actor {
  private _healthBeforeActorUpdate?: HealthTransitionSnapshot;
  private _healthBeforeItemUpdate?: HealthTransitionSnapshot;

  static init() {
    CONFIG.Actor.documentClass = RqgActor;
    CONFIG.Actor.dataModels["character"] = CharacterDataModel;

    const Actors = foundry.documents.collections.Actors;

    Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);

    // AppV1 sheet — kept as non-default alternative; will be removed in a future release
    Actors.registerSheet(systemId, RqgActorSheet, {
      types: [ActorTypeEnum.Character],
      label: "RQG.SheetName.Actor.Character",
      makeDefault: false,
    });

    // AppV2 sheet — default
    Actors.registerSheet(systemId, RqgActorSheetV2 as any, {
      types: [ActorTypeEnum.Character],
      label: "RQG.SheetName.Actor.CharacterV2",
      makeDefault: true,
    });
  }

  /**
   * Only handles embedded Items
   */
  public getEmbeddedDocumentsByRqid(rqid: RqidString | undefined): RqgItem[] {
    if (!rqid) {
      return [];
    }
    return this.items.filter(
      (i) => i.getFlag(systemId, "documentRqidFlags")?.id === rqid,
    ) as RqgItem[];
  }

  public getBestEmbeddedDocumentByRqid(rqid: RqidString | undefined): RqgItem | undefined {
    return this.getEmbeddedDocumentsByRqid(rqid).sort(Rqid.compareRqidPrio)[0];
  }

  /**
   * Get all embedded items whose rqid matches the given regex pattern.
   */
  public getEmbeddedDocumentsByRqidRegex(rqidPattern: string): RqgItem[] {
    let regex: RegExp;
    try {
      regex = new RegExp(rqidPattern);
    } catch {
      const msg = localize("RQG.RQGSystem.Rqid.InvalidRegexPattern", {
        rqidPattern,
      });
      ui.notifications?.warn(msg, { console: false });
      console.warn(`RQG | ${msg}`);
      return [];
    }
    return this.items.filter((i) =>
      regex.test(i.getFlag(systemId, "documentRqidFlags")?.id ?? ""),
    ) as RqgItem[];
  }

  public async characteristicRoll(
    characteristicName: keyof Characteristics,
    token?: TokenDocument | null,
  ): Promise<void> {
    await new CharacteristicRollDialogV2(this, characteristicName, token).render({ force: true });
  }

  /**
   * Do a characteristic roll and notify the user if POW experience rules apply.
   */
  public async characteristicRollImmediate(
    characteristicName: keyof Characteristics,
    token?: TokenDocument | null,
    options: Omit<CharacteristicRollOptions, "characteristicValue" | "characteristicName"> = {},
  ): Promise<void> {
    const rollOptions = this.getCharacteristicRollDefaults(characteristicName, token, options);
    const characteristicRoll = await CharacteristicRoll.rollAndShow(rollOptions);
    await this.checkExperience(rollOptions.characteristicName, characteristicRoll.successLevel);
  }

  private getCharacteristicRollDefaults(
    characteristicName: keyof Characteristics,
    token: TokenDocument | null | undefined,
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
        speaker: getSpeakerCompat({ actor: this, token }),
      },
      { overwrite: false },
    ) as CharacteristicRollOptions;
  }

  /**
   * Open an ability roll dialog for reputation   */
  public async reputationRoll(token?: TokenDocument | null): Promise<void> {
    await new AbilityRollDialogV2(this.createReputationFakeItem(token), token).render({
      force: true,
    });
  }

  /**
   * Do a reputation (ability) Roll
   */
  public async reputationRollImmediate(
    token?: TokenDocument | null,
    options: Omit<AbilityRollOptions, "naturalSkill"> = {},
  ): Promise<void> {
    const reputationItem = this.createReputationFakeItem(token);
    const speaker = getSpeakerCompat({ actor: this, token });

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

  private createReputationFakeItem(token?: TokenDocument | null): PartialAbilityItem {
    const defaultItemIconSettings: any = game.settings?.get(systemId, "defaultItemIconSettings");
    const actingToken =
      token ?? (getTokenFromActor(this) as PartialAbilityItem["actingToken"] | undefined);
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);
    return {
      name: "Reputation",
      img: defaultItemIconSettings.reputation,
      parent: this,
      system: {
        chance: this.system.background.reputation ?? 0,
      },
      ownership: { default: 0 },
      actingToken: actingToken ?? undefined,
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
   * Prepare embedded documents (items, effects).
   * Note: hitPoints.max is now set in CharacterDataModel.prepareDerivedData() with support for AE effects
   */
  override prepareEmbeddedDocuments(): void {
    super.prepareEmbeddedDocuments();
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);

    this.items.forEach((item) => handleActorPrepareEmbeddedDocuments(item as RqgItem));
  }

  /**
   * Apply final transformations to the Actor data after all effects have been applied
   */
  override prepareDerivedData(): void {
    super.prepareDerivedData();
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);
    const attributes = this.system.attributes;
    const { str, con } = this.actorCharacteristics();

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

    // Apply encumbrance penalty to the composed skill modifiers (base + effects from DataModel)
    this.system.skillCategoryModifiers = applyEquippedEncumbrancePenalty(
      this.system.skillCategoryModifiers,
      equippedMovementEncumbrancePenalty,
    );

    attributes.move.value =
      this.system.attributes.move?.[attributes.move?.currentLocomotion]?.value || 0;

    attributes.move.equipped = attributes.move.value + equippedMovementEncumbrancePenalty;

    const travelMovementEncumbrancePenalty = Math.min(
      0,
      attributes.encumbrance.max - attributes.encumbrance.travel,
    );
    attributes.move.travel = attributes.move.value + travelMovementEncumbrancePenalty;

    this.items.forEach((item) => handleActorPrepareDerivedData(item as RqgItem));

    attributes.health = DamageCalculations.getCombinedActorHealth(this);
  }

  /**
   * Return the bodyType of an actor. Currently only "humanoid" or "other"
   */
  public getBodyType(): string {
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);
    const actorHitlocationRqids = this.items
      .filter((i) => isDocumentSubType<HitLocationItem>(i, ItemTypeEnum.HitLocation))
      .map((hl: HitLocationItem) => hl.flags?.rqg?.documentRqidFlags?.id ?? "") as string[];
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
   * Award a POW experience check if the actor doesn't already have one.
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
    const speaker = getSpeakerCompat({ actor: this, token: this.token ?? undefined });
    const { hitLocationUpdates, actorUpdates, notification, uselessLegs } =
      DamageCalculations.addWound(
        damageAfterAP,
        applyToActorHP,
        damagedHitLocation,
        this as CharacterActor,
        speaker,
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
      const statusId = status?.id;
      if (!statusId) {
        continue;
      }

      // Check if the effect actually exists on the actor
      const effectExists = this.effects.some((e) => e.statuses.has(statusId));

      if (newEffect?.id === statusId && !effectExists) {
        const asOverlay = statusId === "dead";
        // Turn on the new effect
        await this.toggleStatusEffect(statusId, {
          overlay: asOverlay,
          active: true,
        });
      } else if (newEffect?.id !== statusId && effectExists) {
        // This is not the effect we're applying, but it is on, so we need to turn it off
        try {
          await this.toggleStatusEffect(statusId, {
            overlay: false,
            active: false,
          });
        } catch (error) {
          // In v14, the effect might have been deleted already; silently ignore
          console.warn(`Failed to toggle off status effect ${statusId}:`, error);
        }
      }
    }
  }

  private getHealthTransitionSnapshot(): HealthTransitionSnapshot {
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);
    return {
      health: this.system.attributes.health,
      hitPoints: this.system.attributes.hitPoints.value ?? 0,
      magicPoints: this.system.attributes.magicPoints.value ?? 0,
    };
  }

  private isHealthAffectingActorUpdate(changes: Actor.UpdateData): boolean {
    return (
      foundry.utils.hasProperty(changes, "system.attributes.hitPoints.value") ||
      foundry.utils.hasProperty(changes, "system.attributes.magicPoints.value") ||
      foundry.utils.hasProperty(changes, "system.attributes.health")
    );
  }

  private async handleHealthTransition(
    previous: HealthTransitionSnapshot | undefined,
    userId: string,
  ): Promise<void> {
    if (game.user?.id !== userId || previous == null) {
      return;
    }

    const next = this.getHealthTransitionSnapshot();
    const previousHealth = previous.health;
    const nextHealth = this.system.attributes.health;
    if (previousHealth === nextHealth) {
      return;
    }

    await this.updateTokenEffectFromHealth();

    const speaker = getSpeakerCompat({ actor: this, token: this.token ?? undefined });
    const speakerName = getSpeakerDisplayName(speaker) || this.name;
    let message: string | undefined;

    if (nextHealth === "dead" && previousHealth !== "dead") {
      message = localize("RQG.Actor.Health.Transition.DeadFromHitPoints", {
        actorName: speakerName,
      }) as string;
    } else if (nextHealth === "unconscious" && previousHealth !== "unconscious") {
      const mpDroppedToZero = previous.magicPoints > 0 && next.magicPoints <= 0;
      const hpDroppedToZero = previous.hitPoints > 0 && next.hitPoints <= 0;

      message =
        mpDroppedToZero && !hpDroppedToZero
          ? (localize("RQG.Actor.Health.Transition.UnconsciousFromMagicPoints", {
              actorName: speakerName,
            }) as string)
          : (localize("RQG.Actor.Health.Transition.UnconsciousFromHitPoints", {
              actorName: speakerName,
            }) as string);
    }

    if (!message) {
      return;
    }

    await ChatMessage.create({
      speaker,
      content: message,
      whisper: usersIdsThatOwnActor(this),
    });
  }

  private findEffect(health: ActorHealthState): CONFIG.StatusEffect {
    const effect = getConfigStatusEffects()[health];
    requireValue(effect, `Required statusEffect ${health} is missing`); // TODO translate message
    return effect;
  }

  private calcMaxEncumbrance(
    str: number | null | undefined,
    con: number | null | undefined,
    carryingFactor: number | null | undefined,
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
      void initializeAllCharacteristics(this as CharacterActor).then(() =>
        this.updateDexBasedSkills(),
      );
    } else {
      void this.updateDexBasedSkills();
    }
  }

  private async updateDexBasedSkills(): Promise<void> {
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);
    const dodgeItem = this.getBestEmbeddedDocumentByRqid(RQG_CONFIG.skillRqid.dodge);
    assertDocumentSubType<SkillItem>(dodgeItem, ItemTypeEnum.Skill);
    const dodgeBase = dodgeBaseChance(this.system.characteristics.dexterity.value ?? 0);
    if (dodgeItem && dodgeItem.system.baseChance !== dodgeBase) {
      await dodgeItem.update({ system: { baseChance: dodgeBase } });
    }

    const jumpItem = this.getBestEmbeddedDocumentByRqid(RQG_CONFIG.skillRqid.jump);
    assertDocumentSubType<SkillItem>(jumpItem, ItemTypeEnum.Skill);
    const jumpBase = jumpBaseChance(this.system.characteristics.dexterity.value ?? 0);
    if (jumpItem && jumpItem.system.baseChance !== jumpBase) {
      await jumpItem.update({ system: { baseChance: jumpBase } });
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
      const createdItemIds = documents.map((d) => (d as RqgItem).id);
      const updatePromises = documents.map((d) =>
        handleActorOnCreateDescendantDocuments(this, d as RqgItem, options, userId).catch(
          (error: unknown) => {
            console.error("RQG | Failed to process embedded item create lifecycle", {
              actorId: this.id,
              actorName: this.name,
              itemId: (d as RqgItem).id,
              itemIds: createdItemIds,
              error,
            });
            return {};
          },
        ),
      );

      void Promise.all(updatePromises).then((results) => {
        const updateData = results.filter((result) => !foundry.utils.isEmpty(result));
        if (updateData.length > 0) {
          void this.updateEmbeddedDocuments("Item", updateData);
        }
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
        const updateData = handleActorOnDeleteDescendantDocumentsUpdates(
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
    user: User,
  ): Promise<boolean | void> {
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);

    this._healthBeforeActorUpdate = this.isHealthAffectingActorUpdate(changes)
      ? this.getHealthTransitionSnapshot()
      : undefined;

    const actorDex =
      (changes as DeepPartial<CharacterActor>)?.system?.characteristics?.dexterity?.value ??
      this.system.characteristics.dexterity.value;
    if (actorDex != null) {
      const dodgeSkill = this.getBestEmbeddedDocumentByRqid(RQG_CONFIG.skillRqid.dodge);
      if (dodgeSkill && dodgeSkill._source.system.baseChance !== dodgeBaseChance(actorDex)) {
        await dodgeSkill.update({
          system: { baseChance: dodgeBaseChance(actorDex) },
        });
      }

      const jumpSkill = this.getBestEmbeddedDocumentByRqid(RQG_CONFIG.skillRqid.jump);
      if (jumpSkill && jumpSkill._source.system.baseChance !== jumpBaseChance(actorDex)) {
        await jumpSkill.update({ system: { baseChance: jumpBaseChance(actorDex) } });
      }
    }
    // @ts-expect-error TEMP(v14-types) runtime accepts User with nullable id
    return super._preUpdate(changes, options, user);
  }

  protected override _preUpdateDescendantDocuments(
    ...args: Parameters<Actor["_preUpdateDescendantDocuments"]>
  ): void {
    const [parent, collection] = args;
    this._healthBeforeItemUpdate =
      parent === this && collection === "items" ? this.getHealthTransitionSnapshot() : undefined;
    super._preUpdateDescendantDocuments(...args);
  }

  protected override _onUpdate(...args: Parameters<Actor["_onUpdate"]>): void {
    const [, , userId] = args;
    const previousHealth = this._healthBeforeActorUpdate;
    this._healthBeforeActorUpdate = undefined;

    super._onUpdate(...args);

    if (previousHealth != null) {
      void this.handleHealthTransition(previousHealth, userId);
    }
  }

  protected override _onUpdateDescendantDocuments(
    ...args: Parameters<Actor["_onUpdateDescendantDocuments"]>
  ): void {
    const [parent, collection, , , , userId] = args;
    const previousHealth = this._healthBeforeItemUpdate;
    this._healthBeforeItemUpdate = undefined;

    super._onUpdateDescendantDocuments(...args);

    if (parent === this && collection === "items" && previousHealth != null) {
      void this.handleHealthTransition(previousHealth, userId);
    }
  }

  // Return shorthand access to actor data & characteristics
  private actorCharacteristics(): {
    str: number | null;
    con: number | null;
    siz: number | null;
    dex: number | null;
    int: number | null;
    pow: number | null;
    cha: number | null;
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

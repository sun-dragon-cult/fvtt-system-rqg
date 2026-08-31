import { ActorTypeEnum, type CharacterActor } from "../data-model/actor-data/rqg-actor-data";
import { ItemTypeEnum, type PhysicalItem } from "@item-model/item-types.ts";
import { RqgActorSheet } from "./rqg-actor-sheet";
import { RqgActorSheetV2 } from "./rqg-actor-sheet-v2";
import { DamageCalculations } from "../items/hit-location-item/hit-location-damage-calculations";
import { HealingCalculations } from "../items/hit-location-item/hit-location-healing-calculations";
import {
  assertDocumentSubType,
  getDocumentFromUuid,
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
import { getDefaultItemIconSettings } from "../system/settings/default-item-icons";
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
import { RqgCalculations } from "../system/rqg-calculations";
import { getConfigStatusEffects, getSpeakerCompat } from "../system/fvtt-type-compat";
import {
  type MagicPointSourceSelection,
  SELF_MAGIC_POINT_SOURCE,
  spendMagicPoints,
} from "../system/magic-point-source";

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
import { ActorTemplatePicker } from "../applications/actor-template-picker/actor-template-picker";
import { templatePaths } from "../system/load-handlebars-templates";
import { cloneActorFromTemplate } from "../system/api/actor-template-api";

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

    // So the template picker (#778/#636) can find flagged actors via the index alone.
    CONFIG.Actor.compendiumIndexFields.push("flags.rqg.tags");

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

  /** Adds a "Start from: Blank / Template" field to the native Create Actor dialog (#778/#636). */
  static override async createDialog<
    Options extends Actor.CreateDialogOptions | undefined = undefined,
  >(
    data?: Actor.CreateDialogData,
    createOptions?: Actor.Database.CreateDocumentsOperation,
    options?: Options,
  ): Promise<Actor.CreateDialogReturn<Options>> {
    const content = await foundry.applications.handlebars.renderTemplate(
      templatePaths.actorCreateDialogContent,
      {},
    );

    const createBlank = async (
      _event: Event,
      button: HTMLButtonElement,
    ): Promise<RqgActor | undefined> => {
      const fd = new foundry.applications.ux.FormDataExtended(button.form as HTMLFormElement);
      const submitted = foundry.utils.mergeObject(data ?? {}, fd.object, { inplace: false }) as {
        name?: string;
        type?: string;
        folder?: string;
        startFrom?: string;
      };
      delete submitted.startFrom;
      if (!submitted.folder) {
        delete submitted.folder;
      }
      if (!submitted.name?.trim()) {
        submitted.name = this.defaultName({
          type: submitted.type as any,
          parent: createOptions?.parent,
          pack: createOptions?.pack,
        });
      }
      const doc = (await this.create(submitted as Actor.CreateData, {
        renderSheet: false,
        ...createOptions,
      })) as RqgActor | undefined;
      void doc?.sheet?.render(true);
      return doc;
    };

    const mergedOptions = foundry.utils.mergeObject(
      options ?? {},
      {
        context: { content },
        ok: {
          callback: async (
            event: Event,
            button: HTMLButtonElement,
            dialog: foundry.applications.api.DialogV2.Any,
          ) => {
            const fd = new foundry.applications.ux.FormDataExtended(button.form as HTMLFormElement);
            const submitted = foundry.utils.mergeObject(data ?? {}, fd.object, {
              inplace: false,
            }) as { name?: string; folder?: string; startFrom?: string };

            if (submitted.startFrom !== "template") {
              return createBlank(event, button);
            }

            void dialog.close();
            const templateUuid = await ActorTemplatePicker.pick();
            if (!templateUuid) {
              // The create dialog is already closed - canceling the picker aborts creation entirely.
              return undefined;
            }
            const templateActor = await getDocumentFromUuid<RqgActor>(templateUuid);
            if (!templateActor) {
              const msg = `RQG | Couldn't find the chosen template actor [${templateUuid}]`;
              ui.notifications?.error(msg, { console: false });
              console.error(msg);
              return createBlank(event, button);
            }

            const cloned = await cloneActorFromTemplate(templateActor, {
              name: submitted.name?.trim() || templateActor.name,
              folder: submitted.folder || undefined,
            });
            void cloned?.sheet?.render(true);
            return cloned;
          },
        },
      },
      { inplace: false },
    ) as unknown as Options;

    return super.createDialog(data, createOptions, mergedOptions);
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
      Characteristic | undefined;

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
    const actingToken =
      token ?? (getTokenFromActor(this) as PartialAbilityItem["actingToken"] | undefined);
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);
    return {
      name: "Reputation",
      img: getDefaultItemIconSettings().reputation,
      parent: this,
      system: {
        chance: this.system.background.reputation ?? 0,
      },
      ownership: { default: 0 },
      actingToken: actingToken ?? undefined,
    } as const;
  }

  // TODO should use result: SpiritMagicSuccessLevelEnum
  public async drawMagicPoints(
    amount: number,
    result: AbilitySuccessLevelEnum,
    source: MagicPointSourceSelection = SELF_MAGIC_POINT_SOURCE,
    avoidRelease: boolean = false,
  ): Promise<void> {
    if (result <= AbilitySuccessLevelEnum.Success) {
      assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);
      await spendMagicPoints(this, amount, source, avoidRelease);
      ui.notifications?.info(
        localize("RQG.Dialog.SpiritMagicRoll.SuccessfullyCastInfo", { amount: amount.toString() }),
      );
    }
  }

  private _writeQueues = new Map<string, Promise<unknown>>();

  /**
   * Serializes read-then-write operations on one of this actor's resource fields, keyed by
   * `queueKey` (#1028 review finding: a passive recovery catch-up and an explicit spend/damage/
   * heal action both read the current value, compute an absolute new one, then write it - if both
   * are in flight at once, whichever write lands last silently clobbers the other). Queuing every
   * such operation through here means each one only reads `this.system` once its turn arrives,
   * after any prior queued write *for that key* has both been sent and locally applied - never
   * against a stale pre-write snapshot. Different keys (e.g. "magicPoints" vs "hitPoints") queue
   * independently and don't block each other. See `serializeMagicPointsWrite`/
   * `serializeHitPointsWrite` for the two resources currently using this.
   */
  private async serializeWrite<T>(queueKey: string, operation: () => Promise<T>): Promise<T> {
    const queue = this._writeQueues.get(queueKey) ?? Promise.resolve();
    const run = queue.then(operation, operation);
    this._writeQueues.set(
      queueKey,
      run.catch(() => undefined),
    );
    return run;
  }

  /** `serializeWrite` for `magicPoints.value` - used by `catchUpMagicPointRecovery` and by the
   *  self/ally/bound-spirit draws in magic-point-source.ts. */
  public async serializeMagicPointsWrite<T>(operation: () => Promise<T>): Promise<T> {
    return this.serializeWrite("magicPoints", operation);
  }

  /** `serializeWrite` for `hitPoints.value` - used by `catchUpNaturalHealing` (#436) and should
   *  also guard damage/heal application (`applyDamageToActorTotalHp`, `healWound`'s actor-hp
   *  bump) against racing it, the same way magicPoints' draws already guard against catch-up. */
  public async serializeHitPointsWrite<T>(operation: () => Promise<T>): Promise<T> {
    return this.serializeWrite("hitPoints", operation);
  }

  /**
   * Passive Magic Point recovery catch-up (#1028): diffs the actor's recovery checkpoint against
   * the current `game.time.worldTime` and, if any whole points have accrued since, persists the
   * recovered points (clamped to `magicPoints.max`, which already reflects POW + any genuine
   * effects - see #1028 discussion) and the advanced checkpoint in a single write. A no-op (no
   * write) when nothing has changed, so it's safe to call on every sheet render. Only applies to
   * player-owned actors: a GM-only-owned NPC could otherwise silently recover between the moment a
   * GM preps it and whenever the party actually reaches it in-game, changing state the GM set up
   * on purpose without them noticing. A GM can turn this off entirely with the
   * `magicPointRecoveryEnabled` world setting (#1035) for tables that want to gate recovery on
   * resting by hand instead.
   */
  public async catchUpMagicPointRecovery(): Promise<void> {
    if (!isDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character) || !this.hasPlayerOwner) {
      return;
    }
    if ((game.settings?.get(systemId, "magicPointRecoveryEnabled") ?? true) === false) {
      return;
    }
    const currentWorldTime = game.time?.worldTime;
    if (currentWorldTime == null) {
      return;
    }
    await this.serializeMagicPointsWrite(async () => {
      const attributes = this.system.attributes;
      if (!attributes.magicPoints) {
        return;
      }
      const settledWorldTime = attributes.magicPointRecoverySettledWorldTime;
      const { pointsRecovered, newSettledWorldTime } = RqgCalculations.magicPointRecoveryCatchUp(
        settledWorldTime,
        currentWorldTime,
        attributes.magicPoints.max,
        attributes.magicPointRecoveryRateFactor,
      );
      if (pointsRecovered === 0 && newSettledWorldTime === settledWorldTime) {
        return;
      }
      const newValue = Math.min(
        (attributes.magicPoints.value ?? 0) + pointsRecovered,
        attributes.magicPoints.max ?? 0,
      );
      await this.update(
        foundry.utils.expandObject({
          "system.attributes.magicPoints.value": newValue,
          "system.attributes.magicPointRecoverySettledWorldTime": newSettledWorldTime,
        }),
      );
    });
  }

  /**
   * Passive natural Hit Point healing catch-up (#436, following #1028's pattern): diffs the
   * actor's healing checkpoint against the current `game.time.worldTime` and, for each whole week
   * that has elapsed, applies `healingRate` points to every wounded hit location (Core p.148-149:
   * healing is per hit location, not a single pooled value - spread evenly among that location's
   * wounds, remainder to the lightest one; a severed/useless location's hit points still heal, but
   * its function is never restored by natural healing - see HealingCalculations.
   * healLocationNaturally). A no-op (no write) when nothing has changed, so it's safe to call on
   * every sheet render. Doesn't attempt to detect whether the character was actually resting
   * (Core p.149 requires it for natural healing to apply) - left to the GM's judgement, same as
   * every other narrow RAW edge case this codebase doesn't build UI/logic around. Only applies to
   * player-owned actors: a GM-only-owned NPC staged for a future scene could otherwise heal itself
   * in the background while the party takes their time getting there, changing state the GM set up
   * on purpose without them noticing. A GM can turn this off entirely with the
   * `naturalHealingEnabled` world setting (#1035) for tables that want to gate healing on resting
   * by hand instead.
   */
  public async catchUpNaturalHealing(): Promise<void> {
    if (!isDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character) || !this.hasPlayerOwner) {
      return;
    }
    if ((game.settings?.get(systemId, "naturalHealingEnabled") ?? true) === false) {
      return;
    }
    const currentWorldTime = game.time?.worldTime;
    if (currentWorldTime == null) {
      return;
    }
    await this.serializeHitPointsWrite(async () => {
      const attributes = this.system.attributes;
      if (!attributes.hitPoints) {
        return;
      }
      const settledWorldTime = attributes.healingSettledWorldTime;
      const { weeksElapsed, newSettledWorldTime } = RqgCalculations.healingWeeksElapsed(
        settledWorldTime,
        currentWorldTime,
      );
      if (weeksElapsed === 0 && newSettledWorldTime === settledWorldTime) {
        return;
      }
      const weeklyHealPoints = weeksElapsed * (attributes.healingRate ?? 0);
      if (weeklyHealPoints > 0) {
        const woundedLocations = this.items.filter(
          (item) =>
            isDocumentSubType<HitLocationItem>(item, ItemTypeEnum.HitLocation) &&
            item.system.wounds.length > 0,
        ) as HitLocationItem[];
        for (const hitLocation of woundedLocations) {
          const { hitLocationUpdates, actorUpdates, usefulLegs } =
            HealingCalculations.healLocationNaturally(weeklyHealPoints, hitLocation, this);
          if (hitLocationUpdates.system) {
            await hitLocation.update(hitLocationUpdates as any);
          }
          if (actorUpdates.system) {
            // Carry the final checkpoint on every per-location write, not just the trailing one
            // below: _preUpdate's settleHealingCheckpoint treats any hitPoints.value change with
            // no checkpoint field as an unrelated edit and stamps it to "now", which would
            // silently strand the wrong checkpoint (discarding the carried-forward partial-week
            // remainder) if a later location's write in this loop throws.
            foundry.utils.setProperty(
              actorUpdates,
              "system.attributes.healingSettledWorldTime",
              newSettledWorldTime,
            );
            await this.update(actorUpdates as any);
          }
          for (const usefulLeg of usefulLegs) {
            if (usefulLeg?._id != null) {
              await this.items.get(usefulLeg._id)?.update(usefulLeg as any);
            }
          }
        }
      }
      await this.update(
        foundry.utils.expandObject({
          "system.attributes.healingSettledWorldTime": newSettledWorldTime,
        }),
      );
    });
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
   * Return the bodyType of an actor. Currently "humanoid", "quadruped", or "other"
   */
  public getBodyType(): string {
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);
    const actorHitlocationRqids = this.items
      .filter((i) => isDocumentSubType<HitLocationItem>(i, ItemTypeEnum.HitLocation))
      .map((hl: HitLocationItem) => hl.flags?.rqg?.documentRqidFlags?.id ?? "") as string[];

    const matchesBodytype = (bodytypeRqids: string[]): boolean =>
      bodytypeRqids.length === actorHitlocationRqids.length &&
      bodytypeRqids.every((hitLocationRqid) => actorHitlocationRqids.includes(hitLocationRqid));

    if (matchesBodytype(CONFIG.RQG.bodytypes.humanoid)) {
      return "humanoid";
    } else if (matchesBodytype(CONFIG.RQG.bodytypes.quadruped)) {
      return "quadruped";
    } else {
      return "other";
    }
  }

  // POW experience is not awarded automatically on a successful roll.
  // It can only be gained through specific activities (see RQG rules p.417-418).
  public async checkExperience(
    characteristicName: string,
    result: AbilitySuccessLevelEnum | undefined,
    chance?: number,
  ): Promise<void> {
    assertDocumentSubType<CharacterActor>(this, ActorTypeEnum.Character);
    if (
      result != null &&
      result <= AbilitySuccessLevelEnum.Success &&
      characteristicName === "power" &&
      (chance == null || chance < 95) // a roll made at 95%+ is too easy to count as stress
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

  private isHealthAffectingActorUpdate(
    changes: Actor.UpdateData,
    changesMagicPointsValue: boolean,
    changesHitPointsValue: boolean,
  ): boolean {
    return (
      changesHitPointsValue ||
      changesMagicPointsValue ||
      foundry.utils.hasProperty(changes, "system.attributes.health")
    );
  }

  /**
   * Any write to magicPoints.value that isn't catchUpMagicPointRecovery's own (#1028 follow-up) -
   * a manual sheet edit, a spend, a future drain effect, anything - needs to settle the recovery
   * checkpoint to *now* too. Otherwise the checkpoint stays wherever it last was (possibly stale,
   * from well before this change), and the next catch-up attributes however much dead time sits
   * between that stale checkpoint and now as recovered points on top of the value this update is
   * setting - e.g. manually draining an actor's Magic Points, then having a catch-up run some time
   * later, could instantly refund most or all of the drain by crediting the recovery gap that
   * actually predates the drain. catchUpMagicPointRecovery's own writes always set the checkpoint
   * explicitly (to a precisely carried-forward value, not just "now"), so this only fires for
   * updates that change the value without also specifying a checkpoint.
   */
  private settleMagicPointRecoveryCheckpoint(
    changes: Actor.UpdateData,
    changesMagicPointsValue: boolean,
  ): void {
    const changesCheckpoint = foundry.utils.hasProperty(
      changes,
      "system.attributes.magicPointRecoverySettledWorldTime",
    );
    const currentWorldTime = game.time?.worldTime;
    if (!changesMagicPointsValue || changesCheckpoint || currentWorldTime == null) {
      return;
    }
    foundry.utils.setProperty(
      changes,
      "system.attributes.magicPointRecoverySettledWorldTime",
      currentWorldTime,
    );
  }

  /**
   * Same fix as settleMagicPointRecoveryCheckpoint, for Hit Points (#436): any write to
   * hitPoints.value that isn't catchUpNaturalHealing's own - damage, a heal spell, First Aid, a
   * manual sheet edit - needs to settle the healing checkpoint to *now* too, or a stale checkpoint
   * could later attribute unrelated dead time as natural healing on top of a value that was just
   * changed for a different reason.
   */
  private settleHealingCheckpoint(changes: Actor.UpdateData, changesHitPointsValue: boolean): void {
    const changesCheckpoint = foundry.utils.hasProperty(
      changes,
      "system.attributes.healingSettledWorldTime",
    );
    const currentWorldTime = game.time?.worldTime;
    if (!changesHitPointsValue || changesCheckpoint || currentWorldTime == null) {
      return;
    }
    foundry.utils.setProperty(
      changes,
      "system.attributes.healingSettledWorldTime",
      currentWorldTime,
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

    const changesMagicPointsValue = foundry.utils.hasProperty(
      changes,
      "system.attributes.magicPoints.value",
    );
    const changesHitPointsValue = foundry.utils.hasProperty(
      changes,
      "system.attributes.hitPoints.value",
    );
    this._healthBeforeActorUpdate = this.isHealthAffectingActorUpdate(
      changes,
      changesMagicPointsValue,
      changesHitPointsValue,
    )
      ? this.getHealthTransitionSnapshot()
      : undefined;

    this.settleMagicPointRecoveryCheckpoint(changes, changesMagicPointsValue);
    this.settleHealingCheckpoint(changes, changesHitPointsValue);

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

import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { AbilityRoll } from "../../rolls/AbilityRoll/AbilityRoll";
import type { AbilityRollOptions, Modifier } from "../../rolls/AbilityRoll/AbilityRoll.types";
import {
  activateChatTab,
  assertDocumentSubType,
  getActorLinkDecoration,
  isButton,
  isDocumentSubType,
  localize,
  requireValue,
  RqgError,
  safeFromJSON,
} from "../../system/util";
import type { RqgActor } from "@actors/rqgActor.ts";
import type { RqgItem } from "@items/rqgItem.ts";
import type {
  DefenceDialogContext,
  DefenceDialogFormData,
  DefenceType,
} from "./DefenceDialogData.types.ts";
import { RqgChatMessage } from "../../chat/RqgChatMessage";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import type {
  CombatManeuver,
  DamageType,
  Usage,
  UsageType,
  WeaponItem,
} from "@item-model/weaponData.ts";
import { getBasicOutcomeDescription } from "../../chat/attackFlowHandlers";
import {
  combatOutcome,
  getDamageDegree,
  getMasterOpponentModifier,
} from "../../system/combatCalculations";
import { AbilitySuccessLevelEnum } from "../../rolls/AbilityRoll/AbilityRoll.defs";
import { updateChatMessage } from "../../sockets/SocketableRequests";
import { WeaponDesignation } from "../../system/combatCalculations.defs";
import { HitLocationRoll } from "../../rolls/HitLocationRoll/HitLocationRoll";
import type { SkillItem } from "@item-model/skillData.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqgActorData.ts";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class DefenceDialogV2 extends HandlebarsApplicationMixin(
  ApplicationV2<DefenceDialogContext>,
) {
  override get element(): HTMLFormElement {
    return super.element as HTMLFormElement;
  }

  private static augmentOptions: SelectOptionData<number>[] = [
    { value: 0, label: "RQG.Dialog.Common.AugmentOptions.None" },
    { value: 20, label: "RQG.Dialog.Common.AugmentOptions.Success" },
    { value: 30, label: "RQG.Dialog.Common.AugmentOptions.SpecialSuccess" },
    { value: 50, label: "RQG.Dialog.Common.AugmentOptions.CriticalSuccess" },
    { value: -20, label: "RQG.Dialog.Common.AugmentOptions.Failure" },
    { value: -50, label: "RQG.Dialog.Common.AugmentOptions.Fumble" },
  ];

  private static subsequentDefenceOptions: SelectOptionData<number>[] = [
    { value: 0, label: "RQG.Dialog.Defence.SubsequentDefenceOptions.First" },
    { value: -20, label: "RQG.Dialog.Defence.SubsequentDefenceOptions.Second" },
    { value: -40, label: "RQG.Dialog.Defence.SubsequentDefenceOptions.Third" },
    { value: -60, label: "RQG.Dialog.Defence.SubsequentDefenceOptions.Fourth" },
    { value: -80, label: "RQG.Dialog.Defence.SubsequentDefenceOptions.Fifth" },
    { value: -100, label: "RQG.Dialog.Defence.SubsequentDefenceOptions.Sixth" },
  ];

  private readonly attackChatMessage: RqgChatMessage;

  constructor(
    chatMessageId: string,
    options?: Partial<foundry.applications.types.ApplicationConfiguration>,
  ) {
    super(options);
    const attackChatMessage = game.messages?.get(chatMessageId ?? "") as RqgChatMessage | undefined;

    if (!attackChatMessage) {
      const msg = "No attackChatMessage to defend";
      ui.notifications?.warn(msg);
      setTimeout(() => {
        void this.close();
      }, 500); // Wait to make sure the dialog exists before closing - TODO ugly hack
      throw new RqgError(msg);
    }
    this.attackChatMessage = attackChatMessage;
  }

  static override DEFAULT_OPTIONS = {
    id: "combat-{id}",
    tag: "form",
    classes: [systemId, "form", "roll-dialog", "defence-dialog"],
    form: {
      handler: DefenceDialogV2.onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    position: {
      width: "auto" as const,
      height: "auto" as const,
      left: 100,
      top: 10,
    },
    window: {
      contentClasses: ["standard-form"],
      icon: "fa-solid fa-shield",
      title: "RQG.Dialog.Defence.Title",
      resizable: true,
    },
  };

  static override PARTS = {
    header: { template: templatePaths.combatRollHeader },
    form: { template: templatePaths.defenceDialogV2, scrollable: [""] },
    footer: { template: templatePaths.defenceFooter },
  };

  override async _prepareContext(): Promise<DefenceDialogContext> {
    const formData = ((this.element &&
      new foundry.applications.ux.FormDataExtended(this.element, {}).object) ??
      {}) as DefenceDialogFormData;

    const defenderOptions = DefenceDialogV2.getDefenderOptions(this.attackChatMessage);
    if (Object.keys(defenderOptions).length === 0) {
      const msg = localize("RQG.Dialog.Defence.NoTokenToDefendWith");
      ui.notifications?.warn(msg);
      this.close();
    }

    const attackingTokenOrActorUuid = this.attackChatMessage?.system.attackingTokenOrActorUuid;
    const attackingTokenOrActor = fromUuidSync(attackingTokenOrActorUuid ?? "") as
      | TokenDocument
      | RqgActor
      | undefined;

    const attackRollData = this.attackChatMessage?.system.attackRoll;
    const attackRoll = safeFromJSON<AbilityRoll>(AbilityRoll, attackRollData);
    if (!attackRoll) {
      const msg = "No attack roll present - cannot defend";
      ui.notifications?.warn(msg);
      throw new RqgError(msg);
    }

    const defendingUuid =
      (formData.defendingTokenOrActorUuid as string | undefined) ??
      this.attackChatMessage.system.defendingTokenOrActorUuid ??
      Object.values(defenderOptions)[0]?.value;

    if (!defendingUuid) {
      const msg = "No defending token or actor UUID available";
      ui.notifications?.error(msg);
      throw new RqgError(msg);
    }

    formData.defendingTokenOrActorUuid = defendingUuid;

    const defendingTokenOrActor = (await fromUuid(defendingUuid)) as TokenDocument | null;
    const defendingActor =
      (defendingTokenOrActor instanceof TokenDocument
        ? defendingTokenOrActor?.actor
        : defendingTokenOrActor) ?? undefined;
    const parryingWeaponOptions = DefenceDialogV2.getParryingWeaponOptions(defendingActor);

    formData.parryingWeaponUuid ??= Object.values(parryingWeaponOptions)?.map((o) => o.value)[0];
    formData.defence ??= "parry";
    formData.augmentModifier ??= "0";
    formData.subsequentDefenceModifier ??= "0";
    formData.halved ??= false;
    formData.otherModifier ??= "";
    formData.otherModifierDescription ??= localize("RQG.Dialog.Defence.OtherModifier");
    formData.attackChatMessageUuid ??= this.attackChatMessage?.uuid;

    const parryingWeaponItem = (await fromUuid(formData.parryingWeaponUuid ?? "")) as
      | RqgItem
      | undefined;
    const parryingWeapon = isDocumentSubType<WeaponItem>(parryingWeaponItem, ItemTypeEnum.Weapon)
      ? parryingWeaponItem
      : undefined;

    const defenceOptions = DefenceDialogV2.getDefenceOptions(defendingActor, parryingWeapon?.uuid);
    if (
      !Object.values(defenceOptions)
        .map((o) => o.value)
        .includes(formData.defence ?? "")
    ) {
      formData.defence = Object.values(defenceOptions).map((o) => o.value)[0]; // Make sure there is a possible defence selected
    }

    const parryingWeaponUsageOptions =
      DefenceDialogV2.getParryingWeaponUsageOptions(parryingWeapon);

    const parryingWeaponUsageOptionKeys = Object.values(parryingWeaponUsageOptions).map(
      (p) => p.value,
    );
    if (
      !formData.parryingWeaponUsage ||
      !parryingWeaponUsageOptionKeys.includes(formData.parryingWeaponUsage)
    ) {
      formData.parryingWeaponUsage = parryingWeaponUsageOptionKeys[0]; // If nothing is selected, select the first option
    }

    const parrySkillRqid = formData.parryingWeaponUsage
      ? parryingWeapon?.system.usage[formData.parryingWeaponUsage]?.skillRqidLink?.rqid
      : undefined;

    const { defenceName, defenceChance } = DefenceDialogV2.getDefenceNameAndChance(
      formData.defence,
      defendingActor,
      parrySkillRqid,
    );

    formData.halvedModifier = -Math.floor(defenceChance / 2);

    const totalChanceExclMasterOpponent = Math.max(
      0,
      Number(defenceChance ?? 0) +
        Number(formData.augmentModifier ?? 0) +
        Number(formData.subsequentDefenceModifier ?? 0) +
        Number(formData.halved ? formData.halvedModifier : 0) +
        Number(formData.otherModifier ?? 0),
    );

    const { modifier, modifiedWeapon } = getMasterOpponentModifier(
      attackRoll.targetChance ?? 0,
      totalChanceExclMasterOpponent,
    );

    const newMasterOpponentModifier: Modifier = {
      value: modifier,
      description: localize("RQG.Roll.AbilityRoll.MasterOpponentModifier"),
    };

    // @ts-expect-error modifiers
    attackRoll.options.modifiers = attackRoll.options.modifiers.filter(
      (m: Modifier) => m.description !== newMasterOpponentModifier.description,
    );
    formData.masterOpponentModifier = 0;

    if (modifiedWeapon === WeaponDesignation.ParryWeapon) {
      formData.masterOpponentModifier = modifier;
    } else if (modifiedWeapon === WeaponDesignation.AttackingWeapon) {
      // @ts-expect-error modifiers
      attackRoll.options.modifiers.push(newMasterOpponentModifier);
    }

    const defenceButtonText =
      formData.defence === "parry" ? localize("RQG.Dialog.Defence.Parry") : defenceName;

    formData.parryingWeaponUsage ??= parryingWeapon
      ? DefenceDialogV2.getParryingWeaponUsageOptions(parryingWeapon)[0]?.value
      : undefined;

    return {
      formData: formData,

      attackerName: attackingTokenOrActor?.name ?? "",
      defenderOptions: defenderOptions,
      defenceOptions: defenceOptions,
      parryingWeaponOptions: parryingWeaponOptions,
      parryingWeaponUsageOptions: parryingWeaponUsageOptions,
      augmentOptions: DefenceDialogV2.augmentOptions,
      subsequentDefenceOptions: DefenceDialogV2.subsequentDefenceOptions,

      // combatRollHeader
      skillName: defenceName,
      skillChance: defenceChance,

      // defenceFooter
      totalChance: totalChanceExclMasterOpponent + Number(formData.masterOpponentModifier),
      defenceButtonText: defenceButtonText,
    };
  }

  override _onChangeForm(): void {
    this.render();
  }

  private static async onSubmit(
    event: SubmitEvent | Event,
    form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    if (!(event instanceof SubmitEvent)) {
      return; // Should only be called on form submits
    }
    const submitter = event.submitter;
    const formDataObject = formData.object as DefenceDialogFormData;

    if (!isButton(submitter)) {
      ui.notifications?.warn("Button not working - programming error");
      return;
    }
    // @ts-expect-error close - close immediately instead of waiting for roll animation
    this.close();

    const attackChatMessage = (await fromUuid(formDataObject.attackChatMessageUuid ?? "")) as
      | RqgChatMessage
      | undefined;

    if (!attackChatMessage) {
      const msg = "Attack chat message not found";
      throw new RqgError(msg, formDataObject);
    }

    const messageData = attackChatMessage!.toObject();

    const selectedParryingWeapon = (await fromUuid(
      formDataObject.parryingWeaponUuid ?? "",
    )) as RqgItem | null;
    if (selectedParryingWeapon) {
      assertDocumentSubType<WeaponItem>(selectedParryingWeapon, ItemTypeEnum.Weapon);
    }
    const parrySkillRqid =
      selectedParryingWeapon?.system.usage[formDataObject.parryingWeaponUsage ?? "oneHand"]
        ?.skillRqidLink?.rqid; // TODO hardcoded oneHand fallback usage

    const defendingTokenDocumentOrActor = (await fromUuid(
      formDataObject.defendingTokenOrActorUuid ?? "",
    )) as TokenDocument | RqgActor | null;

    const defendingToken =
      defendingTokenDocumentOrActor instanceof TokenDocument
        ? defendingTokenDocumentOrActor
        : undefined;

    const defendingActor =
      (defendingTokenDocumentOrActor instanceof TokenDocument
        ? defendingTokenDocumentOrActor?.actor
        : defendingTokenDocumentOrActor) ?? undefined;

    if (defendingActor) {
      assertDocumentSubType<CharacterActor>(defendingActor, ActorTypeEnum.Character);
    }
    // Update the chat with how the defence was done

    const currentFlavor = attackChatMessage.flavor;

    const defenderName = defendingTokenDocumentOrActor?.name;

    const updatedFlavor = currentFlavor.replace("???", defenderName ?? "");

    const { defenceName } = DefenceDialogV2.getDefenceNameAndChance(
      formDataObject.defence,
      defendingActor,
      parrySkillRqid,
    );

    if (formDataObject.defence === "parry") {
      requireValue(
        selectedParryingWeapon,
        "parry defence selected without a parrying weapon",
        formDataObject,
      );
    }

    let defendSkillItem: RqgItem | undefined;
    switch (formDataObject.defence) {
      case "parry": {
        defendSkillItem = defendingActor?.getBestEmbeddedDocumentByRqid(parrySkillRqid) as
          | RqgItem
          | undefined;
        break;
      }

      case "dodge": {
        defendSkillItem = defendingActor?.getBestEmbeddedDocumentByRqid(CONFIG.RQG.skillRqid.dodge);
        break;
      }

      case "ignore":
      default:
      // Leave defendSkillItem undefined
    }

    const defenceHtml = `<span class="roll-action">${localize("RQG.Dialog.Defence.Defence")}</span>`;

    const defendHeading =
      formDataObject.defence === "parry"
        ? `${defenceHtml} <span>${localize("RQG.Dialog.Defence.Parry")} – ${selectedParryingWeapon?.name ?? ""} – ${localize("RQG.Game.WeaponUsage." + formDataObject.parryingWeaponUsage)}</span>`
        : `${defenceHtml} ${defenceName}`;

    if (defendSkillItem) {
      assertDocumentSubType<SkillItem>(defendSkillItem, ItemTypeEnum.Skill);
      if (defendSkillItem.system.chance == null) {
        ui.notifications?.warn(
          `Defence skill ${defendSkillItem.name} has no chance value, using 0%.`,
        );
        return;
      }
    }
    const defenceRollOptions: AbilityRollOptions = {
      naturalSkill: defendSkillItem?.system.chance ?? 0,
      modifiers: [
        {
          value: Number(formDataObject.augmentModifier),
          description: localize("RQG.Roll.AbilityRoll.Augment"),
        },
        {
          value: Number(formDataObject.subsequentDefenceModifier),
          description: DefenceDialogV2.getSubsequentDefenceModifierLabel(
            Number(formDataObject.subsequentDefenceModifier),
          ),
        },
        {
          value: formDataObject.halved ? formDataObject.halvedModifier : 0,
          description: localize("RQG.Roll.AbilityRoll.Halved"),
        },
        {
          value: Number(formDataObject.otherModifier),
          description: formDataObject.otherModifierDescription,
        },
        {
          value: Number(formDataObject.masterOpponentModifier),
          description: localize("RQG.Roll.AbilityRoll.MasterOpponentModifier"),
        },
      ],
      heading: defendHeading,
      abilityName: defendSkillItem?.name ?? undefined,
      abilityType: defendSkillItem?.type ?? undefined,
      abilityImg: defendSkillItem?.img ?? undefined,
      speaker: ChatMessage.getSpeaker({
        token: defendingToken, // Connect the roll to the defender
        actor: defendingToken ? undefined : defendingActor,
      }),
    };

    // JSONField can be either string or object depending on when it's accessed
    const attackRollData = attackChatMessage.system.attackRoll;
    const attackRoll = safeFromJSON<AbilityRoll>(AbilityRoll, attackRollData);

    if (attackRoll && !attackRoll.isEvaluated) {
      // Don't reevaluate in case the attack roll is already evaluated.
      await attackRoll.evaluate();
    }
    if (attackRoll?.successLevel == null) {
      const msg = "Didn't find an attackRoll in the chatmessage, aborting";
      ui.notifications?.error(msg);
      console.error(`RQG | ${msg}`);
      return;
    }

    const defenceRoll =
      formDataObject.defence !== "ignore"
        ? new AbilityRoll(undefined, {}, defenceRollOptions)
        : undefined;

    if (defenceRoll && !defenceRoll.isEvaluated) {
      await defenceRoll.evaluate();
    }
    if (formDataObject.defence !== "ignore" && defenceRoll?.successLevel == null) {
      throw new RqgError("Evaluated DefenceRoll didn't give successLevel");
    }

    const attackingWeapon = (await fromUuid(
      attackChatMessage?.system.attackWeaponUuid,
    )) as RqgItem | null;
    assertDocumentSubType<WeaponItem>(attackingWeapon, ItemTypeEnum.Weapon);

    const attackWeaponUsageType = attackChatMessage?.system.attackWeaponUsage;
    requireValue(attackWeaponUsageType, "No attacking weapon usage found in attack chat message");

    const parryWeaponUsageType = formDataObject.parryingWeaponUsage;
    const attackDamageBonus = attackChatMessage?.system.attackDamageBonus ?? "";
    const attackExtraDamage = attackChatMessage?.system.attackExtraDamage ?? "";
    const defendDamageBonus = defendingActor?.system?.attributes?.damageBonus ?? "";
    const attackingWeaponDamageType = (attackChatMessage?.system.attackCombatManeuver.damageType ??
      "") as DamageType;
    const parryingWeaponDamageType = (
      parryWeaponUsageType
        ? selectedParryingWeapon?.system.usage[parryWeaponUsageType]?.combatManeuvers.find(
            (cm: CombatManeuver) => cm.damageType !== "parry",
          )?.damageType
        : undefined
    ) as DamageType | undefined;

    const {
      damageRoll,
      weaponDamage,
      damagedWeapon,
      defenderHitLocationDamage,
      useParryHitLocation,
      ignoreDefenderAp,
      weaponDoingDamage,
    } = await combatOutcome(
      formDataObject.defence,
      attackRoll,
      defenceRoll,
      attackingWeapon,
      attackWeaponUsageType,
      attackDamageBonus,
      attackExtraDamage,
      defendDamageBonus,
      selectedParryingWeapon,
      parryWeaponUsageType,
      attackingWeaponDamageType,
      parryingWeaponDamageType ?? "parry",
    );

    const outcomeDescription = getBasicOutcomeDescription(
      formDataObject.defence,
      attackRoll.successLevel,
      defenceRoll?.successLevel,
    );

    console.debug("no implementation for useParryHitLocation yet", useParryHitLocation);

    // TODO Introduce ability for GM to fudge roll here

    const hitLocationRollJson = attackChatMessage?.system.hitLocationRoll;
    requireValue(hitLocationRollJson, "No Hit Location Roll found in chat message");

    (hitLocationRollJson as any).options.hitLocationNames = HitLocationRoll.tokenToHitLocationNames(
      defendingTokenDocumentOrActor,
    );

    const damageDegree = getDamageDegree(
      formDataObject.defence ?? "ignore", // TODO correct?
      attackRoll.successLevel,
      defenceRoll?.successLevel,
    );

    const attackerFumbled = attackRoll.successLevel === AbilitySuccessLevelEnum.Fumble;
    const defenderFumbled = defenceRoll?.successLevel === AbilitySuccessLevelEnum.Fumble;
    const systemUpdate = {
      attackState: "Defended",
      defendingTokenOrActorUuid: formDataObject.defendingTokenOrActorUuid,
      defenceWeaponUuid: selectedParryingWeapon?.uuid,
      defenceWeaponUsage: parryWeaponUsageType,
      outcomeDescription: outcomeDescription,
      attackRoll: attackRoll.toJSON(),
      defenceRoll: defenceRoll?.toJSON(),
      attackerFumbled: attackerFumbled,
      defenderFumbled: defenderFumbled,
      damagedWeaponUuid: damagedWeapon?.uuid,
      weaponDamage: weaponDamage,
      weaponDoingDamage: weaponDoingDamage,
      defenderHitLocationDamage: defenderHitLocationDamage,
      damageRoll: damageRoll?.toJSON(),
      ignoreDefenderAp: ignoreDefenderAp,
      actorDamagedApplied: damageDegree === "none",
      weaponDamageApplied: damageDegree === "none",
      hitLocationRoll: damageRoll // If there is a damageRoll there should also be a hitLocationRoll
        ? hitLocationRollJson
        : null,
    };

    foundry.utils.mergeObject(
      messageData,
      {
        system: systemUpdate,
        flavor: updatedFlavor,
      },
      { overwrite: true },
    );

    messageData.content = await foundry.applications.handlebars.renderTemplate(
      templatePaths.attackChatMessage,
      messageData.system,
    );

    if (game.dice3d && attackRoll && defenceRoll) {
      // Don't try to roll for ignore defence
      if (formDataObject.defence !== "ignore") {
        // Wait a tad with the defence roll to separate the animations slightly
        setTimeout(() => {
          void game.dice3d?.showForRoll(defenceRoll, game.user, true, null, false);
        }, 300);
      }

      await game.dice3d.showForRoll(attackRoll, attackChatMessage.author, true, null, false);
    }

    activateChatTab();
    await updateChatMessage(attackChatMessage, messageData);
    const attackWeapon = (await fromUuid(attackChatMessage.system.attackWeaponUuid)) as
      | RqgItem
      | undefined;
    if (attackWeapon) {
      assertDocumentSubType<WeaponItem>(attackWeapon, ItemTypeEnum.Weapon);
    }
    if (isDocumentSubType<WeaponItem>(attackWeapon, ItemTypeEnum.Weapon)) {
      const attackWeaponUsage = attackChatMessage.system.attackWeaponUsage;
      const attackSkill = attackWeaponUsage
        ? attackWeapon?.actor?.getBestEmbeddedDocumentByRqid(
            attackWeapon.system.usage[attackWeaponUsage]?.skillRqidLink?.rqid,
          )
        : undefined;

      await defendSkillItem?.checkExperience?.(defenceRoll?.successLevel);
      await attackSkill?.checkExperience?.(attackRoll.successLevel);
    }
  }

  private static getDefenceNameAndChance(
    defence: string | undefined,
    defendingActor: RqgActor | undefined,
    parrySkillRqid: string | undefined,
  ): { defenceName: string; defenceChance: number } {
    if (defence === "parry") {
      const parrySkill = defendingActor?.getBestEmbeddedDocumentByRqid(parrySkillRqid) as
        | SkillItem
        | undefined;
      return {
        defenceName: parrySkill?.name ?? "",
        defenceChance: parrySkill?.system.chance ?? 0,
      };
    }
    if (defence === "dodge") {
      const dodgeSkill = defendingActor?.getBestEmbeddedDocumentByRqid(
        CONFIG.RQG.skillRqid.dodge,
      ) as SkillItem | undefined;
      return {
        defenceName: dodgeSkill?.name ?? "No dodge skill found!",
        defenceChance: dodgeSkill?.system.chance ?? 0,
      };
    }

    return { defenceName: localize("RQG.Dialog.Defence.Ignore"), defenceChance: 0 };
  }

  private static getSubsequentDefenceModifierLabel(defenceModifier: number): string {
    switch (defenceModifier) {
      case -20:
        return localize("RQG.Roll.AbilityRoll.SubsequentDefenceRoll.Second");
      case -40:
        return localize("RQG.Roll.AbilityRoll.SubsequentDefenceRoll.Third");
      case -60:
        return localize("RQG.Roll.AbilityRoll.SubsequentDefenceRoll.Fourth");
      case -80:
        return localize("RQG.Roll.AbilityRoll.SubsequentDefenceRoll.Fifth");
      case -100:
        return localize("RQG.Roll.AbilityRoll.SubsequentDefenceRoll.Sixth");
      default:
        return "";
    }
  }

  private static getDefenderOptions(attackChatMessage: RqgChatMessage): SelectOptionData<string>[] {
    // case 1 - defendingTokenOrActorUuid is set (attacker has set a target)
    const initialDefendingTokenUuid = attackChatMessage.system.defendingTokenOrActorUuid;
    if (initialDefendingTokenUuid) {
      const defendingToken = fromUuidSync(initialDefendingTokenUuid) as TokenDocument | null;
      return [
        {
          value: initialDefendingTokenUuid,
          label: (defendingToken?.name ?? "") + getActorLinkDecoration(defendingToken?.actor),
          group: localize("RQG.Dialog.Common.TargetedToken"),
        },
      ];
    }

    // case 2 - show a list of token the user owns and are present on the active scene,
    //  and include the owned actors that do not have tokens.
    const ownedTokens =
      game.scenes?.current?.tokens
        .filter((t) => t.isOwner)
        ?.map((tokenDocument) => ({
          value: tokenDocument?.uuid ?? "",
          label: (tokenDocument?.name ?? "") + getActorLinkDecoration(tokenDocument.actor),
          group: localize("RQG.Dialog.Common.Tokens"),
        })) ?? [];

    const allowCombatWithoutToken = game.settings?.get(systemId, "allowCombatWithoutToken");
    let ownedActorsWithoutTokens: any[] = [];

    if (allowCombatWithoutToken) {
      const ownedTokenActorIds =
        game.scenes?.current?.tokens.filter((t) => t.isOwner)?.map((t) => t.actor?.id) ?? [];

      ownedActorsWithoutTokens =
        game.actors
          ?.filter((a) => a.isOwner && !ownedTokenActorIds.includes(a.id))
          .map((actor) => ({
            value: actor.uuid ?? "",
            label: (actor.name ?? "") + getActorLinkDecoration(actor),
            group: localize("RQG.Dialog.Common.Actors"),
          })) ?? [];
    }
    return [...ownedTokens, ...ownedActorsWithoutTokens];
  }

  private static getDefenceOptions(
    defendingActor: RqgActor | undefined,
    parryingWeaponUuid: string | undefined,
  ): SelectOptionData<DefenceType>[] {
    const defenceOptions: SelectOptionData<DefenceType>[] = [];

    if (parryingWeaponUuid) {
      defenceOptions.push({ value: "parry", label: localize("RQG.Dialog.Defence.Parry") });
    }

    const dodgeSkill = defendingActor?.getBestEmbeddedDocumentByRqid(CONFIG.RQG.skillRqid.dodge);
    if (dodgeSkill) {
      defenceOptions.push({ value: "dodge", label: dodgeSkill.name ?? "" });
    }

    defenceOptions.push({ value: "ignore", label: localize("RQG.Dialog.Defence.Ignore") });

    return defenceOptions;
  }

  private static getParryingWeaponOptions(
    defendingActor: RqgActor | undefined,
  ): SelectOptionData<string>[] {
    // get all weapons that can be used for parry
    const parryingWeapons =
      defendingActor?.items.filter(
        (weapon) =>
          isDocumentSubType<WeaponItem>(weapon, ItemTypeEnum.Weapon) &&
          weapon.system.equippedStatus === "equipped" &&
          (DefenceDialogV2.usageHasParryManeuver(weapon.system.usage.oneHand) ||
            DefenceDialogV2.usageHasParryManeuver(weapon.system.usage.offHand) ||
            DefenceDialogV2.usageHasParryManeuver(weapon.system.usage.twoHand) ||
            DefenceDialogV2.usageHasParryManeuver(weapon.system.usage.missile)),
      ) ?? [];
    const sortedWeapons = parryingWeapons.sort((a, b) => a.sort - b.sort);
    return sortedWeapons.map((weapon) => ({
      value: weapon.uuid ?? "",
      label: weapon.name ?? "",
    }));
  }

  private static getParryingWeaponUsageOptions(
    parryingWeapon: RqgItem | undefined,
  ): SelectOptionData<UsageType>[] {
    const usages: SelectOptionData<UsageType>[] = [];

    if (!isDocumentSubType<WeaponItem>(parryingWeapon, ItemTypeEnum.Weapon)) {
      const msg = "No parrying weapon selected";
      console.error("RQG | ", msg);
      return usages;
    }

    if (DefenceDialogV2.usageHasParryManeuver(parryingWeapon.system.usage.oneHand)) {
      usages.push({ value: "oneHand", label: "RQG.Game.WeaponUsage.oneHand-full" });
    }

    if (DefenceDialogV2.usageHasParryManeuver(parryingWeapon.system.usage.offHand)) {
      usages.push({ value: "offHand", label: "RQG.Game.WeaponUsage.offHand-full" });
    }

    if (DefenceDialogV2.usageHasParryManeuver(parryingWeapon.system.usage.twoHand)) {
      usages.push({ value: "twoHand", label: "RQG.Game.WeaponUsage.twoHand-full" });
    }

    if (DefenceDialogV2.usageHasParryManeuver(parryingWeapon.system.usage.missile)) {
      usages.push({ value: "missile", label: "RQG.Game.WeaponUsage.missile-full" });
    }

    return usages;
  }

  private static usageHasParryManeuver(usage: Usage): boolean {
    return (
      usage.skillRqidLink?.rqid != null &&
      usage.combatManeuvers?.some((m) => m.damageType === "parry")
    );
  }
}

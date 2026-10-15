import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import { AbilityRoll } from "../../rolls/ability-roll/ability-roll";
import type { AbilityRollOptions, Modifier } from "../../rolls/ability-roll/ability-roll.types";
import {
  activateChatTab,
  assertDocumentSubType,
  getActorLinkDecoration,
  isButton,
  isDocumentSubType,
  isFoundryElementInstanceOf,
  localize,
  normalizeOtherModifierDescriptionForRoll,
  requireValue,
  safeFromJSON,
  toSignedString,
} from "../../system/util";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import type {
  DefenceDialogContext,
  DefenceDialogFormData,
  DefenceType,
} from "./defence-dialog-data.types.ts";
import { RqgChatMessage } from "../../chat/rqg-chat-message";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { CombatManeuver, UsageType, WeaponItem } from "@item-model/weapon-data-model.ts";
import type { DamageType } from "@item-model/weapon-enums.ts";
import { getBasicOutcomeDescription } from "../../chat/attack-flow-handlers";
import {
  combatOutcome,
  getDamageDegree,
  getMasterOpponentModifier,
} from "../../system/combat-calculations";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";
import { updateChatMessage } from "../../sockets/socketable-requests";
import { HitLocationRoll } from "../../rolls/hit-location-roll/hit-location-roll";
import type { SkillItem } from "@item-model/skill-data-model.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data.ts";
import { toRqidString } from "../../system/api/rqid-validation";
import { RqgInteractiveRollApplicationBase } from "../app-parts/rqg-interactive-roll-application-base";
import { RqgLogger } from "../../system/logging/rqg-logger";
import { ERR } from "../../system/error-registry";
import { callRqgHook, callRqgPreHook, getSpeakerCompat } from "../../system/fvtt-type-compat";
import type { DefenceHookData } from "../../rolls/roll-method-options";
import {
  isForbidden,
  type PreparedRoll,
  preparedModifierTotal,
  preparedRoll,
  type RollPreparation,
} from "../../rolls/roll-preparation";
import {
  preparedBreakdown,
  preparedForbiddenHtml,
  preparedModifiersHtml,
} from "../app-parts/prepared-roll-view";
import { resolveActorFromUuid } from "../resistance-roll-dialog/resistance-roll-shared";
import { getWeaponEffectModifier } from "@items/weapon-item/weapon-skill-links";

const logger = new RqgLogger("DefenceDialogV2");

export class DefenceDialogV2 extends RqgInteractiveRollApplicationBase {
  private currentDefenceChance = 0;
  private currentDefenceBaseChance = 0;
  private currentParryWeaponEffectModifier = 0;

  private static getChanceBreakdownTooltip(
    baseSkillChance: number,
    totalChance: number,
    modifiers: Array<{ label: string; value: number }>,
  ): string {
    const escapeText = (value: unknown): string => foundry.utils.escapeHTML(String(value ?? ""));
    const tooltipLines = [
      `<strong>${escapeText(localize("RQG.Dialog.Common.TargetChance"))}</strong>`,
      `${escapeText(localize("TYPES.Item.skill"))}: ${baseSkillChance}%`,
      ...modifiers
        .filter((modifier) => Number(modifier.value ?? 0) !== 0)
        .map(
          (modifier) =>
            `${escapeText(toSignedString(modifier.value))}% ${escapeText(modifier.label)}`,
        ),
      `= ${totalChance}%`,
    ];

    return tooltipLines.join("<br>");
  }

  private static computeTotalChanceExclMasterOpponent(
    defenceChance: number,
    formData: DefenceDialogFormData,
    halvedModifier: number,
  ): number {
    return Math.max(
      0,
      Number(defenceChance ?? 0) +
        Number(formData.augmentModifier ?? 0) +
        Number(formData.subsequentDefenceModifier ?? 0) +
        Number(formData.halved ? halvedModifier : 0) +
        Number(formData.otherModifier ?? 0),
    );
  }

  private static computeTotalChance(
    totalChanceExclMasterOpponent: number,
    defenceMasterOpponentModifier: number,
  ): number {
    return Math.max(0, totalChanceExclMasterOpponent + Number(defenceMasterOpponentModifier ?? 0));
  }

  private static getChanceBreakdownModifiers(
    formData: DefenceDialogFormData,
    weaponEffectModifier: number,
    halvedModifier: number,
  ): Array<{ label: string; value: number }> {
    return [
      {
        label: localize("RQG.Roll.AbilityRoll.WeaponEffect"),
        value: weaponEffectModifier,
      },
      {
        label: localize("RQG.Roll.Common.Augment"),
        value: Number(formData.augmentModifier ?? 0),
      },
      {
        label: DefenceDialogV2.getSubsequentDefenceModifierLabel(
          Number(formData.subsequentDefenceModifier ?? 0),
        ),
        value: Number(formData.subsequentDefenceModifier ?? 0),
      },
      {
        label: localize("RQG.Roll.AbilityRoll.Halved"),
        value: formData.halved ? halvedModifier : 0,
      },
      {
        label: formData.otherModifierDescription ?? localize("RQG.Dialog.Common.OtherModifier"),
        value: Number(formData.otherModifier ?? 0),
      },
      {
        label: localize("RQG.Roll.AbilityRoll.MasterOpponentModifier"),
        value: Number(formData.defenceMasterOpponentModifier ?? 0),
      },
    ];
  }

  protected override getLivePreviewFormBehaviorConfig() {
    return {
      submitButtonSelectorForBlurGuard: "button[data-defend]",
      updateLivePreview: () => this.onFormValuesChanged(),
      onCommittedFormChange: (event: Event) => this.onCommittedFormChange(event),
    };
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

  private readonly attackChatMessage!: RqgChatMessage;

  constructor(
    chatMessageId: string,
    options?: Partial<foundry.applications.types.ApplicationConfiguration>,
  ) {
    super(options);
    const attackChatMessage = game.messages?.get(chatMessageId ?? "") as RqgChatMessage | undefined;

    if (!attackChatMessage) {
      logger.throw(ERR.attackMessageMissing, { chatMessageId });
    }
    this.attackChatMessage = attackChatMessage!;
  }

  static override DEFAULT_OPTIONS = {
    id: "combat-{id}",
    tag: "form",
    classes: [systemId, "form", "roll-dialog", "defence-dialog"],
    form: {
      handler: DefenceDialogV2.onSubmit,
      submitOnChange: false,
      closeOnSubmit: false, // Closed by onSubmit once the defence is settled
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
      TokenDocument | RqgActor | undefined;

    const attackRollData = this.attackChatMessage?.system.attackRoll;
    const attackRoll = safeFromJSON<AbilityRoll>(AbilityRoll, attackRollData);
    if (!attackRoll) {
      logger.throw(ERR.attackRollMissing, { attackChatMessageId: this.attackChatMessage.id });
    }

    const defendingUuid =
      (formData.defendingTokenOrActorUuid as string | undefined) ??
      this.attackChatMessage.system.defendingTokenOrActorUuid ??
      Object.values(defenderOptions)[0]?.value;

    if (!defendingUuid) {
      logger.throw(ERR.noDefenderResolved, { attackChatMessageId: this.attackChatMessage.id });
    }

    formData.defendingTokenOrActorUuid = defendingUuid!;

    const defendingTokenOrActor = (await fromUuid(defendingUuid)) as TokenDocument | null;
    const defendingActor =
      (defendingTokenOrActor instanceof TokenDocument
        ? defendingTokenOrActor?.actor
        : defendingTokenOrActor) ?? undefined;
    const parryingWeaponOptions = DefenceDialogV2.getParryingWeaponOptions(defendingActor);

    const parryingWeaponOptionValues = parryingWeaponOptions.map((option) => option.value);
    if (
      !formData.parryingWeaponUuid ||
      !parryingWeaponOptionValues.includes(formData.parryingWeaponUuid)
    ) {
      formData.parryingWeaponUuid = parryingWeaponOptionValues[0];
    }

    formData.defence ??= "parry";
    formData.augmentModifier ??= "0";
    formData.subsequentDefenceModifier ??= "0";
    formData.halved ??= false;
    formData.otherModifier ??= "";
    formData.otherModifierDescription ??= localize("RQG.Dialog.Common.OtherModifier");
    formData.attackChatMessageUuid ??= this.attackChatMessage?.uuid ?? undefined;

    const parryingWeaponItem = (await fromUuid(formData.parryingWeaponUuid ?? "")) as
      RqgItem | undefined;
    const parryingWeapon = isDocumentSubType<WeaponItem>(parryingWeaponItem, ItemTypeEnum.Weapon)
      ? parryingWeaponItem
      : undefined;

    const defenceOptions = DefenceDialogV2.getDefenceOptions(
      defendingActor,
      parryingWeapon?.uuid ?? undefined,
    );
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

    const { defenceName, baseChance, weaponEffectModifier, defenceChance } =
      DefenceDialogV2.getDefenceNameAndChance(
        formData.defence,
        defendingActor,
        parrySkillRqid,
        parryingWeapon,
        formData.parryingWeaponUsage,
      );
    this.currentDefenceChance = defenceChance;
    this.currentDefenceBaseChance = baseChance;
    this.currentParryWeaponEffectModifier = weaponEffectModifier;

    const selectedParrySkill =
      formData.defence === "parry"
        ? defendingActor?.getBestEmbeddedDocumentByRqid(toRqidString(parrySkillRqid))
        : undefined;
    const isSelectedParryWeaponBroken =
      formData.defence === "parry" &&
      !isDocumentSubType<SkillItem>(selectedParrySkill, ItemTypeEnum.Skill);

    formData.halvedModifier = -Math.floor(defenceChance / 2);

    this.prepared = DefenceDialogV2.prepareDefence(formData, this.attackChatMessage);
    const totalChanceExclMasterOpponent =
      DefenceDialogV2.computeTotalChanceExclMasterOpponent(
        defenceChance,
        formData,
        Number(formData.halvedModifier ?? 0),
      ) + preparedModifierTotal(this.prepared);

    const masterOpponentModifierDescription = localize(
      "RQG.Roll.AbilityRoll.MasterOpponentModifier",
    );

    // Remove any previously saved master opponent modifier before computing the new one,
    // so that targetChance reflects the base attack chance without it.
    attackRoll!.options.modifiers = (attackRoll!.options.modifiers ?? []).filter(
      (m: Modifier) => m.description !== masterOpponentModifierDescription,
    );

    const { attackModifier, defenceModifier } = getMasterOpponentModifier(
      attackRoll!.targetChance ?? 0,
      totalChanceExclMasterOpponent,
    );

    formData.defenceMasterOpponentModifier = defenceModifier;
    formData.attackMasterOpponentModifier = attackModifier;

    const defenceButtonText =
      formData.defence === "parry" ? localize("RQG.Dialog.Defence.Parry") : defenceName;

    formData.parryingWeaponUsage ??= parryingWeapon
      ? DefenceDialogV2.getParryingWeaponUsageOptions(parryingWeapon)[0]?.value
      : undefined;

    const totalChance = DefenceDialogV2.computeTotalChance(
      totalChanceExclMasterOpponent,
      Number(formData.defenceMasterOpponentModifier ?? 0),
    );
    const chanceBreakdownTooltip = DefenceDialogV2.getChanceBreakdownTooltip(
      baseChance,
      totalChance,
      [
        ...DefenceDialogV2.getChanceBreakdownModifiers(
          formData,
          weaponEffectModifier,
          Number(formData.halvedModifier ?? 0),
        ),
        ...preparedBreakdown(this.prepared),
      ],
    );

    return {
      formData: formData,

      attackerName: attackingTokenOrActor?.name ?? "",
      defenderOptions: defenderOptions,
      defenceOptions: defenceOptions,
      parryingWeaponOptions: parryingWeaponOptions,
      parryingWeaponUsageOptions: parryingWeaponUsageOptions,
      augmentOptions: DefenceDialogV2.augmentOptions,
      subsequentDefenceOptions: DefenceDialogV2.subsequentDefenceOptions,
      isSelectedParryWeaponBroken: isSelectedParryWeaponBroken,

      // combat-roll-header
      skillName: defenceName,
      skillChance: baseChance,

      // defence-footer
      totalChance,
      chanceBreakdownTooltip,
      preparedModifiersHtml: preparedModifiersHtml(this.prepared),
      preparedForbiddenHtml: preparedForbiddenHtml(this.prepared),
      defenceButtonText: defenceButtonText,
    };
  }

  private onCommittedFormChange(event: Event): void {
    const target = event.target;
    if (isFoundryElementInstanceOf(target, HTMLSelectElement)) {
      switch (target.name) {
        case "defence":
        case "parryingWeaponUuid":
        case "parryingWeaponUsage":
          this.onDefenceSelectionChange();
          break;
        default:
          break;
      }
    }
  }

  private onFormValuesChanged(): void {
    const totalChanceElement = this.element.querySelector<HTMLElement>("[data-total-chance]");
    const targetChanceBoxElement = this.element.querySelector<HTMLElement>(
      "[data-target-chance-box]",
    );
    if (!totalChanceElement) {
      return;
    }

    const formData = new foundry.applications.ux.FormDataExtended(this.element, {})
      .object as DefenceDialogFormData;
    const halvedModifier = -Math.floor(this.currentDefenceChance / 2);
    this.updatePreparedRoll(DefenceDialogV2.prepareDefence(formData, this.attackChatMessage));
    const totalChanceExclMasterOpponent =
      DefenceDialogV2.computeTotalChanceExclMasterOpponent(
        this.currentDefenceChance,
        formData,
        halvedModifier,
      ) + preparedModifierTotal(this.prepared);

    const totalChance = DefenceDialogV2.computeTotalChance(
      totalChanceExclMasterOpponent,
      Number(formData.defenceMasterOpponentModifier ?? 0),
    );
    totalChanceElement.textContent = `${totalChance}%`;

    if (targetChanceBoxElement) {
      const chanceBreakdownTooltip = DefenceDialogV2.getChanceBreakdownTooltip(
        this.currentDefenceBaseChance,
        totalChance,
        [
          ...DefenceDialogV2.getChanceBreakdownModifiers(
            formData,
            Number(this.currentParryWeaponEffectModifier ?? 0),
            halvedModifier,
          ),
          ...preparedBreakdown(this.prepared),
        ],
      );
      targetChanceBoxElement.dataset["tooltip"] = chanceBreakdownTooltip;
    }
  }

  private onDefenceSelectionChange(): void {
    this.warnIfSelectedParrySkillBroken();
  }

  private warnIfSelectedParrySkillBroken(): void {
    if (!this.element) {
      return;
    }

    const formData = new foundry.applications.ux.FormDataExtended(this.element, {})
      .object as DefenceDialogFormData;

    if (formData.defence !== "parry") {
      return;
    }

    const parryingWeaponItem = fromUuidSync(formData.parryingWeaponUuid ?? "") as
      RqgItem | undefined;

    if (!isDocumentSubType<WeaponItem>(parryingWeaponItem, ItemTypeEnum.Weapon)) {
      return;
    }

    const usageOptions = DefenceDialogV2.getParryingWeaponUsageOptions(parryingWeaponItem);
    const availableUsageTypes = usageOptions.map((option) => option.value);

    const selectedUsage =
      formData.parryingWeaponUsage && availableUsageTypes.includes(formData.parryingWeaponUsage)
        ? formData.parryingWeaponUsage
        : availableUsageTypes[0];

    if (!selectedUsage) {
      return;
    }

    const parrySkillRqid = parryingWeaponItem.system.usage[selectedUsage]?.skillRqidLink?.rqid;
    const parrySkill = parryingWeaponItem.actor?.getBestEmbeddedDocumentByRqid(
      toRqidString(parrySkillRqid),
    );

    if (!isDocumentSubType<SkillItem>(parrySkill, ItemTypeEnum.Skill)) {
      ui.notifications?.warn(localize("RQG.Dialog.Defence.NoValidParrySkillForWeaponUsageWarn"));
    }
  }

  private static async onSubmit(
    event: SubmitEvent | Event,
    form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    if (event.type !== "submit") {
      return; // Should only be called on form submits
    }
    const submitter = (event as SubmitEvent).submitter;
    const formDataObject = formData.object as DefenceDialogFormData;

    if (!isButton(submitter)) {
      ui.notifications?.warn("Button not working - programming error");
      return;
    }
    const attackChatMessage = (await fromUuid(formDataObject.attackChatMessageUuid ?? "")) as
      RqgChatMessage | undefined;

    if (!attackChatMessage) {
      logger.error(ERR.attackMessageMissing, formDataObject);
      return;
    }

    const messageData = attackChatMessage!.toObject();

    const built = DefenceDialogV2.buildDefence(formDataObject, attackChatMessage);
    const { defendingActor, defendSkillItem, defence } = built;
    const selectedParryingWeapon = defence.parryingWeapon;
    const defenceRollOptions = defence.rollOptions;

    // Update the chat with how the defence was done
    const updatedFlavor = attackChatMessage!.flavor.replace("???", built.defenderName ?? "");

    if (formDataObject.defence === "parry") {
      requireValue(
        selectedParryingWeapon,
        "parry defence selected without a parrying weapon",
        formDataObject,
      );
      if (!isDocumentSubType<SkillItem>(defendSkillItem, ItemTypeEnum.Skill)) {
        ui.notifications?.warn(localize("RQG.Dialog.Defence.NoValidParrySkillForWeaponUsageWarn"));
        return;
      }
    }

    if (defendSkillItem) {
      assertDocumentSubType<SkillItem>(defendSkillItem, ItemTypeEnum.Skill);
      if (defendSkillItem.system.chance == null) {
        ui.notifications?.warn(
          `Defence skill ${defendSkillItem.name} has no chance value, using 0%.`,
        );
        return;
      }
    }

    if (defendingActor && defence.defence !== "ignore") {
      const preparation: RollPreparation = {};
      callRqgHook("rqg.prepareDefence", defendingActor, defence, preparation);
      if (isForbidden(preparation)) {
        return;
      }
    }
    if (defendingActor && !callRqgPreHook("rqg.preDefence", defendingActor, defence)) {
      return;
    }
    // Closed once the defence is settled, before waiting for the roll animation
    // @ts-expect-error close - Foundry binds `this` to the dialog instance at runtime
    this.close();

    const attackRollData = attackChatMessage!.system.attackRoll;
    const attackRoll = safeFromJSON<AbilityRoll>(AbilityRoll, attackRollData);

    // Apply the master opponent modifier to the attack roll if needed
    const masterOpponentModifierDescription = localize(
      "RQG.Roll.AbilityRoll.MasterOpponentModifier",
    );
    if (attackRoll) {
      attackRoll.options.modifiers = (attackRoll.options.modifiers ?? []).filter(
        (m: Modifier) => m.description !== masterOpponentModifierDescription,
      );
      if (formDataObject.attackMasterOpponentModifier !== 0) {
        attackRoll.options.modifiers.push({
          value: formDataObject.attackMasterOpponentModifier,
          description: masterOpponentModifierDescription,
        });
      }
    }

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
      logger.throw(ERR.rollHasNoSuccessLevel, { roll: "DefenceRoll", formDataObject });
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
    const attackProjectileDamage = attackChatMessage?.system.attackProjectileDamage ?? "";
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
      attackWeaponUsageType as UsageType,
      attackDamageBonus,
      attackExtraDamage,
      attackProjectileDamage,
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
      built.defendingTokenOrActor ?? null,
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

      await game.dice3d.showForRoll(attackRoll, attackChatMessage!.author, true, null, false);
    }

    activateChatTab();
    await updateChatMessage(attackChatMessage!, messageData);
    if (defendingActor) {
      callRqgHook("rqg.defence", defendingActor, {
        ...defence,
        attackRoll,
        defenceRoll,
        chatMessage: attackChatMessage,
      });
    }
    const attackWeapon = (await fromUuid(attackChatMessage!.system.attackWeaponUuid)) as
      RqgItem | undefined;
    if (attackWeapon) {
      assertDocumentSubType<WeaponItem>(attackWeapon, ItemTypeEnum.Weapon);
    }
    if (isDocumentSubType<WeaponItem>(attackWeapon, ItemTypeEnum.Weapon)) {
      const attackWeaponUsage = attackChatMessage!.system.attackWeaponUsage as
        UsageType | undefined;
      const attackSkill = attackWeaponUsage
        ? (() => {
            const rqid = attackWeapon.system.usage[attackWeaponUsage]?.skillRqidLink?.rqid;
            return attackWeapon?.actor?.getBestEmbeddedDocumentByRqid(toRqidString(rqid));
          })()
        : undefined;

      await defendSkillItem?.checkExperience?.(defenceRoll?.successLevel);
      await attackSkill?.checkExperience?.(attackRoll.successLevel);
    }
  }

  /**
   * The defence the form describes, as the defence hooks get it. Used for the dialog's preview and
   * when the defence is made, so both see the same modifiers.
   */
  private static buildDefence(
    formData: DefenceDialogFormData,
    attackChatMessage: RqgChatMessage,
  ): {
    defendingTokenOrActor: TokenDocument | RqgActor | undefined;
    defendingToken: TokenDocument | undefined;
    defendingActor: CharacterActor | undefined;
    defenderName: string | undefined;
    defendSkillItem: RqgItem | undefined;
    defence: DefenceHookData;
  } {
    const parryingWeaponItem = fromUuidSync(formData.parryingWeaponUuid ?? "") as
      RqgItem | null | undefined;
    const parryingWeapon = isDocumentSubType<WeaponItem>(parryingWeaponItem, ItemTypeEnum.Weapon)
      ? parryingWeaponItem
      : undefined;
    const parrySkillRqid =
      parryingWeapon?.system.usage[formData.parryingWeaponUsage ?? "oneHand"]?.skillRqidLink?.rqid; // TODO hardcoded oneHand fallback usage

    const defendingTokenOrActor =
      (fromUuidSync(formData.defendingTokenOrActorUuid ?? "") as
        TokenDocument | RqgActor | null | undefined) ?? undefined;
    const defendingToken =
      defendingTokenOrActor instanceof TokenDocument ? defendingTokenOrActor : undefined;
    const defendingActor =
      (defendingTokenOrActor instanceof TokenDocument
        ? defendingTokenOrActor.actor
        : defendingTokenOrActor) ?? undefined;
    if (defendingActor) {
      assertDocumentSubType<CharacterActor>(defendingActor, ActorTypeEnum.Character);
    }

    const { defenceName } = DefenceDialogV2.getDefenceNameAndChance(
      formData.defence,
      defendingActor,
      parrySkillRqid,
      parryingWeapon,
      formData.parryingWeaponUsage,
    );

    let defendSkillItem: RqgItem | undefined;
    switch (formData.defence) {
      case "parry":
        defendSkillItem = defendingActor?.getBestEmbeddedDocumentByRqid(
          toRqidString(parrySkillRqid),
        );
        break;
      case "dodge":
        defendSkillItem = defendingActor?.getBestEmbeddedDocumentByRqid(CONFIG.RQG.skillRqid.dodge);
        break;
      default:
      // No skill for "ignore"
    }

    const defenceHtml = `<span class="roll-action">${localize("RQG.Dialog.Defence.Defence")}</span>`;
    const defendHeading =
      formData.defence === "parry"
        ? `${defenceHtml} <span>${localize("RQG.Dialog.Defence.Parry")} – ${parryingWeapon?.name ?? ""} – ${localize("RQG.Game.WeaponUsage." + formData.parryingWeaponUsage)}</span>`
        : `${defenceHtml} ${defenceName}`;

    // Passed as a named modifier in the roll options; naturalSkill is the raw skill chance only.
    const parryWeaponEffectModifier =
      formData.defence === "parry" && parryingWeapon && !!formData.parryingWeaponUsage
        ? getWeaponEffectModifier(parryingWeapon, formData.parryingWeaponUsage, "parry")
        : 0;

    const rollOptions: AbilityRollOptions = {
      naturalSkill: Number((defendSkillItem as SkillItem | undefined)?.system.chance ?? 0),
      modifiers: [
        {
          value: Number(parryWeaponEffectModifier),
          description: localize("RQG.Roll.AbilityRoll.WeaponEffect"),
        },
        {
          value: Number(formData.augmentModifier),
          description: localize("RQG.Roll.Common.Augment"),
        },
        {
          value: Number(formData.subsequentDefenceModifier),
          description: DefenceDialogV2.getSubsequentDefenceModifierLabel(
            Number(formData.subsequentDefenceModifier),
          ),
        },
        {
          value: formData.halved ? Number(formData.halvedModifier) : 0,
          description: localize("RQG.Roll.AbilityRoll.Halved"),
        },
        {
          value: Number(formData.otherModifier),
          description: normalizeOtherModifierDescriptionForRoll(formData.otherModifierDescription),
        },
        {
          value: Number(formData.defenceMasterOpponentModifier ?? 0),
          description: localize("RQG.Roll.AbilityRoll.MasterOpponentModifier"),
        },
      ],
      heading: defendHeading,
      abilityName: defendSkillItem?.name ?? undefined,
      abilityType: defendSkillItem?.type ?? undefined,
      abilityImg: defendSkillItem?.img ?? undefined,
      speaker: getSpeakerCompat({ token: defendingToken, actor: defendingActor }),
    };

    return {
      defendingTokenOrActor,
      defendingToken,
      defendingActor,
      defenderName: defendingTokenOrActor?.name ?? undefined,
      defendSkillItem,
      defence: {
        attacker: resolveActorFromUuid(attackChatMessage.system.attackingTokenOrActorUuid ?? ""),
        attackChatMessage,
        defence: formData.defence ?? "ignore",
        parryingWeapon,
        parryingWeaponUsage: formData.parryingWeaponUsage,
        rollOptions,
      },
    };
  }

  /** The modifiers and restriction the `rqg.prepareDefence` hook gives the form's defence. */
  private static prepareDefence(
    formData: DefenceDialogFormData,
    attackChatMessage: RqgChatMessage,
  ): PreparedRoll | undefined {
    const { defendingActor, defence } = DefenceDialogV2.buildDefence(formData, attackChatMessage);
    if (!defendingActor || defence.defence === "ignore") {
      return undefined;
    }
    const ownCount = defence.rollOptions.modifiers?.length ?? 0;
    const preparation: RollPreparation = {};
    callRqgHook("rqg.prepareDefence", defendingActor, defence, preparation);
    return preparedRoll(defence.rollOptions.modifiers, ownCount, preparation);
  }

  private static getDefenceNameAndChance(
    defence: string | undefined,
    defendingActor: RqgActor | undefined,
    parrySkillRqid: string | undefined,
    parryingWeapon: WeaponItem | undefined,
    parryingWeaponUsage: UsageType | undefined,
  ): {
    defenceName: string;
    baseChance: number;
    weaponEffectModifier: number;
    defenceChance: number;
  } {
    if (defence === "parry") {
      const parrySkill = defendingActor?.getBestEmbeddedDocumentByRqid(
        toRqidString(parrySkillRqid),
      ) as SkillItem | undefined;
      const baseChance = Number(parrySkill?.system.chance ?? 0);
      const parryWeaponEffectModifier =
        parrySkill && parryingWeapon && parryingWeaponUsage
          ? getWeaponEffectModifier(parryingWeapon, parryingWeaponUsage, "parry")
          : 0;
      return {
        defenceName: parrySkill?.name ?? "",
        baseChance,
        weaponEffectModifier: Number(parryWeaponEffectModifier),
        defenceChance: baseChance + Number(parryWeaponEffectModifier),
      };
    }
    if (defence === "dodge") {
      const dodgeSkill = defendingActor?.getBestEmbeddedDocumentByRqid(
        CONFIG.RQG.skillRqid.dodge,
      ) as SkillItem | undefined;
      const baseChance = Number(dodgeSkill?.system.chance ?? 0);
      return {
        defenceName: dodgeSkill?.name ?? "No dodge skill found!",
        baseChance,
        weaponEffectModifier: 0,
        defenceChance: baseChance,
      };
    }

    return {
      defenceName: localize("RQG.Dialog.Defence.Ignore"),
      baseChance: 0,
      weaponEffectModifier: 0,
      defenceChance: 0,
    };
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
      // Not an error - the defender may not be parrying with a weapon at all (e.g. dodging).
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

  private static usageHasParryManeuver(usage: WeaponItem["system"]["usage"][UsageType]): boolean {
    return (
      !!toRqidString(usage.skillRqidLink?.rqid) &&
      usage.combatManeuvers?.some((m) => m.damageType === "parry")
    );
  }
}

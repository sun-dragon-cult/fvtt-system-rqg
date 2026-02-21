import type { AttackDialogContext, AttackDialogFormData } from "./AttackDialogData.types.ts";

import {
  activateChatTab,
  assertDocumentSubType,
  assertHtmlElement,
  getActorLinkDecoration,
  getDomDataset,
  getTokenFromItem,
  getTokenOrActorFromItem,
  isButton,
  isDocumentSubType,
  isTruthy,
  localize,
  requireValue,
  RqgError,
} from "../../system/util";
import type { RqgActor } from "@actors/rqgActor.ts";
import type { RqgItem } from "@items/rqgItem.ts";
import type { RqgToken } from "../../combat/rqgToken";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import type { CombatManeuver, Usage, UsageType, WeaponItem } from "@item-model/weaponData.ts";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { systemId } from "../../system/config";
import type { AbilityRollOptions } from "../../rolls/AbilityRoll/AbilityRoll.types";
import {
  darknessModifier,
  proneTargetModifier,
  unawareTargetModifier,
} from "../../system/penaltyConstants";
import { RqgChatMessage } from "../../chat/RqgChatMessage";
import { AbilityRoll } from "../../rolls/AbilityRoll/AbilityRoll";
import type { HitLocationRollOptions } from "../../rolls/HitLocationRoll/HitLocationRoll.types";
import { HitLocationRoll } from "../../rolls/HitLocationRoll/HitLocationRoll";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqgActorData.ts";
import type { SkillItem } from "@item-model/skillData.ts";
import type { HitLocationItem } from "@item-model/hitLocationData.ts";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class AttackDialogV2 extends HandlebarsApplicationMixin(ApplicationV2<AttackDialogContext>) {
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

  private weaponItem: WeaponItem; // The chosen actor might not have any weapon

  constructor(
    weaponItem: WeaponItem,
    options?: Partial<foundry.applications.types.ApplicationConfiguration>,
  ) {
    super(options);
    this.weaponItem = weaponItem;
    const attackingToken = getTokenFromItem(this.weaponItem);
    const allowCombatWithoutToken = game.settings?.get(systemId, "allowCombatWithoutToken");

    if (!attackingToken && !allowCombatWithoutToken) {
      const msg = localize("RQG.Dialog.Attack.NoTokenToAttackWith");
      ui.notifications?.warn(msg);
      setTimeout(() => {
        void this.close();
      }, 500); // Wait to make sure the dialog exists before closing - TODO ugly hack
      throw new RqgError(msg);
    }
  }

  static override DEFAULT_OPTIONS = {
    id: "combat-{id}",
    tag: "form",
    classes: [systemId, "form", "roll-dialog", "attack-dialog"],
    form: {
      handler: AttackDialogV2.onSubmit,
      submitOnChange: false,
      closeOnSubmit: false,
    },
    position: {
      width: "auto" as const,
      height: "auto" as const,
      left: 35,
      top: 15,
    },
    window: {
      contentClasses: ["standard-form"],
      icon: "fa-solid fa-swords",
      title: "RQG.Dialog.Attack.Title",
      resizable: true,
    },
  };

  static override PARTS = {
    header: { template: templatePaths.combatRollHeader },
    form: { template: templatePaths.attackDialogV2, scrollable: [""] },
    footer: { template: templatePaths.attackFooter },
  };

  override async _prepareContext(): Promise<AttackDialogContext> {
    const formData = ((this.element &&
      new foundry.applications.ux.FormDataExtended(this.element, {}).object) ??
      {}) as AttackDialogFormData;

    const attackingTokenOrActor = getTokenOrActorFromItem(this.weaponItem);
    if (!attackingTokenOrActor) {
      const msg = localize("RQG.Dialog.Attack.WeaponNotEmbedded");
      ui.notifications?.warn(msg);
      this.close();
      throw new RqgError(msg);
    }
    formData.attackingTokenOrActorUuid = attackingTokenOrActor?.uuid;

    const usageTypeOptions = AttackDialogV2.getUsageTypeOptions(this.weaponItem);

    formData.usageType =
      this.weaponItem.system.defaultUsage ?? Object.values(usageTypeOptions)[0]!.value; // TODO should always have at least one usageType

    if (this.weaponItem.system.defaultUsage !== formData.usageType) {
      await this.weaponItem.update({
        system: { defaultUsage: formData.usageType },
      });
    }

    let isOutOfAmmo = false;
    let ammoQuantity: number = 1;

    if (formData.usageType === "missile") {
      const projectileItem = AttackDialogV2.getWeaponProjectile(this.weaponItem);
      ammoQuantity = projectileItem?.system.quantity ?? 0;
      isOutOfAmmo = ammoQuantity <= 0;
    }

    const skillRqid: string | undefined =
      this.weaponItem?.system.usage[formData.usageType].skillRqidLink?.rqid;
    const usedSkill: RqgItem | undefined =
      this.weaponItem?.actor?.getBestEmbeddedDocumentByRqid(skillRqid);
    assertDocumentSubType<SkillItem>(usedSkill, ItemTypeEnum.Skill);
    formData.halvedModifier = -Math.floor(usedSkill?.system.chance / 2);

    if ((game.user?.targets.size ?? 0) > 1) {
      ui.notifications?.info("Please target one token only");
    }

    const target = game.user?.targets.first();

    const damageBonusSourceOptions = AttackDialogV2.getDamageBonusSourceOptions(this.weaponItem);
    formData.attackingWeaponUuid ??= this.weaponItem.uuid;
    formData.attackDamageBonus ??= damageBonusSourceOptions[0]?.value ?? "";
    formData.otherModifierDescription ??= localize("RQG.Dialog.Attack.OtherModifier");
    formData.reduceAmmoQuantity ??= true;
    formData.aimedBlow = formData.aimedBlow ? Number(formData.aimedBlow) : 0;

    return {
      formData: formData,
      ammoQuantity: ammoQuantity,
      isOutOfAmmo: isOutOfAmmo,
      attackerOptions: AttackDialogV2.getAttackerOptions(),
      defendingTokenName: target?.name ?? localize("RQG.Dialog.Attack.NoTargetSelected"),
      attackingWeaponOptions: AttackDialogV2.getWeaponOptions(attackingTokenOrActor?.uuid),
      usageTypeOptions: usageTypeOptions,
      augmentOptions: AttackDialogV2.augmentOptions,
      damageBonusSourceOptions: damageBonusSourceOptions,
      hitLocationFormulaOptions: AttackDialogV2.getHitLocationFormulaOptions(formData.aimedBlow),
      aimedBlowOptions: AttackDialogV2.getAimedBlowOptions(target),

      // combatRollHeader
      skillName: usedSkill?.name ?? "",
      skillChance: usedSkill?.system.chance,

      // attackFooter
      totalChance: Math.max(
        0,
        Number(usedSkill?.system.chance ?? 0) +
          Number(formData.augmentModifier ?? 0) +
          Number(formData.otherModifier ?? 0) +
          (formData.proneTarget ? proneTargetModifier : 0) +
          (formData.unawareTarget ? unawareTargetModifier : 0) +
          (formData.darkness ? darknessModifier : 0) +
          (formData.halved ? formData.halvedModifier : 0) +
          (formData.aimedBlow > 0 ? formData.halvedModifier : 0),
      ),
      combatManeuverNames: this.weaponItem.system.usage[formData.usageType].combatManeuvers
        .filter((cm: CombatManeuver) => cm.damageType !== "parry")
        .map((cm: CombatManeuver) => cm.name),
    };
  }

  override async _onRender(context: any, options: any): Promise<void> {
    super._onRender(context, options);
    this.element
      .querySelector("select[name=attackingTokenOrActorUuid]")
      ?.addEventListener("change", this.onTokenChange.bind(this));

    this.element
      .querySelector("select[name=attackingWeaponUuid]")
      ?.addEventListener("change", this.onWeaponChange.bind(this));

    this.element
      .querySelector("select[name=usageType]")
      ?.addEventListener("change", this.onUsageChange.bind(this));
  }

  override _onChangeForm(): void {
    this.render();
  }

  private async onTokenChange(event: Event): Promise<void> {
    console.log("onTokenChange", event);

    const tokenSelectElement = event.target;
    requireValue(tokenSelectElement, "Token select not working - programming error");
    assertHtmlElement<HTMLSelectElement>(tokenSelectElement);

    const weaponOptions = AttackDialogV2.getWeaponOptions(tokenSelectElement.value);
    const weaponUuid = Object.values(weaponOptions)?.[0]?.value; // TODO for now just pick any weapon;

    const weaponItem = (await fromUuid(weaponUuid ?? "")) as RqgItem | undefined;

    if (!isDocumentSubType<WeaponItem>(weaponItem, ItemTypeEnum.Weapon)) {
      ui.notifications?.warn("No weapon found for the selected token, can't be used for attack");
      return;
    }
    this.weaponItem = weaponItem;

    this.render();
  }

  private async onWeaponChange(event: Event): Promise<void> {
    const weaponSelectElement = event.target;
    requireValue(weaponSelectElement, "Weapon select not working - programming error");
    assertHtmlElement<HTMLSelectElement>(weaponSelectElement);
    const weaponItem = (await fromUuid(weaponSelectElement.value ?? "")) as RqgItem | undefined;
    assertDocumentSubType<WeaponItem>(
      weaponItem,
      ItemTypeEnum.Weapon,
      "Weapon not found - programming error",
    );

    this.weaponItem = weaponItem;
    this.render();
  }

  private async onUsageChange(event: Event): Promise<void> {
    const usageSelectElement = event.target;
    requireValue(usageSelectElement, "Usage select not working - programming error");
    assertHtmlElement<HTMLSelectElement>(usageSelectElement);

    await this.weaponItem.update({
      system: { defaultUsage: usageSelectElement.value },
    });

    this.render();
  }

  /**
   * Create a type "combat" ChatMessage when the form is submitted.
   */
  private static async onSubmit(
    event: SubmitEvent | Event,
    form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    if (!(event instanceof SubmitEvent)) {
      return;
    }
    const submitter = event.submitter;
    const formDataObject = formData.object as AttackDialogFormData;

    if (!isButton(submitter)) {
      ui.notifications?.warn("Button not working - programming error");
      return;
    }
    submitter.disabled = true;
    setTimeout(() => (submitter.disabled = false), 1000);

    const weaponItem = (await fromUuid(formDataObject.attackingWeaponUuid ?? "")) as
      | RqgItem
      | undefined;
    assertDocumentSubType<WeaponItem>(weaponItem, ItemTypeEnum.Weapon, "Missing weapon for attack");

    const tokenDocumentOrRqgActor = (await fromUuid(
      formDataObject.attackingTokenOrActorUuid ?? "",
    )) as TokenDocument | RqgActor | undefined;

    const tokenDocument =
      tokenDocumentOrRqgActor instanceof TokenDocument ? tokenDocumentOrRqgActor : undefined;

    const actor =
      tokenDocumentOrRqgActor instanceof TokenDocument
        ? tokenDocumentOrRqgActor?.actor
        : tokenDocumentOrRqgActor;
    if (!actor) {
      ui.notifications?.error("Could not find an attacker actor to do the attack.");
      return;
    }

    const skillItem = actor?.getBestEmbeddedDocumentByRqid(
      weaponItem.system.usage[formDataObject.usageType].skillRqidLink?.rqid,
    );
    assertDocumentSubType<SkillItem>(skillItem, ItemTypeEnum.Skill, "Missing skillItem för attack");

    const combatManeuverName = getDomDataset(submitter, "combat-maneuver-name");

    const combatManeuver: CombatManeuver | undefined = weaponItem?.system.usage[
      formDataObject.usageType
    ].combatManeuvers.find((cm: CombatManeuver) => cm.name === combatManeuverName);

    requireValue(
      combatManeuver,
      "Missing combat maneuver",
      combatManeuverName,
      formDataObject.usageType,
      weaponItem,
    );

    if (formDataObject.usageType === "missile") {
      const projectileItem = AttackDialogV2.getWeaponProjectile(weaponItem);
      if (!projectileItem || projectileItem?.system.quantity <= 0) {
        ui.notifications?.warn(
          localize("RQG.Dialog.Attack.OutOfAmmoWarn", {
            projectileName: projectileItem?.name ?? "???",
            combatManeuverName: combatManeuver.name,
          }),
        );
        return;
      }

      if (formDataObject.reduceAmmoQuantity) {
        const newQuantity = projectileItem?.system.quantity - 1;
        if (newQuantity <= 0) {
          ui.notifications?.warn(
            localize("RQG.Dialog.Attack.UsedLastOfAmmoWarn", {
              projectileName: projectileItem?.name,
            }),
          );
        }
        await projectileItem?.update({ system: { quantity: newQuantity } });
        // @ts-expect-error render - Foundry binds `this` to the dialog instance at runtime
        await this.render(); // Make sure ammo count is updated in the dialog
      }
    }

    const usageTypeTranslated = localize(`RQG.Game.WeaponUsage.${formDataObject.usageType}`);
    const damageTypeTranslated = localize(
      `RQG.Item.Weapon.DamageTypeEnum.${combatManeuver.damageType}`,
    );

    const attackRollHeading = `<span class="roll-action">${localize("RQG.Dialog.Attack.Title")}</span>
    <span>${damageTypeTranslated} – ${weaponItem?.name} – ${usageTypeTranslated}</span>`;

    const attackRollOptions: AbilityRollOptions = {
      naturalSkill: skillItem.system.chance,
      modifiers: [
        {
          value: Number(formDataObject.augmentModifier),
          description: localize("RQG.Roll.AbilityRoll.Augment"),
        },
        {
          value: formDataObject.proneTarget ? proneTargetModifier : 0,
          description: localize("RQG.Roll.AbilityRoll.ProneTarget"),
        },
        {
          value: formDataObject.unawareTarget ? unawareTargetModifier : 0,
          description: localize("RQG.Roll.AbilityRoll.UnawareTarget"),
        },
        {
          value: formDataObject.darkness ? darknessModifier : 0,
          description: localize("RQG.Roll.AbilityRoll.Darkness"),
        },
        {
          value: formDataObject.halved ? Number(formDataObject.halvedModifier) : 0,
          description: localize("RQG.Roll.AbilityRoll.Halved"),
        },
        {
          value: formDataObject.aimedBlow > 0 ? Number(formDataObject.halvedModifier) : 0,
          description: localize("RQG.Roll.AbilityRoll.AimedBlow"),
        },
        {
          value: Number(formDataObject.otherModifier),
          description: formDataObject.otherModifierDescription,
        },
      ],
      heading: attackRollHeading,
      abilityName: weaponItem?.name ?? undefined,
      abilityType: weaponItem?.type ?? undefined,
      abilityImg: weaponItem?.img ?? undefined,
      speaker: RqgChatMessage.getSpeaker({
        token: tokenDocument,
        actor: tokenDocument ? undefined : actor,
      }), // Used to decide who can see the roll in chat
    };

    const attackRoll = new AbilityRoll(undefined, {}, attackRollOptions);

    const target = game.user?.targets.first();

    if ((game.user?.targets.size ?? 0) > 1) {
      ui.notifications?.info("Please target one token only");
    }

    const hitLocationRollOptions: HitLocationRollOptions = {
      hitLocationNames: [], // hitLocationNames are added in defenceDialog when the target definitely selected
      speaker: RqgChatMessage.getSpeaker({
        token: tokenDocument,
        actor: tokenDocument ? undefined : actor,
      }),
    };

    const hitLocationFormula =
      formDataObject.aimedBlow > 0
        ? formDataObject.aimedBlow.toString()
        : formDataObject.hitLocationFormula;

    const hitLocationRoll = new HitLocationRoll(hitLocationFormula, {}, hitLocationRollOptions);

    const chatSystemData: any = {
      attackState: `Attacked`,
      attackingTokenOrActorUuid: tokenDocumentOrRqgActor?.uuid ?? "",
      defendingTokenOrActorUuid: target?.document?.uuid ?? "",
      attackWeaponUuid: formDataObject.attackingWeaponUuid,
      attackWeaponUsage: formDataObject.usageType,
      attackCombatManeuver: combatManeuver,
      outcomeDescription: "",
      actorDamagedApplied: false,
      weaponDamageApplied: false,
      attackExtraDamage: formDataObject.attackExtraDamage,
      attackDamageBonus: formDataObject.attackDamageBonus.split("|").slice(1).join("|"),
      attackRoll: attackRoll.toJSON(),
      defenceRoll: undefined,
      damageRoll: undefined,
      ignoreDefenderAp: false,
      hitLocationRoll: hitLocationRoll.toJSON(),
      damagedWeaponUuid: "",
      weaponDamage: undefined,
      defenderHitLocationDamage: undefined,
      attackerFumbled: false,
      attackerFumbleOutcome: "",
      defenderFumbled: false,
      defenderFumbleOutcome: "",
    };

    const attackChatContent = await foundry.applications.handlebars.renderTemplate(
      templatePaths.attackChatMessage,
      chatSystemData,
    );

    const attackFlavor = localize("RQG.Dialog.Common.IsAttacking", {
      defenderName: `<b>${target?.document?.name ?? "???"}</b>`,
    });

    const attackChatMessageOptions = {
      type: "combat", // TODO ChatMessageTypes
      system: chatSystemData,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      flavor: attackFlavor,
      content: attackChatContent,
      speaker: ChatMessage.getSpeaker({
        token: tokenDocument,
        actor: tokenDocument ? undefined : actor,
      }),
    };

    activateChatTab();
    const cm = await ChatMessage.create(attackChatMessageOptions as any);
    cm?.render(true);
  }

  /**
   * Return a list of tokenUuids on the current scene the user has access to that also has at least one weapon to attack with.
   * Also returns the actors that the user owns and do not have a token in the current scene and has at least one weapon to attack with.
   */
  private static getAttackerOptions(): SelectOptionData<string>[] {
    const ownedTokensWithWeapons =
      game.scenes?.current?.tokens
        .filter((t) => t.isOwner)
        .filter((t) => AttackDialogV2.getWeaponOptions(t.uuid).length > 0) ?? [];

    const tokenOptions =
      ownedTokensWithWeapons.map((token) => ({
        value: token?.uuid ?? "",
        label: (token?.name ?? "") + getActorLinkDecoration(token.actor),
        group: localize("RQG.Dialog.Common.Tokens"),
      })) ?? [];

    const allowCombatWithoutToken = game.settings?.get(systemId, "allowCombatWithoutToken");
    let ownedActorOptions: any[] = [];
    if (allowCombatWithoutToken) {
      const tokenActorIds = ownedTokensWithWeapons.map((t) => t.actor?.id).filter(isTruthy);

      const ownedActors =
        game.actors?.filter(
          (a) =>
            a.isOwner &&
            !tokenActorIds.some((taId) => taId === a.id) &&
            AttackDialogV2.getWeaponOptions(a.uuid).length > 0,
        ) ?? [];
      ownedActorOptions = ownedActors.map((actor) => ({
        value: actor?.uuid ?? "",
        label: (actor.name ?? "") + getActorLinkDecoration(actor),
        group: localize("RQG.Dialog.Common.Actors"),
      }));
    }

    return [...tokenOptions, ...ownedActorOptions];
  }

  private static getAimedBlowOptions(target: RqgToken | undefined): SelectOptionData<number>[] {
    if (!target) {
      return [];
    }

    const optionsArray = (target.actor?.items.contents ?? [])
      .filter((i) => isDocumentSubType<HitLocationItem>(i, ItemTypeEnum.HitLocation))
      .sort((a: HitLocationItem, b: HitLocationItem) => b.system.dieFrom - a.system.dieFrom)
      .map((hitLocation: HitLocationItem) => ({
        value: hitLocation.system?.dieFrom,
        label: hitLocation.name ?? "",
      }));

    return [{ value: 0, label: "" }, ...optionsArray];
  }

  /**
   * show a list of weapons the actor has equipped and can be used for attacks.
   */
  private static getWeaponOptions(
    tokenOrActorUuid: string | undefined,
  ): SelectOptionData<string>[] {
    const actorOrToken = fromUuidSync(tokenOrActorUuid ?? "") as
      | TokenDocument
      | RqgActor
      | undefined;

    const actor = actorOrToken instanceof TokenDocument ? actorOrToken?.actor : actorOrToken;
    const offensiveDamageTypes = ["crush", "slash", "impale", "special"]; // Exclude parry
    const weaponsWithAttacks = (actor?.items.contents ?? []).filter(
      (i) =>
        isDocumentSubType<WeaponItem>(i, ItemTypeEnum.Weapon) &&
        (i.system.equippedStatus === "equipped" || i.system.isNatural) &&
        (i.system.usage.oneHand.combatManeuvers.some((cm: CombatManeuver) =>
          offensiveDamageTypes.includes(cm.damageType),
        ) ||
          i.system.usage.offHand.combatManeuvers.some((cm: CombatManeuver) =>
            offensiveDamageTypes.includes(cm.damageType),
          ) ||
          i.system.usage.twoHand.combatManeuvers.some((cm: CombatManeuver) =>
            offensiveDamageTypes.includes(cm.damageType),
          ) ||
          i.system.usage.missile.combatManeuvers.some((cm: CombatManeuver) =>
            offensiveDamageTypes.includes(cm.damageType),
          )),
    ) as WeaponItem[];

    return weaponsWithAttacks.map((item) => ({
      value: item.uuid ?? "",
      label: item.name ?? "",
    }));
  }

  private static getUsageTypeOptions(weapon: RqgItem | undefined): SelectOptionData<UsageType>[] {
    if (weapon == null) {
      return [];
    }
    assertDocumentSubType<WeaponItem>(weapon, ItemTypeEnum.Weapon);
    return Object.entries<Usage>(weapon.system.usage).reduce((acc: any, [key, usage]) => {
      if (usage?.skillRqidLink?.rqid) {
        acc.push({ value: key, label: localize(`RQG.Game.WeaponUsage.${key}-full`) });
      }
      return acc;
    }, []);
  }

  /**
   * Get the damage bonus source options from non-humanoid tokens on the active scene that the user owns.
   * The idea is that horses and other rideable animals should show up here.
   * This does not have any support for actor based combat without tokens.
   */
  private static getDamageBonusSourceOptions(
    weapon: RqgItem | undefined,
  ): SelectOptionData<string>[] {
    if (weapon == null) {
      return [];
    }
    assertDocumentSubType<WeaponItem>(weapon, ItemTypeEnum.Weapon);

    const weaponOwner = weapon.parent;
    if (!weaponOwner) {
      throw new RqgError("weapon did not have an owner");
    }
    assertDocumentSubType<CharacterActor>(weaponOwner, ActorTypeEnum.Character);

    const nonHumanoids =
      game.scenes?.current?.tokens
        ?.filter(
          (t) =>
            t.isOwner &&
            !!(t.actor as CharacterActor)?.system?.attributes?.damageBonus &&
            t.actor?.getBodyType() !== "humanoid",
        )
        ?.map((token: TokenDocument) => ({
          value: `${token.id}|${(token.actor as CharacterActor)?.system.attributes?.damageBonus ?? ""}`,
          label: token.name ?? "",
        })) ?? [];

    nonHumanoids.unshift({
      value: `${weaponOwner.id}|${weaponOwner.system.attributes?.damageBonus ?? ""}`,
      label: weaponOwner.name ?? "",
    });

    return nonHumanoids;
  }

  private static getHitLocationFormulaOptions(aim: number = 0): SelectOptionData<string>[] {
    if (aim > 0) {
      return [{ value: aim.toString(), label: localize("RQG.Dialog.Attack.AimedBlow") }];
    }

    return [
      { value: "1d20", label: localize("RQG.Dialog.Attack.HitLocationFormulaOptions.1d20") },
      { value: "1d10", label: localize("RQG.Dialog.Attack.HitLocationFormulaOptions.1d10") },
      { value: "1d10+10", label: localize("RQG.Dialog.Attack.HitLocationFormulaOptions.1d10+10") },
    ];
  }

  private static getWeaponProjectile(weaponItem: RqgItem | undefined): WeaponItem | undefined {
    assertDocumentSubType<WeaponItem>(weaponItem, ItemTypeEnum.Weapon);
    if (weaponItem?.system.isThrownWeapon) {
      return weaponItem;
    } else if (weaponItem?.system.isProjectileWeapon) {
      return weaponItem.parent?.items.get(weaponItem.system.projectileId) as WeaponItem | undefined;
    } else if (weaponItem?.system.isRangedWeapon) {
      // Should not decrease any quantity, keep projectileItem undefined
      return undefined;
    } else {
      const msg = "Tried to do a missile attack with a projectile. Arrows should not have actions.";
      ui.notifications?.warn(msg);
      console.log("RQG |", msg);
      return undefined;
    }
  }
}

import { AttackDialogHandlebarsData, AttackDialogObjectData } from "./AttackDialogData.types";

import {
  assertHtmlElement,
  assertItemType,
  getDomDataset,
  getGame,
  getGameUser,
  getTokenFromItem,
  localize,
  requireValue,
  RqgError,
} from "../../system/util";
import type { RqgActor } from "../../actors/rqgActor";
import type { RqgItem } from "../../items/rqgItem";
import { RqgToken } from "../../combat/rqgToken";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { CombatManeuver, Usage, UsageType } from "../../data-model/item-data/weaponData";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { systemId } from "../../system/config";
import { ChatMessageTypes } from "../../data-model/chat-data/combatChatMessage.dataModel";
import { AbilityRollOptions } from "../../rolls/AbilityRoll/AbilityRoll.types";
import {
  darknessModifier,
  proneTargetModifier,
  unawareTargetModifier,
} from "../../system/penaltyConstants";
import { RqgChatMessage } from "../../chat/RqgChatMessage";
import { AbilityRoll } from "../../rolls/AbilityRoll/AbilityRoll";
import { HitLocationRollOptions } from "../../rolls/HitLocationRoll/HitLocationRoll.types";
import { HitLocationRoll } from "../../rolls/HitLocationRoll/HitLocationRoll";
import { AttackDialogOptions } from "../../chat/RqgChatMessage.types";

// @ts-expect-error application v2
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class AttackDialogV2 extends HandlebarsApplicationMixin(ApplicationV2) {
  declare element: HTMLFormElement;

  private static augmentOptions = {
    "0": "RQG.Dialog.Common.AugmentOptions.None",
    "50": "RQG.Dialog.Common.AugmentOptions.CriticalSuccess",
    "30": "RQG.Dialog.Common.AugmentOptions.SpecialSuccess",
    "20": "RQG.Dialog.Common.AugmentOptions.Success",
    "-20": "RQG.Dialog.Common.AugmentOptions.Failure",
    "-50": "RQG.Dialog.Common.AugmentOptions.Fumble",
  };

  private weaponItem: RqgItem; // The chosen actor might not have any weapon

  constructor(options: Partial<AttackDialogOptions> = {}) {
    super(options as any);
    // @ts-expect-error weaponItem
    this.weaponItem = options.weaponItem;
    const attackingToken = getTokenFromItem(this.weaponItem);

    if (!attackingToken) {
      const msg = localize("RQG.Dialog.Attack.NoTokenToAttackWith");
      ui.notifications?.warn(msg);
      setTimeout(() => {
        // @ts-expect-error close
        void this.close();
      }, 500); // Wait to make sure the dialog exists before closing - TODO ugly hack
      throw new RqgError(msg);
    }
  }

  static DEFAULT_OPTIONS = {
    id: "{id}",
    tag: "form",
    form: {
      handler: AttackDialogV2.onSubmit,
      submitOnChange: false,
      closeOnSubmit: false,
    },
    position: {
      width: 400,
      left: 35,
      top: 15,
    },
    window: {
      resizable: true,
      contentClasses: [systemId, "form", "roll-dialog", "attack-dialog"],
    },
  };

  static PARTS = {
    form: {
      template: templatePaths.attackDialogV2,
    },
  };

  get title() {
    return localize("RQG.Dialog.Attack.Title");
  }

  async _prepareContext(): Promise<AttackDialogHandlebarsData> {
    const formData: AttackDialogObjectData =
      // @ts-expect-error object
      (this.element && new FormDataExtended(this.element, {}).object) ?? {};

    const attackingToken = getTokenFromItem(this.weaponItem);
    if (!attackingToken) {
      const msg = localize("RQG.Dialog.Attack.NoTokenToAttackWith");
      ui.notifications?.warn(msg);
      // @ts-expect-error close
      this.close();
      throw new RqgError(msg);
    }
    formData.attackingTokenUuid = attackingToken.uuid;

    const tokenOptions = AttackDialogV2.getTokenOptions();
    const weaponOptions = AttackDialogV2.getWeaponOptions(attackingToken?.uuid);
    const usageTypeOptions = AttackDialogV2.getUsageTypeOptions(this.weaponItem);

    formData.usageType =
      this.weaponItem.system.defaultUsage ?? (Object.keys(usageTypeOptions)[0] as UsageType);

    if (this.weaponItem.system.defaultUsage !== formData.usageType) {
      await this.weaponItem.update({
        system: { defaultUsage: formData.usageType },
      });
    }

    let isOutOfAmmo = false;
    let ammoQuantity: number = 1;

    if (formData.usageType === "missile") {
      const projectileItem = AttackDialogV2.getWeaponProjectile(this.weaponItem);
      ammoQuantity = projectileItem?.system.quantity;
      isOutOfAmmo = ammoQuantity <= 0;
    }

    const skillRqid: string | undefined =
      this.weaponItem?.system.usage[formData.usageType].skillRqidLink.rqid;
    const usedSkill = this.weaponItem?.actor?.getBestEmbeddedDocumentByRqid(skillRqid);
    formData.halvedModifier = -Math.floor(usedSkill?.system.chance / 2);

    if (getGameUser().targets.size > 1) {
      ui.notifications?.info("Please target one token only");
    }

    // @ts-expect-error first
    const target = getGameUser().targets.first() as RqgToken | undefined;

    const damageBonusSourceOptions = AttackDialogV2.getDamageBonusSourceOptions(this.weaponItem);
    formData.attackingWeaponUuid ??= this.weaponItem.uuid;
    formData.attackDamageBonus ??= damageBonusSourceOptions[0]?.value;
    formData.otherModifierDescription ??= localize("RQG.Dialog.Attack.OtherModifier");
    formData.reduceAmmoQuantity ??= true;
    formData.aimedBlow = formData.aimedBlow ? Number(formData.aimedBlow) : 0;
    formData.attackDamageBonus ??= Object.keys(
      AttackDialogV2.getDamageBonusSourceOptions(this.weaponItem),
    )[0];

    return {
      formData: formData,
      weaponItem: this.weaponItem.toObject() as any,
      skillItem: usedSkill,
      abilityChance: usedSkill?.system.chance,
      ammoQuantity: ammoQuantity,
      isOutOfAmmo: isOutOfAmmo,
      attackingTokenOptions: tokenOptions,
      defendingTokenName: target?.name ?? localize("RQG.Dialog.Attack.NoTargetSelected"),
      attackingWeaponOptions: weaponOptions,
      usageTypeOptions: usageTypeOptions,
      augmentOptions: AttackDialogV2.augmentOptions,
      damageBonusSourceOptions: damageBonusSourceOptions,
      hitLocationFormulaOptions: AttackDialogV2.getHitLocationFormulaOptions(),
      aimedBlowOptions: AttackDialogV2.getAimedBlowOptions(target),

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
    };
  }

  _onRender(context: any, options: any) {
    super._onRender(context, options);
    // @ts-expect-error element
    this.element
      .querySelector("select[name=attackingTokenUuid]")
      .addEventListener("change", this.onTokenChange.bind(this));

    // @ts-expect-error element
    this.element
      .querySelector("select[name=attackingWeaponUuid]")
      .addEventListener("change", this.onWeaponChange.bind(this));

    // @ts-expect-error element
    this.element
      .querySelector("select[name=usageType]")
      .addEventListener("change", this.onUsageChange.bind(this));
  }

  _onChangeForm(): void {
    // @ts-expect-error render
    this.render();
  }

  private async onTokenChange(event: Event): Promise<void> {
    console.log("onTokenChange", event);

    const tokenSelectElement = event.target;
    requireValue(tokenSelectElement, "Token select not working - programming error");
    assertHtmlElement<HTMLSelectElement>(tokenSelectElement);

    const weaponOptions = AttackDialogV2.getWeaponOptions(tokenSelectElement.value);
    const weaponUuid = Object.keys(weaponOptions)?.[0]; // TODO for now just pick any weapon;

    const weaponItem = (await fromUuid(weaponUuid ?? "")) as RqgItem | undefined;

    if (!weaponItem) {
      ui.notifications?.warn("No weapon found for the selected token, can't be used for attack");
      return;
    }
    this.weaponItem = weaponItem;
    //
    // const formElement = tokenSelectElement?.closest("form");
    // requireValue(formElement, "Form not found - programming error");
    // assertHtmlElement(formElement);
    //
    // formElement.attackingWeaponUuid.value = weaponUuid;

    // @ts-expect-error render
    this.render();
  }

  private async onWeaponChange(event: Event): Promise<void> {
    const weaponSelectElement = event.target;
    requireValue(weaponSelectElement, "Weapon select not working - programming error");
    assertHtmlElement<HTMLSelectElement>(weaponSelectElement);
    const weaponItem = (await fromUuid(weaponSelectElement.value ?? "")) as RqgItem | undefined;
    requireValue(weaponItem, "Weapon not found - programming error", weaponSelectElement.value);
    this.weaponItem = weaponItem;

    // @ts-expect-error render
    this.render();
  }

  private async onUsageChange(event: Event): Promise<void> {
    const usageSelectElement = event.target;
    requireValue(usageSelectElement, "Usage select not working - programming error");
    assertHtmlElement<HTMLSelectElement>(usageSelectElement);

    await this.weaponItem.update({
      system: { defaultUsage: usageSelectElement.value },
    });

    // @ts-expect-error render
    this.render();
  }

  /**
   * Create a type "combat" ChatMessage when the form is submitted.
   */
  // static performCombatManeuverName(event: PointerEvent, el: HTMLElement): void {
  private static async onSubmit(
    event: SubmitEvent,
    form: HTMLFormElement,
    formData: any,
  ): Promise<void> {
    const submitter = event.submitter;
    const formDataObject: AttackDialogObjectData = formData.object;

    console.log("TODO AttackDialogV2 submitted", event, form, formData);
    if (!(submitter instanceof HTMLButtonElement)) {
      ui.notifications?.warn("Button not working - programming error");
      return;
    }
    submitter.disabled = true;
    setTimeout(() => (submitter.disabled = false), 1000);

    const weaponItem = (await fromUuid(formDataObject.attackingWeaponUuid ?? "")) as
      | RqgItem
      | undefined;

    const tokenDocument = (await fromUuid(formDataObject.attackingTokenUuid ?? "")) as
      | TokenDocument
      | undefined;

    const actor = tokenDocument?.actor ?? undefined;
    if (!actor) {
      ui.notifications?.error("Could not find an attacker actor to do the attack.");
      return;
    }

    const skillItem = actor?.getBestEmbeddedDocumentByRqid(
      weaponItem?.system.usage[formDataObject.usageType].skillRqidLink.rqid,
    );
    requireValue(skillItem, "Missing skillItem för attack", actor);

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
      if (projectileItem?.system.quantity <= 0) {
        ui.notifications?.warn(
          localize("RQG.Dialog.Attack.OutOfAmmoWarn", {
            projectileName: projectileItem?.name,
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
        // @ts-expect-error render
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
      speaker: RqgChatMessage.getSpeaker({ token: tokenDocument }), // Used to decide who can see the roll in chat
    };

    const attackRoll = new AbilityRoll(undefined, {}, attackRollOptions);

    // @ts-expect-error first
    const target = getGameUser().targets.first() as RqgToken | undefined;

    if (getGameUser().targets.size > 1) {
      ui.notifications?.info("Please target one token only");
    }

    const hitLocationRollOptions: HitLocationRollOptions = {
      hitLocationNames: [], // hitLocationNames are added in defenceDialog when the target definitely selected
      speaker: RqgChatMessage.getSpeaker({ token: tokenDocument }),
    };

    const hitLocationFormula =
      formDataObject.aimedBlow > 0
        ? formDataObject.aimedBlow.toString()
        : formDataObject.hitLocationFormula;

    const hitLocationRoll = new HitLocationRoll(hitLocationFormula, {}, hitLocationRollOptions);

    const chatSystemData: any = {
      attackState: `Attacked`,
      attackingTokenUuid: tokenDocument?.uuid ?? "",
      defendingTokenUuid: target?.document?.uuid,
      attackWeaponUuid: formDataObject.attackingWeaponUuid ?? "", // Checked for existence earlier
      attackWeaponUsage: formDataObject.usageType,
      attackCombatManeuver: combatManeuver,
      outcomeDescription: "",
      actorDamagedApplied: false,
      weaponDamageApplied: false,
      attackExtraDamage: formDataObject.attackExtraDamage,
      attackDamageBonus: formDataObject.attackDamageBonus?.split(":")[1] ?? "0",
      attackRoll: attackRoll,
      defenceRoll: undefined,
      damageRoll: undefined,
      ignoreDefenderAp: false,
      hitLocationRoll: hitLocationRoll,
      damagedWeaponUuid: "",
      weaponDamage: undefined,
      defenderHitLocationDamage: undefined,
      attackerFumbled: false,
      attackerFumbleOutcome: "",
      defenderFumbled: false,
      defenderFumbleOutcome: "",
    };

    const attackChatContent = await renderTemplate(templatePaths.attackChatMessage, chatSystemData);

    const attackFlavor = localize("RQG.Dialog.Common.IsAttacking", {
      defenderName: `<b>${target?.document?.name ?? "???"}</b>`,
    });

    const attackChatMessageOptions = {
      type: ChatMessageTypes.Combat,
      system: chatSystemData,
      // @ts-expect-error CHAT_MESSAGE_STYLES
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      flavor: attackFlavor,
      content: attackChatContent,
      speaker: ChatMessage.getSpeaker({
        token: actor.token ?? undefined,
      }),
    };

    // @ts-expect-error type
    const cm = await ChatMessage.create(attackChatMessageOptions);
    cm?.render(true);
  }

  /**
   * Return a list of tokens on the current scene the user has access to that also has at least one weapon to attack with
   */
  private static getTokenOptions(): Record<string, string> {
    return (
      getGame()
        .scenes?.active?.tokens.filter((t) => t.isOwner)
        .filter((t) => Object.keys(AttackDialogV2.getWeaponOptions(t.uuid)).length > 0)
        ?.reduce((acc: any, token) => {
          acc[token?.uuid ?? ""] = token?.name;
          return acc;
        }, {}) ?? {}
    );
  }

  private static getAimedBlowOptions(target: RqgToken | undefined): SelectOptionData<number>[] {
    if (!target) {
      return [];
    }

    const optionsArray = (target.actor?.items ?? [])
      .filter((i) => i.type === ItemTypeEnum.HitLocation)
      .sort((a: any, b: any) => b.system.dieFrom - a.system.dieFrom)
      .map((hitLocation: RqgItem) => ({
        value: hitLocation.system.dieFrom,
        label: hitLocation.name ?? "",
      }));

    return [{ value: 0, label: "" }, ...optionsArray];
  }

  /**
   * show a list of weapons the actor has equipped and can be used for attacks.
   */
  private static getWeaponOptions(tokenUuid: string | undefined): Record<string, string> {
    // @ts-expect-error fromUuidSync
    const actor = fromUuidSync(tokenUuid ?? "")?.actor as RqgActor | undefined;
    const offensiveDamageTypes = ["crush", "slash", "impale", "special"]; // Exclude parry
    const weaponsWithAttacks = (actor?.items ?? []).filter(
      (i) =>
        i.type === ItemTypeEnum.Weapon &&
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
    );

    return weaponsWithAttacks?.reduce((acc: any, item) => {
      acc[item.uuid ?? ""] = item.name;
      return acc;
    }, {});
  }

  private static getUsageTypeOptions(weapon: RqgItem | undefined): Record<UsageType, string> {
    if (weapon == null) {
      return {} as Record<UsageType, string>;
    }
    assertItemType(weapon.type, ItemTypeEnum.Weapon);
    return Object.entries<Usage>(weapon.system.usage).reduce((acc: any, [key, usage]) => {
      if (usage?.skillRqidLink?.rqid) {
        acc[key] = localize(`RQG.Game.WeaponUsage.${key}-full`);
      }
      return acc;
    }, {});
  }

  /**
   * Get the damage bonus source options from non-humanoid tokens on the active scene that the user owns.
   * The idea is that horses and other rideable animals should show up here.
   * The token actor owning the weapon is always included at position [0] in the list.
   */
  private static getDamageBonusSourceOptions(
    weapon: RqgItem | undefined,
  ): SelectOptionData<string>[] {
    if (weapon == null) {
      return [];
    }
    assertItemType(weapon.type, ItemTypeEnum.Weapon);

    const weaponOwner = weapon.parent;
    if (!weaponOwner) {
      throw new RqgError("weapon did not have an owner");
    }

    const weaponOwnerOptionKey = `${weaponOwner.id}:${weaponOwner.system.attributes?.damageBonus}`;
    const nonHumanoids = getGame()
      .scenes?.active?.tokens?.filter(
        (t) =>
          t.isOwner &&
          !!t.actor?.system?.attributes?.damageBonus &&
          t.actor.getBodyType() !== "humanoid",
      )
      ?.reduce(
        (acc: SelectOptionData<string>[], token: TokenDocument) => {
          const optionKey = `${token.id}:${token.actor?.system.attributes?.damageBonus}`;
          acc.push({ value: optionKey, label: token.name ?? "" });
          return acc;
        },
        [
          {
            value: weaponOwnerOptionKey,
            label: weaponOwner.name ?? "",
          },
        ],
      );
    return nonHumanoids ?? [];
  }

  private static getHitLocationFormulaOptions(aim: number = 0): Record<string, string> {
    if (aim > 0) {
      return {
        [aim]: localize("RQG.Dialog.Attack.AimedBlow"),
      };
    }

    return {
      "1d20": localize("RQG.Dialog.Attack.HitLocationFormulaOptions.1d20"),
      "1d10": localize("RQG.Dialog.Attack.HitLocationFormulaOptions.1d10"),
      "1d10+10": localize("RQG.Dialog.Attack.HitLocationFormulaOptions.1d10+10"),
    };
  }

  private static getWeaponProjectile(weaponItem: RqgItem | undefined): RqgItem | undefined {
    if (weaponItem?.system.isThrownWeapon) {
      return weaponItem;
    } else if (weaponItem?.system.isProjectileWeapon) {
      return weaponItem.parent?.items.get(weaponItem.system.projectileId);
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

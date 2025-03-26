import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { AttackDialogHandlebarsData, AttackDialogObjectData } from "./AttackDialogData.types";
import { AbilityRoll } from "../../rolls/AbilityRoll/AbilityRoll";
import { AbilityRollOptions } from "../../rolls/AbilityRoll/AbilityRoll.types";
import {
  assertItemType,
  getDomDataset,
  getGame,
  getGameUser,
  localize,
  requireValue,
  RqgError,
  toKebabCase,
  trimChars,
} from "../../system/util";
import type { RqgActor } from "../../actors/rqgActor";
import type { RqgItem } from "../../items/rqgItem";
import { AttackDialogOptions } from "../../chat/RqgChatMessage.types";
import { AttackChatFlags } from "../../data-model/shared/rqgDocumentFlags";
import { RqgToken } from "../../combat/rqgToken";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { CombatManeuver, Usage, UsageType } from "../../data-model/item-data/weaponData";
import {
  darknessModifier,
  proneTargetModifier,
  unawareTargetModifier,
} from "../../system/penaltyConstants";
import { RqgChatMessage } from "../../chat/RqgChatMessage";

export class AttackDialog extends FormApplication<
  FormApplication.Options,
  AttackDialogHandlebarsData,
  AttackDialogObjectData
> {
  private augmentOptions = {
    "0": "RQG.Dialog.Common.AugmentOptions.None",
    "50": "RQG.Dialog.Common.AugmentOptions.CriticalSuccess",
    "30": "RQG.Dialog.Common.AugmentOptions.SpecialSuccess",
    "20": "RQG.Dialog.Common.AugmentOptions.Success",
    "-20": "RQG.Dialog.Common.AugmentOptions.Failure",
    "-50": "RQG.Dialog.Common.AugmentOptions.Fumble",
  };

  private halvedModifier: number = 0;

  constructor(weaponItem: RqgItem, options: Partial<AttackDialogOptions> = {}) {
    const owningActorTokens = (weaponItem.parent?.getActiveTokens() ?? []) as unknown as RqgToken[];
    const attackingToken =
      owningActorTokens[0] ??
      getGame().scenes?.active?.tokens.find((t) => t.actor?.id === weaponItem.parent?.id);

    const formData: AttackDialogObjectData = {
      attackingTokenUuid: attackingToken?.document.uuid,
      attackingWeaponUuid: weaponItem.uuid,
      usageType: weaponItem.system.defaultUsage,
      augmentModifier: "0",
      proneTarget: false,
      unawareTarget: false,
      darkness: false,
      halved: false,
      otherModifier: "0",
      otherModifierDescription: localize("RQG.Dialog.Attack.OtherModifier"),
      attackExtraDamage: "",
      attackDamageBonus: "",
      hitLocationFormula: "1d20",
    };

    super(formData, options as any);

    if (!attackingToken) {
      const msg = localize("RQG.Dialog.Attack.NoTokenToAttackWith");
      ui.notifications?.warn(msg);
      setTimeout(() => {
        void this.close();
      }, 500); // Wait to make sure the dialog exists before closing - TODO ugly hack
      throw new RqgError(msg);
    }
    this.object = formData;
  }

  get id() {
    return `${this.constructor.name}-${trimChars(toKebabCase(this.object.attackingTokenUuid), "-")}`;
  }

  static get defaultOptions(): FormApplication.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "form", "roll-dialog", "attack-dialog"],
      popOut: true,
      template: templatePaths.attackDialog,
      width: 400,
      left: 35,
      top: 15,
      title: "RQG.Dialog.Attack.Title",
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
      resizable: true,
    });
  }

  async getData(): Promise<AttackDialogHandlebarsData> {
    if (!this.object.attackingWeaponUuid) {
      // If there is no weapon, then the actor probably has changed. Reload the weapon list and choose one
      this.object.attackingWeaponUuid = Object.keys(
        await this.getWeaponOptions(this.object.attackingTokenUuid),
      )[0];
    }

    const weaponItem = (await fromUuid(this.object.attackingWeaponUuid ?? "")) as
      | RqgItem
      | undefined;

    const tokenOptions = this.getTokenOptions();
    const weaponOptions = await this.getWeaponOptions(this.object.attackingTokenUuid);
    const usageTypeOptions = this.getUsageTypeOptions(weaponItem);
    if (
      !weaponItem?.system.defaultUsage ||
      !Object.keys(usageTypeOptions).includes(this.object.usageType)
    ) {
      // Pick the first usage if none is selected (or if the selected isn't available)
      const defaultUsage = Object.keys(usageTypeOptions)[0] as UsageType;
      this.object.usageType = defaultUsage;
      await weaponItem?.update({
        system: { defaultUsage: defaultUsage },
      });
    }
    if (this.object.attackDamageBonus == null) {
      // Default the damage bonus to the attacking actor if none is selected
      this.object.attackDamageBonus = Object.keys(this.getDamageBonusSourceOptions(weaponItem))[0];
    }

    let isOutOfAmmo = false;
    let ammoQuantity: number = 1;
    if (this.object.usageType === "missile") {
      const projectileItem = this.getWeaponProjectile(weaponItem);

      ammoQuantity = projectileItem?.system.quantity;
      isOutOfAmmo = ammoQuantity <= 0;
    }

    const skillRqid: string | undefined =
      weaponItem?.system.usage[this.object.usageType].skillRqidLink.rqid;
    const usedSkill = weaponItem?.actor?.getBestEmbeddedDocumentByRqid(skillRqid);
    this.halvedModifier = -Math.floor(usedSkill?.system.chance / 2);
    return {
      weaponItem: weaponItem,
      skillItem: usedSkill,
      abilityChance: usedSkill?.system.chance,
      object: this.object,
      options: this.options,
      title: this.title,
      ammoQuantity: ammoQuantity,
      isOutOfAmmo: isOutOfAmmo,
      attackingTokenOptions: tokenOptions,
      attackingWeaponOptions: weaponOptions,
      usageTypeOptions: usageTypeOptions,
      augmentOptions: this.augmentOptions,
      damageBonusSourceOptions: this.getDamageBonusSourceOptions(weaponItem),
      hitLocationFormulaOptions: this.getHitLocationFormulaOptions(),
      halvedModifier: this.halvedModifier,
      totalChance: Math.max(
        0,
        Number(usedSkill?.system.chance ?? 0) +
          Number(this.object.augmentModifier ?? 0) +
          Number(this.object.otherModifier ?? 0) +
          (this.object.proneTarget ? proneTargetModifier : 0) +
          (this.object.unawareTarget ? unawareTargetModifier : 0) +
          (this.object.darkness ? darknessModifier : 0) +
          (this.object.halved ? this.halvedModifier : 0),
      ),
    };
  }

  async _updateObject(event: Event, formData: AttackDialogObjectData): Promise<void> {
    if (this.object.attackingTokenUuid !== formData["attackingTokenUuid"]) {
      const weaponOptions = await this.getWeaponOptions(formData["attackingTokenUuid"]);
      this.object.attackingWeaponUuid = Object.keys(weaponOptions)?.[0]; // TODO for now just pick any weapon
      formData["attackingWeaponUuid"] = this.object.attackingWeaponUuid;
      this.object.attackDamageBonus = undefined; // Make sure it is updated with the new actor's db
      formData["attackingWeaponUuid"] = undefined;
    }

    const weaponItem = (await fromUuid(this.object.attackingWeaponUuid ?? "")) as
      | RqgItem
      | undefined;

    // Initiate an update of the embedded weapon defaultUsage to store the preferred usage for next attack
    if (weaponItem?.system.defaultUsage !== formData["usageType"]) {
      await weaponItem?.update({
        system: { defaultUsage: formData["usageType"] },
      });
    }

    this.object = formData;
    this.render(true);
  }

  activateListeners(html: JQuery): void {
    // Do the roll to chat
    html[0]?.querySelectorAll<HTMLButtonElement>("[data-combat-maneuver-name]").forEach((el) => {
      el.addEventListener("click", async () => {
        el.disabled = true;
        setTimeout(() => (el.disabled = false), 1000);

        const weaponItem = (await fromUuid(this.object.attackingWeaponUuid ?? "")) as
          | RqgItem
          | undefined;

        const tokenDocument = (await fromUuid(this.object.attackingTokenUuid ?? "")) as
          | TokenDocument
          | undefined;

        const actor = tokenDocument?.actor ?? undefined;
        if (!actor) {
          ui.notifications?.error("Could not find an attacker actor to do the attack.");
          return;
        }

        const skillItem = actor?.getBestEmbeddedDocumentByRqid(
          weaponItem?.system.usage[this.object.usageType].skillRqidLink.rqid,
        );
        requireValue(skillItem, "Missing skillItem för attack", actor);

        const combatManeuverName = getDomDataset(el, "combat-maneuver-name");

        const combatManeuver: CombatManeuver | undefined = weaponItem?.system.usage[
          this.object.usageType
        ].combatManeuvers.find((cm: CombatManeuver) => cm.name === combatManeuverName);

        requireValue(
          combatManeuver,
          "Missing combat maneuver",
          combatManeuverName,
          this.object.usageType,
          weaponItem,
        );

        if (this.object.usageType === "missile") {
          const projectileItem = this.getWeaponProjectile(weaponItem);
          if (projectileItem?.system.quantity <= 0) {
            ui.notifications?.warn(
              localize("RQG.Dialog.Attack.OutOfAmmoWarn", {
                projectileName: projectileItem?.name,
                combatManeuverName: combatManeuver.name,
              }),
            );
            return;
          }
          const newQuantity = projectileItem?.system.quantity - 1;
          if (newQuantity <= 0) {
            ui.notifications?.warn(
              localize("RQG.Dialog.Attack.UsedLastOfAmmoWarn", {
                projectileName: projectileItem?.name,
              }),
            );
          }
          await projectileItem?.update({ system: { quantity: newQuantity } });
          await this.render(true); // Make sure ammo count is updated in the dialog
        }

        const usageTypeTranslated = localize(`RQG.Game.WeaponUsage.${this.object.usageType}`);
        const damageTypeTranslated = localize(
          `RQG.Item.Weapon.DamageTypeEnum.${combatManeuver.damageType}`,
        );

        const attackRollHeading = `<span class="roll-action">${localize("RQG.Dialog.weaponChat.AttackSpecification")}</span>
<span>${damageTypeTranslated} – ${weaponItem?.name} – ${usageTypeTranslated}</span>`;

        const attackRollOptions: AbilityRollOptions = {
          naturalSkill: skillItem.system.chance,
          modifiers: [
            {
              value: Number(this.object.augmentModifier),
              description: localize("RQG.Roll.AbilityRoll.Augment"),
            },
            {
              value: this.object.proneTarget ? proneTargetModifier : 0,
              description: localize("RQG.Roll.AbilityRoll.ProneTarget"),
            },
            {
              value: this.object.unawareTarget ? unawareTargetModifier : 0,
              description: localize("RQG.Roll.AbilityRoll.UnawareTarget"),
            },
            {
              value: this.object.darkness ? darknessModifier : 0,
              description: localize("RQG.Roll.AbilityRoll.Darkness"),
            },
            {
              value: this.object.halved ? this.halvedModifier : 0,
              description: localize("RQG.Roll.AbilityRoll.Halved"),
            },
            {
              value: Number(this.object.otherModifier),
              description: this.object.otherModifierDescription,
            },
          ],
          heading: attackRollHeading,
          abilityName: weaponItem?.name ?? undefined,
          abilityType: weaponItem?.type ?? undefined,
          abilityImg: weaponItem?.img ?? undefined,
          speaker: RqgChatMessage.getSpeaker({ token: tokenDocument }), // Used to decide who can see the roll in chat
        };

        const attackRoll = new AbilityRoll(undefined, {}, attackRollOptions);

        if (getGameUser().targets.size > 1) {
          ui.notifications?.info("Please target one token only");
        }

        // @ts-expect-error first
        const target = getGameUser().targets.first() as RqgToken | undefined;

        const chatData: AttackChatFlags = {
          type: "attackChat",
          chat: {
            attackState: `Attacked`,
            attackingTokenUuid: tokenDocument?.uuid ?? "",
            defendingTokenUuid: target?.document?.uuid,
            attackWeaponUuid: this.object.attackingWeaponUuid ?? "", // Checked for existence earlier
            attackWeaponUsage: this.object.usageType,
            attackCombatManeuver: combatManeuver,
            outcomeDescription: "",
            actorDamagedApplied: false,
            weaponDamageApplied: false,
            attackExtraDamage: this.object.attackExtraDamage,
            attackDamageBonus: this.object.attackDamageBonus?.split(":")[1] ?? "0",
            attackRoll: attackRoll,
            defenceRoll: undefined,
            damageRoll: undefined,
            ignoreDefenderAp: false,
            hitLocationRoll: new Roll(this.object.hitLocationFormula),
            damagedWeaponUuid: "",
            weaponDamage: undefined,
            defenderHitLocationDamage: undefined,
            attackerFumbled: false,
            attackerFumbleOutcome: "",
            defenderFumbled: false,
            defenderFumbleOutcome: "",
          },
        };
        const attackChatContent = await renderTemplate(
          templatePaths.attackChatMessage,
          chatData.chat,
        );

        const attackFlavor = localize("RQG.Dialog.Common.IsAttacking", {
          defenderName: `<b>${target?.document?.name ?? "???"}</b>`,
        });

        const attackChatMessageOptions = {
          // @ts-expect-error CHAT_MESSAGE_STYLES
          type: CONST.CHAT_MESSAGE_STYLES.OTHER,
          flavor: attackFlavor,
          content: attackChatContent,
          speaker: ChatMessage.getSpeaker({
            token: actor.token ?? undefined,
          }),
          flags: {
            rqg: chatData,
          },
        };

        const cm = await ChatMessage.create(attackChatMessageOptions);
        cm?.render(true);
      });
    });

    super.activateListeners(html);
  }

  /**
   * Return a list of tokens on the current scene the user has access to
   */
  private getTokenOptions(): Record<string, string> {
    return (
      getGame()
        .scenes?.active?.tokens.filter((t) => t.isOwner)
        ?.reduce((acc: any, token) => {
          acc[token?.uuid ?? ""] = token?.name;
          return acc;
        }, {}) ?? {}
    );
  }

  /**
   * show a list of weapons the actor has equipped and can be used for attacks.
   */
  private async getWeaponOptions(tokenUuid: string | undefined): Promise<Record<string, string>> {
    // @ts-expect-error actor
    const actor = (await fromUuid(tokenUuid ?? ""))?.actor as RqgActor | undefined;
    const weaponsWithAttacks = (actor?.items ?? []).filter(
      (i) =>
        i.type === ItemTypeEnum.Weapon &&
        (i.system.equippedStatus === "equipped" || i.system.isNatural) &&
        (i.system.usage.oneHand.combatManeuvers.some((cm: CombatManeuver) =>
          ["crush", "slash", "impale", "special"].includes(cm.damageType),
        ) ||
          i.system.usage.offHand.combatManeuvers.some((cm: CombatManeuver) =>
            ["crush", "slash", "impale", "special"].includes(cm.damageType),
          ) ||
          i.system.usage.twoHand.combatManeuvers.some((cm: CombatManeuver) =>
            ["crush", "slash", "impale", "special"].includes(cm.damageType),
          ) ||
          i.system.usage.missile.combatManeuvers.some((cm: CombatManeuver) =>
            ["crush", "slash", "impale", "special"].includes(cm.damageType),
          )),
    );

    return weaponsWithAttacks?.reduce((acc: any, item) => {
      acc[item.uuid ?? ""] = item.name;
      return acc;
    }, {});
  }

  getUsageTypeOptions(weapon: RqgItem | undefined): Record<UsageType, string> {
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

  getDamageBonusSourceOptions(weapon: RqgItem | undefined): Record<string, string> {
    if (weapon == null) {
      return {};
    }
    assertItemType(weapon.type, ItemTypeEnum.Weapon);

    const weaponOwner = weapon.parent;
    if (!weaponOwner) {
      throw new RqgError("weapon did not have an owner");
    }
    const nonHumanods: Record<string, string> = getGame()
      .actors?.filter((a) => a.isOwner && a.getBodyType() !== "humanoid")
      ?.reduce((acc: any, actor) => {
        const optionKey = `${actor.id}:${actor.system.attributes.damageBonus}`;
        acc[optionKey] = actor.name ?? "";
        return acc;
      }, {});
    const weaponOwnerOptionKey = `${weaponOwner.id}:${weaponOwner.system.attributes.damageBonus}`;
    return {
      [weaponOwnerOptionKey]: weaponOwner.name ?? "",
      ...nonHumanods,
    };
  }

  getHitLocationFormulaOptions(): Record<string, string> {
    return {
      "1d20": localize("RQG.Dialog.Attack.HitLocationFormulaOptions.1d20"),
      "1d10": localize("RQG.Dialog.Attack.HitLocationFormulaOptions.1d10"),
      "1d10+10": localize("RQG.Dialog.Attack.HitLocationFormulaOptions.1d10+10"),
    };
  }

  getWeaponProjectile(weaponItem: RqgItem | undefined): RqgItem | undefined {
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

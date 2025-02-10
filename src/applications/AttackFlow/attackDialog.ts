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

  private weaponItem: RqgItem;
  private halvedModifier: number = 0;

  constructor(weaponItem: RqgItem, options: Partial<AttackDialogOptions> = {}) {
    const formData: AttackDialogObjectData = {
      usageType: weaponItem.system.defaultUsage,
      augmentModifier: "0",
      proneTarget: false,
      unawareTarget: false,
      darkness: false,
      halved: false,
      otherModifier: "0",
      otherModifierDescription: localize("RQG.Dialog.Attack.OtherModifier"),
      attackDamageBonus: "",
      hitLocationFormula: "1d20",
    };

    super(formData, options as any);
    this.weaponItem = weaponItem;
    this.object = formData;
  }

  get id() {
    return `${this.constructor.name}-${trimChars(toKebabCase(this.weaponItem.name ?? ""), "-")}`;
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
    const usageTypeOptions = this.getUsageTypeOptions(this.weaponItem);
    if (
      !this.weaponItem.system.defaultUsage ||
      !Object.keys(usageTypeOptions).includes(this.object.usageType)
    ) {
      // Pick the first usage if none is selected (or if the selected isn't available)
      const defaultUsage = Object.keys(usageTypeOptions)[0] as UsageType;
      this.object.usageType = defaultUsage;
      await this.weaponItem.update({
        system: { defaultUsage: defaultUsage },
      });
    }
    if (!this.object.attackDamageBonus) {
      // Default the damage bonus to the attacking actor if none is selected
      this.object.attackDamageBonus = Object.keys(
        this.getDamageBonusSourceOptions(this.weaponItem),
      )[0];
    }

    const skillRqid = this.weaponItem.system.usage[this.object.usageType].skillRqidLink.rqid;
    const usedSkill = this.weaponItem.actor?.getBestEmbeddedDocumentByRqid(skillRqid);
    this.halvedModifier = -Math.floor(usedSkill?.system.chance / 2);
    return {
      weaponItem: this.weaponItem,
      // abilityName: this.weaponItem.name,
      abilityChance: usedSkill?.system.chance,
      // abilityType: this.weaponItem.type,
      // abilityImg: this.weaponItem.img,
      object: this.object,
      options: this.options,
      title: this.title,
      usageTypeOptions: usageTypeOptions,
      augmentOptions: this.augmentOptions,
      damageBonusSourceOptions: this.getDamageBonusSourceOptions(this.weaponItem),
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
    // Initiate an update of the embedded weapon defaultUsage to store the preferred usage for next attack
    if (this.weaponItem.system.defaultUsage !== formData["usageType"]) {
      await this.weaponItem.update({
        system: { defaultUsage: formData["usageType"] },
      });
    }

    this.object = formData;
    this.render(true);
  }

  activateListeners(html: JQuery): void {
    // Do the roll to chat
    html[0]?.querySelectorAll<HTMLElement>("[data-combat-maneuver-name]").forEach((el) => {
      el.addEventListener("click", async () => {
        const actor = this.weaponItem.parent;

        const skillItem = actor?.items.get(
          this.weaponItem.system.usage[this.object.usageType].skillId,
        );

        const combatManeuverName = getDomDataset(el, "combat-maneuver-name");

        const combatManeuver: CombatManeuver | undefined = this.weaponItem.system.usage[
          this.object.usageType
        ].combatManeuvers.find((cm: CombatManeuver) => cm.name === combatManeuverName);

        requireValue(
          combatManeuver,
          "Missing combat maneuver",
          combatManeuverName,
          this.object.usageType,
          this.weaponItem,
        );

        const attackRollOptions: AbilityRollOptions = {
          naturalSkill: skillItem?.system.chance,
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
          abilityName: this.weaponItem.name ?? undefined,
          abilityType: this.weaponItem.type ?? undefined,
          abilityImg: this.weaponItem.img ?? undefined,
          speaker: ChatMessage.getSpeaker({
            actor: this.weaponItem.parent as RqgActor | undefined,
          }),
        };

        const attackRoll = new AbilityRoll("1d100", {}, attackRollOptions);
        await attackRoll.evaluate();
        if (!attackRoll.successLevel) {
          throw new RqgError("Evaluated AbilityRoll didn't give successLevel");
        }

        if (getGameUser().targets.size > 1) {
          ui.notifications?.info("Please target one token only");
        }

        // @ts-expect-error first
        const target = getGameUser().targets.first() as RqgToken | undefined;
        const defenderActor = target?.document.actor ?? undefined;

        const attackerActor = this.weaponItem.actor;
        if (!attackerActor) {
          // TODO Warn about not finding attacker actor
          return;
        }

        const usageTypeTranslated = localize(`RQG.Game.WeaponUsage.${this.object.usageType}`);
        const damageTypeTranslated = localize(
          `RQG.Item.Weapon.DamageTypeEnum.${combatManeuver.damageType}`,
        );

        const attackRollFlavor = `<span class="roll-action">${localize("RQG.Dialog.weaponChat.AttackSpecification")}</span>
<span>${this.weaponItem.name} | ${usageTypeTranslated} | ${damageTypeTranslated}</span>`;

        const attackRollHtml = attackRollFlavor + (await attackRoll.render());

        const chatData: AttackChatFlags = {
          type: "attackChat",
          chat: {
            attackState: `Attacked`,
            attackingActorUuid: attackerActor.uuid,
            defendingActorUuid: defenderActor?.uuid, // TODO stämmer det här för unlinked?
            attackWeaponUuid: this.weaponItem.uuid,
            attackWeaponUsage: this.object.usageType,
            attackCombatManeuver: combatManeuver,
            outcomeDescription: "",
            actorDamagedApplied: false,
            weaponDamageApplied: false,
            attackDamageBonus: this.object.attackDamageBonus.split(":")[1],
            attackRoll: attackRoll,
            defendRoll: undefined,
            damageRoll: undefined,
            hitLocationRoll: new Roll(this.object.hitLocationFormula),
            damagedHitLocationUuid: "",
            damagedWeaponUuid: "",
            attackRollHtml: attackRollHtml,
            defendRollHtml: undefined,
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
          attackerName: `<b>${attackerActor.name}</b>`,
          defenderName: `<b>${defenderActor?.name ?? "???"}</b>`,
        });

        // TODO Introduce ability for GM to fudge roll here?

        const attackChatMessageOptions = {
          // @ts-expect-error CHAT_MESSAGE_STYLES
          type: CONST.CHAT_MESSAGE_STYLES.OTHER,
          flavor: attackFlavor,
          content: attackChatContent,
          speaker: ChatMessage.getSpeaker({
            actor: this.weaponItem.parent as RqgActor | undefined,
          }),
          flags: {
            rqg: chatData,
          },
        };

        const cm = await ChatMessage.create(attackChatMessageOptions);
        cm?.render(true);

        await skillItem?.checkExperience?.(attackRoll.successLevel); // TODO move to later in flow?
      });
    });

    super.activateListeners(html);
  }

  getUsageTypeOptions(weapon: RqgItem): Record<UsageType, string> {
    assertItemType(weapon.type, ItemTypeEnum.Weapon);
    return Object.entries<Usage>(weapon.system.usage).reduce((acc: any, [key, usage]) => {
      if (usage?.skillRqidLink?.rqid) {
        acc[key] = localize(`RQG.Game.WeaponUsage.${key}-full`);
      }
      return acc;
    }, {});
  }

  getDamageBonusSourceOptions(weapon: RqgItem): Record<string, string> {
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
}

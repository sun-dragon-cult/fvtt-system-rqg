import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { AttackDialogHandlebarsData, AttackDialogObjectData } from "./AttackDialogData.types";
import { AbilityRoll } from "../../rolls/AbilityRoll/AbilityRoll";
import { AbilityRollOptions } from "../../rolls/AbilityRoll/AbilityRoll.types";
import {
  assertItemType,
  getGameUser,
  localize,
  RqgError,
  toKebabCase,
  trimChars,
} from "../../system/util";
import type { RqgActor } from "../../actors/rqgActor";
import type { RqgItem } from "../../items/rqgItem";
import { AttackChatOptions } from "../../chat/RqgChatMessage.types";
import { AttackChatFlags } from "../../data-model/shared/rqgDocumentFlags";
import { RqgToken } from "../../combat/rqgToken";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { Usage, UsageType } from "../../data-model/item-data/weaponData";

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

  constructor(weaponItem: RqgItem, options: Partial<AttackChatOptions> = {}) {
    const formData: AttackDialogObjectData = {
      usageType: "oneHand", // TODO might not be ok - pick the selected or first available
      augmentModifier: "0",
      otherModifier: "0",
      otherModifierDescription: localize("RQG.Dialog.Attack.OtherModifier"),
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
    if (!this.weaponItem.system.defaultUsage) {
      // Pick the first usage if none is selected
      this.weaponItem.system.defaultUsage = Object.keys(usageTypeOptions)[0] as UsageType;
      this.object.usageType = this.weaponItem.system.defaultUsage;
    }
    const skillRqid = this.weaponItem.system.usage[this.object.usageType].skillRqidLink.rqid;
    const usedSkill = this.weaponItem.actor?.getBestEmbeddedDocumentByRqid(skillRqid);
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
      totalChance:
        Number(usedSkill?.system.chance ?? 0) +
        Number(this.object.augmentModifier ?? 0) +
        Number(this.object.otherModifier ?? 0),
    };
  }

  async _updateObject(event: Event, formData: AttackDialogObjectData): Promise<void> {
    // Initiate an update of the embedded weapon defaultUsage to store the preferred usage for next attack
    if (this.object.usageType !== formData["usageType"]) {
      await this.weaponItem.update({
        system: { defaultUsage: formData["usageType"] },
      });
    }

    this.object = formData;
    this.render(true);
  }

  activateListeners(html: JQuery): void {
    // Do the roll to chat
    html[0]?.querySelectorAll<HTMLElement>("[data-attack]").forEach((el) => {
      el.addEventListener("click", async () => {
        const actor = this.weaponItem.parent;
        // TODO Hardcoded oneHand
        const skillItem = actor?.items.get(this.weaponItem.system.usage.oneHand.skillId);

        const attackRollOptions: AbilityRollOptions = {
          naturalSkill: skillItem?.system.chance,
          modifiers: [
            {
              value: Number(this.object.augmentModifier),
              description: localize("RQG.Roll.AbilityRoll.Augment"),
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
        const attackRollHtml = await attackRoll.render();

        const chatData: AttackChatFlags = {
          type: "attackChat",
          chat: {
            attackState: `Attacked`,
            attackingActorUuid: attackerActor.uuid,
            defendingActorUuid: defenderActor?.uuid, // TODO stämmer det här för unlinked?
            attackWeaponUuid: this.weaponItem.uuid,
            attackWeaponUsage: this.object.usageType,
            outcomeDescription: "",
            actorDamagedApplied: false,
            weaponDamageApplied: false,
            attackRoll: attackRoll,
            defendRoll: undefined,
            damageRoll: undefined,
            hitLocationRoll: undefined,
            damagedActorUuid: "",
            damagedWeaponUuid: "",
            attackRollHtml: attackRollHtml,
            defendRollHtml: undefined,
          },
        };
        const attackChatContent = await renderTemplate(
          templatePaths.attackChatMessage,
          chatData.chat,
        );
        const flavor = localize("RQG.Dialog.Common.IsAttacking", {
          attackerName: `<b>${attackerActor.name}</b>`,
          defenderName: `<b>${defenderActor?.name}</b>`,
        });

        // TODO Introduce ability for GM to fudge roll here?

        const attackChatMessageOptions = {
          // @ts-expect-error CHAT_MESSAGE_STYLES
          type: CONST.CHAT_MESSAGE_STYLES.OTHER,
          flavor: flavor,
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
}

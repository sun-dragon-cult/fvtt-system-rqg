import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { AbilityRoll } from "../../rolls/AbilityRoll/AbilityRoll";
import { AbilityRollOptions } from "../../rolls/AbilityRoll/AbilityRoll.types";
import {
  assertItemType,
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
import { AttackDialogOptions, DefenceType } from "../../chat/RqgChatMessage.types";
import { DefenceDialogHandlebarsData, DefenceDialogObjectData } from "./DefenceDialogData.types";
import { RqgChatMessage } from "../../chat/RqgChatMessage";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { DamageType, Usage, UsageType } from "../../data-model/item-data/weaponData";
import { getBasicOutcomeDescription } from "../../chat/attackFlowHandlers";
import { combatOutcome, getDamageDegree } from "../../system/combatCalculations";
import { AbilitySuccessLevelEnum } from "../../rolls/AbilityRoll/AbilityRoll.defs";
import { updateChatMessage } from "../../sockets/SocketableRequests";

export class DefenceDialog extends FormApplication<
  FormApplication.Options,
  DefenceDialogHandlebarsData,
  DefenceDialogObjectData
> {
  private augmentOptions = {
    "0": "RQG.Dialog.Common.AugmentOptions.None",
    "50": "RQG.Dialog.Common.AugmentOptions.CriticalSuccess",
    "30": "RQG.Dialog.Common.AugmentOptions.SpecialSuccess",
    "20": "RQG.Dialog.Common.AugmentOptions.Success",
    "-20": "RQG.Dialog.Common.AugmentOptions.Failure",
    "-50": "RQG.Dialog.Common.AugmentOptions.Fumble",
  };

  private subsequentDefenceOptions = {
    "0": "RQG.Dialog.Defence.SubsequentDefenceOptions.First",
    "-20": "RQG.Dialog.Defence.SubsequentDefenceOptions.Second",
    "-40": "RQG.Dialog.Defence.SubsequentDefenceOptions.Third",
    "-60": "RQG.Dialog.Defence.SubsequentDefenceOptions.Fourth",
    "-80": "RQG.Dialog.Defence.SubsequentDefenceOptions.Fifth",
    "-100": "RQG.Dialog.Defence.SubsequentDefenceOptions.Sixth",
  };

  private readonly attackingWeaponItem: RqgItem;
  private readonly attackChatMessage: RqgChatMessage | undefined;
  private halvedModifier: number = 0;

  constructor(attackingWeaponItem: RqgItem, options: Partial<AttackDialogOptions> = {}) {
    const formData: DefenceDialogObjectData = {
      defendingActorUuid: undefined,
      parryingWeaponUuid: undefined,
      parryingWeaponUsage: undefined,
      defence: options.defenceType,
      defenceItemUuid: undefined,
      augmentModifier: "0",
      subsequentDefenceModifier: "0",
      halved: false,
      otherModifier: "0",
      otherModifierDescription: localize("RQG.Dialog.Defence.OtherModifier"),
    };

    super(formData, options as any);
    this.attackingWeaponItem = attackingWeaponItem;
    this.object = formData;

    const o = this.options as unknown as AttackDialogOptions;
    this.attackChatMessage = getGame().messages?.get(o.chatMessageId) as RqgChatMessage | undefined;
    if (!this.attackChatMessage) {
      ui.notifications?.error("Could not find chat message"); // TODO Improve error
    }
    this.object.defendingActorUuid = this.attackChatMessage?.flags?.rqg?.chat?.defendingActorUuid;
  }

  get id() {
    return `${this.constructor.name}-${trimChars(
      toKebabCase(this.attackingWeaponItem.name ?? ""),
      "-",
    )}`;
  }

  static get defaultOptions(): FormApplication.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "form", "roll-dialog", "defence-dialog"],
      popOut: true,
      template: templatePaths.defenceDialog,
      width: 500,
      left: 35,
      top: 15,
      title: "RQG.Dialog.Defence.Title",
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
      resizable: true,
    });
  }

  async getData(): Promise<DefenceDialogHandlebarsData> {
    // const defenceWeaponOptions = this.getDefenceWeaponOptions(this.object.actor);
    const actorOptions = this.getActorOptions();
    const defendingActor = (await fromUuid(
      this.object.defendingActorUuid ?? "",
    )) as RqgActor | null;

    // TODO can probably be simplify a bit
    const parryingWeaponOptions = this.getParryingWeaponOptions(defendingActor);
    const selectedParryingWeapon = (await fromUuid(
      this.object.parryingWeaponUuid ?? "",
    )) as RqgItem | null;
    const parryingWeaponUuid =
      selectedParryingWeapon?.uuid ?? Object.keys(parryingWeaponOptions)?.[0];
    const parryingWeapon =
      selectedParryingWeapon ?? ((await fromUuid(parryingWeaponUuid)) as RqgItem | null);
    const defenceOptions = this.getDefenceOptions(
      defendingActor ?? undefined,
      parryingWeapon?.uuid,
    );
    if (!Object.keys(defenceOptions).includes(this.object.defence ?? "")) {
      this.object.defence = Object.keys(defenceOptions)[0] as DefenceType; // Make sure there is a possible defence selected
    }

    if (this.object.defence === "parry" && !this.object.parryingWeaponUuid) {
      this.object.parryingWeaponUuid = parryingWeaponUuid; // Make sure parrying weapon is selected if the defence is "parry"
    }

    // TODO should usage missile be excluded?
    const parryingWeaponUsageOptions = this.getParryingWeaponUsageOptions(parryingWeapon);
    const parryingWeaponUsageOptionKeys = Object.keys(parryingWeaponUsageOptions);
    if (
      !this.object.parryingWeaponUsage ||
      !parryingWeaponUsageOptionKeys.includes(this.object.parryingWeaponUsage)
    ) {
      this.object.parryingWeaponUsage = parryingWeaponUsageOptionKeys[0] as UsageType; // If nothing is selected, select the first option
    }
    const parrySkillRqid =
      parryingWeapon?.system.usage[this.object.parryingWeaponUsage]?.skillRqidLink?.rqid;

    const { defenceName, defenceChance } = this.getDefenceNameAndChance(
      this.object.defence,
      defendingActor,
      parrySkillRqid,
    );

    this.halvedModifier = -Math.floor(defenceChance / 2);

    const defenceButtonText =
      this.object.defence === "parry" ? localize("RQG.Dialog.Defence.Parry") : defenceName;

    return {
      defenceName: defenceName,
      defenceButtonText: defenceButtonText,
      defenceChance: defenceChance,
      // abilityType: this.attackingWeaponItem.type,
      // abilityImg: parryingWeapon?.img ?? null, // TODO use it?
      object: this.object,
      options: this.options,
      title: this.title,
      augmentOptions: this.augmentOptions,
      subsequentDefenceOptions: this.subsequentDefenceOptions,
      defendingActorOptions: actorOptions,
      defenceOptions: defenceOptions,
      parryingWeaponOptions: parryingWeaponOptions,
      parryingWeaponUsageOptions: parryingWeaponUsageOptions,
      halvedModifier: this.halvedModifier,
      totalChance: Math.max(
        0,
        Number(defenceChance ?? 0) +
          Number(this.object.augmentModifier ?? 0) +
          Number(this.object.subsequentDefenceModifier ?? 0) +
          Number(this.object.halved ? this.halvedModifier : 0) +
          Number(this.object.otherModifier ?? 0),
      ),
    };
  }

  activateListeners(html: JQuery): void {
    // Do the roll to chat
    html[0]?.querySelectorAll<HTMLButtonElement>("[data-defend]").forEach((el) => {
      el.addEventListener("click", async () => {
        el.disabled = true;
        setTimeout(() => (el.disabled = false), 1000);

        if (!this.attackChatMessage?.id) {
          const msg = "Attack chat message didn't have an id";
          throw new RqgError(msg, this.attackChatMessage);
        }

        const messageData = this.attackChatMessage!.toObject();

        // TODO duplicate code ***
        const selectedParryingWeapon = (await fromUuid(
          this.object.parryingWeaponUuid ?? "",
        )) as RqgItem | null;
        const parrySkillRqid =
          selectedParryingWeapon?.system.usage[this.object.parryingWeaponUsage ?? "oneHand"]
            ?.skillRqidLink?.rqid; // TODO hardcoded oneHand fallback usage
        // TODO end duplicate code ***

        const defendingActor = (await fromUuid(
          this.object.defendingActorUuid ?? "",
        )) as RqgActor | null;

        // Update the chat with how the defence was done

        // @ts-expect-error flavor
        const currentFlavor: string = this.attackChatMessage.flavor;

        const defenderName = (await fromUuid(this.object.defendingActorUuid ?? ""))?.name;

        const updatedFlavor = currentFlavor.replace("???", defenderName ?? "");

        const { defenceName } = this.getDefenceNameAndChance(
          this.object.defence,
          defendingActor,
          parrySkillRqid,
        );

        if (this.object.defence === "parry") {
          requireValue(
            selectedParryingWeapon,
            "parry defence selected without a parrying weapon",
            this.object,
          );
        }

        let defendSkillItem: RqgItem | undefined;
        switch (this.object.defence) {
          case "parry": {
            defendSkillItem = defendingActor?.getBestEmbeddedDocumentByRqid(parrySkillRqid) as
              | RqgItem
              | undefined;
            break;
          }

          case "dodge": {
            defendSkillItem = defendingActor?.getBestEmbeddedDocumentByRqid(
              CONFIG.RQG.skillRqid.dodge,
            );
            break;
          }

          case "ignore":
          default:
          // Leave defendSkillItem undefined
        }

        const defenceHtml = `<span class="roll-action">${localize("RQG.Dialog.weaponChat.DefenceSpecification")}</span>`;

        const defendHeading =
          this.object.defence === "parry"
            ? `${defenceHtml} <span>${localize("RQG.Dialog.Defence.Parry")} – ${selectedParryingWeapon?.name ?? ""} – ${localize("RQG.Game.WeaponUsage." + this.object.parryingWeaponUsage)}</span>`
            : `${defenceHtml} ${defenceName}`;

        const defenceRollOptions: AbilityRollOptions = {
          naturalSkill: defendSkillItem?.system.chance,
          modifiers: [
            {
              value: Number(this.object.augmentModifier),
              description: localize("RQG.Roll.AbilityRoll.Augment"),
            },
            {
              value: Number(this.object.subsequentDefenceModifier),
              description: this.getSubsequentDefenceModifierLabel(
                Number(this.object.subsequentDefenceModifier),
              ),
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
          heading: defendHeading,
          abilityName: defendSkillItem?.name ?? undefined, // TODO should it be defending weapon!?
          abilityType: defendSkillItem?.type ?? undefined,
          abilityImg: defendSkillItem?.img ?? undefined,
          speaker: ChatMessage.getSpeaker({
            actor: this.attackingWeaponItem.parent as RqgActor | undefined,
          }),
          // resultMessages?: Map<AbilitySuccessLevelEnum | undefined, string>; // TODO Idea - add fields in IAbility to specify text specific for an ability
        };
        const attackRoll = AbilityRoll.fromData(
          this.attackChatMessage?.getFlag(systemId, "chat.attackRoll") as any,
        );
        if (attackRoll?.successLevel == null) {
          const msg = "Didn't find an attackRoll in the chatmessage, aborting";
          ui.notifications?.error(msg);
          console.error(`RQG | ${msg}`);
          return;
        }

        const defenceRoll = new AbilityRoll("1d100", {}, defenceRollOptions);
        await defenceRoll.evaluate();
        if (defenceRoll.successLevel == null) {
          throw new RqgError("Evaluated AbilityRoll didn't give successLevel");
        }

        const attackingWeapon = (await fromUuid(
          this.attackChatMessage?.getFlag(systemId, "chat.attackWeaponUuid"),
        )) as RqgItem | null;
        assertItemType(attackingWeapon?.type, ItemTypeEnum.Weapon);

        const attackWeaponUsageType = this.attackChatMessage?.getFlag(
          systemId,
          "chat.attackWeaponUsage",
        );
        requireValue(
          attackWeaponUsageType,
          "No attacking weapon usage found in attack chat message",
        );

        const parryWeaponUsageType = this.object.parryingWeaponUsage;
        const attackDamageBonus =
          this.attackChatMessage?.getFlag(systemId, "chat.attackDamageBonus") ?? "";
        const attackExtraDamage =
          this.attackChatMessage?.getFlag(systemId, "chat.attackExtraDamage") ?? "";
        const defendDamageBonus = defendingActor?.system.attributes.damageBonus ?? "";
        const damageType: DamageType =
          this.attackChatMessage?.getFlag(systemId, "chat.attackCombatManeuver.damageType") ?? "";

        const {
          damageRoll,
          weaponDamage,
          damagedWeapon,
          defenderHitLocationDamage,
          useParryHitLocation,
          ignoreDefenderAp,
          weaponDoingDamage,
        } = await combatOutcome(
          this.object.defence,
          attackRoll,
          defenceRoll,
          attackingWeapon,
          attackWeaponUsageType,
          attackDamageBonus,
          attackExtraDamage,
          defendDamageBonus,
          selectedParryingWeapon,
          parryWeaponUsageType,
          damageType,
        );

        const outcomeDescription = getBasicOutcomeDescription(
          this.object.defence,
          attackRoll.successLevel,
          defenceRoll?.successLevel,
        );

        console.debug("no implementation for useParryHitLocation yet", useParryHitLocation);

        // TODO Introduce ability for GM to fudge roll here

        const damageDegree = getDamageDegree(
          this.object.defence ?? "ignore", // TODO correct?
          attackRoll.successLevel,
          defenceRoll.successLevel,
        );

        const attackerFumbled = attackRoll.successLevel === AbilitySuccessLevelEnum.Fumble;
        const defenderFumbled = defenceRoll?.successLevel === AbilitySuccessLevelEnum.Fumble;

        foundry.utils.mergeObject(
          messageData,
          {
            flavor: updatedFlavor,
            flags: {
              [systemId]: {
                chat: {
                  attackState: "Defended",
                  defendingActorUuid: this.object.defendingActorUuid,
                  defenceWeaponUuid: selectedParryingWeapon?.uuid,
                  defenceWeaponUsage: parryWeaponUsageType,
                  outcomeDescription: outcomeDescription,
                  defenceRoll: defenceRoll,
                  attackerFumbled: attackerFumbled,
                  defenderFumbled: defenderFumbled,
                  damagedWeaponUuid: damagedWeapon?.uuid,
                  weaponDamage: weaponDamage,
                  weaponDoingDamage: weaponDoingDamage,
                  defenderHitLocationDamage: defenderHitLocationDamage,
                  damageRoll: damageRoll,
                  ignoreDefenderAp: ignoreDefenderAp,
                  actorDamagedApplied: damageDegree === "none",
                  weaponDamageApplied: damageDegree === "none",
                  hitLocationRoll: damageRoll // If there is a damageRoll there should also be a hitLocationRoll
                    ? messageData?.flags[systemId]?.chat.hitLocationRoll
                    : null,
                },
              },
            },
          },
          { overwrite: true },
        );

        messageData.content = await renderTemplate(
          templatePaths.attackChatMessage,
          messageData.flags[systemId]!.chat,
        );

        // @ts-expect-error dice3d
        if (game.dice3d) {
          const attackRoll = Roll.fromData(
            this.attackChatMessage!.getFlag(systemId, "chat.attackRoll"),
          );

          // Wait a tad with the defence roll to separate the animations slightly
          setTimeout(() => {
            // @ts-expect-error dice3d
            void game.dice3d.showForRoll(defenceRoll, getGameUser(), true, null, false);
          }, 300);

          // @ts-expect-error dice3d
          await game.dice3d.showForRoll(
            attackRoll,
            // @ts-expect-error author
            this.attackChatMessage.author,
            true,
            null,
            false,
          );
        }

        await updateChatMessage(this.attackChatMessage, messageData);
        await defendSkillItem?.checkExperience?.(defenceRoll?.successLevel); // TODO move to later in flow
        await this.close();
      });
    });

    super.activateListeners(html);
  }

  async _updateObject(event: Event, formData: DefenceDialogObjectData): Promise<void> {
    this.object = formData;
    this.render(true);
  }

  private getDefenceNameAndChance(
    defence: string | undefined,
    defendingActor: RqgActor | null,
    parrySkillRqid: string,
  ): { defenceName: string; defenceChance: number } {
    if (defence === "parry") {
      const parryWeapon = defendingActor?.getBestEmbeddedDocumentByRqid(parrySkillRqid);
      return {
        defenceName: parryWeapon?.name ?? "",
        defenceChance: parryWeapon?.system.chance ?? 0,
      };
    }
    if (defence === "dodge") {
      const dodgeSkill = defendingActor?.getBestEmbeddedDocumentByRqid(CONFIG.RQG.skillRqid.dodge);
      return {
        defenceName: dodgeSkill?.name ?? "No dodge skill found!",
        defenceChance: dodgeSkill?.system.chance,
      };
    }

    return { defenceName: localize("RQG.Dialog.Defence.Ignore"), defenceChance: 0 };
  }

  getSubsequentDefenceModifierLabel(defenceModifier: number): string {
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

  private getActorOptions(): Record<string, string> {
    // case 1 - defendingActorUuid is set (attacker has set a target)
    // @ts-expect-error fromUuidSync
    const defendingActor = fromUuidSync(
      this.attackChatMessage?.flags[systemId]!.chat.defendingActorUuid ?? "",
    ) as RqgActor | null;
    if (defendingActor) {
      return { [defendingActor?.uuid ?? ""]: defendingActor.name ?? "" };
    }

    // case 2 - show a list of actors the user has access to
    return getGame()
      .actors?.filter((a) => a.isOwner)
      ?.reduce((acc: any, actor) => {
        acc[actor.uuid ?? ""] = actor.name;
        return acc;
      }, {});
  }

  private getDefenceOptions(
    defendingActor: RqgActor | undefined,
    parryingWeaponUuid: string | undefined,
  ): Record<DefenceType, string> {
    const defenceOptions: any = {};

    if (parryingWeaponUuid) {
      defenceOptions.parry = localize("RQG.Dialog.Defence.Parry");
    }

    const dodgeSkill = defendingActor?.getBestEmbeddedDocumentByRqid(CONFIG.RQG.skillRqid.dodge);
    if (dodgeSkill) {
      defenceOptions.dodge = dodgeSkill.name;
    }

    defenceOptions.ignore = localize("RQG.Dialog.Defence.Ignore");

    return defenceOptions;
  }

  private getParryingWeaponOptions(defendingActor: RqgActor | null): Record<string, string> {
    // get all weapons that can be used for parry
    const parryingWeapons =
      defendingActor?.items.filter(
        (i: RqgItem) =>
          i.type === ItemTypeEnum.Weapon &&
          i.system.equippedStatus === "equipped" &&
          (this.usageHasParryManeuver(i.system.usage.oneHand) ||
            this.usageHasParryManeuver(i.system.usage.offHand) ||
            this.usageHasParryManeuver(i.system.usage.twoHand) ||
            this.usageHasParryManeuver(i.system.usage.missile)),
      ) ?? [];
    const sortedWeapons = parryingWeapons.sort((a: any, b: any) => a.sort - b.sort);
    return sortedWeapons?.reduce((acc: any, weapon: RqgItem) => {
      acc[weapon.uuid ?? ""] = weapon.name;
      return acc;
    }, {});
  }

  private getParryingWeaponUsageOptions(
    parryingWeapon: RqgItem | null,
  ): Partial<Record<UsageType, string>> {
    const usages: Partial<Record<UsageType, string>> = {};

    if (!parryingWeapon) {
      const msg = "No parrying weapon selected";
      console.error("RQG | ", msg);
      return usages;
    }

    if (this.usageHasParryManeuver(parryingWeapon.system.usage.oneHand)) {
      usages.oneHand = "RQG.Game.WeaponUsage.oneHand-full";
    }

    if (this.usageHasParryManeuver(parryingWeapon.system.usage.offHand)) {
      usages.offHand = "RQG.Game.WeaponUsage.offHand-full";
    }

    if (this.usageHasParryManeuver(parryingWeapon.system.usage.twoHand)) {
      usages.twoHand = "RQG.Game.WeaponUsage.twoHand-full";
    }

    if (this.usageHasParryManeuver(parryingWeapon.system.usage.missile)) {
      usages.missile = "RQG.Game.WeaponUsage.missile-full";
    }

    return usages;
  }

  private usageHasParryManeuver(usage: Usage): boolean {
    return (
      usage.skillRqidLink?.rqid != null &&
      usage.combatManeuvers?.some((m) => m.damageType === "parry")
    );
  }
}

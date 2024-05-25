import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { AbilityRoll } from "../../rolls/AbilityRoll/AbilityRoll";
import { AbilityRollOptions } from "../../rolls/AbilityRoll/AbilityRoll.types";
import { getGame, localize, RqgError, toKebabCase, trimChars } from "../../system/util";
import type { RqgActor } from "../../actors/rqgActor";
import type { RqgItem } from "../../items/rqgItem";
import { AttackChatOptions } from "../../chat/RqgChatMessage.types";
import { DefenceDialogHandlebarsData, DefenceDialogObjectData } from "./DefenceDialogData.types";
import { RqgChatMessage } from "../../chat/RqgChatMessage";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { Usage, UsageType } from "../../data-model/item-data/weaponData";

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

  private meditateOptions = {
    "0": "RQG.Dialog.Common.MeditateOptions.None",
    "5": "RQG.Dialog.Common.MeditateOptions.1mr",
    "10": "RQG.Dialog.Common.MeditateOptions.2mr",
    "15": "RQG.Dialog.Common.MeditateOptions.5mr",
    "20": "RQG.Dialog.Common.MeditateOptions.25mr",
    "25": "RQG.Dialog.Common.MeditateOptions.50mr",
  };

  private readonly attackingWeaponItem: RqgItem;
  private readonly attackChatMessage: RqgChatMessage | undefined;

  constructor(attackingWeaponItem: RqgItem, options: Partial<AttackChatOptions> = {}) {
    const formData: DefenceDialogObjectData = {
      defendingActorUuid: undefined,
      parryingWeaponUuid: undefined,
      parryingWeaponUsage: undefined,
      defence: options.defenceType,
      defenceItemUuid: undefined,
      augmentModifier: "0",
      meditateModifier: "0",
      otherModifier: "0",
      otherModifierDescription: localize("RQG.Dialog.Defence.OtherModifier"),
    };

    super(formData, options as any);
    this.attackingWeaponItem = attackingWeaponItem;
    this.object = formData;

    const o = this.options as unknown as AttackChatOptions;
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
      this.object.defence = Object.keys(defenceOptions)[0]; // Make sure there is a possible defence selected
    }

    const parryingWeaponUsageOptions = this.getParryingWeaponUsageOptions(parryingWeapon);
    const parrySkillUuid =
      parryingWeapon?.system.usage[this.object.parryingWeaponUsage ?? "oneHand"]?.skillRqidLink
        ?.rqid; // TODO hardcoded oneHand fallback usage
    const defenceChance =
      defendingActor?.getBestEmbeddedDocumentByRqid(parrySkillUuid)?.system.chance; // TODO should be the dodge chance if dodge or nothing? if ignore
    return {
      defenceName: parryingWeapon?.name ?? null,
      defenceChance: defenceChance,
      // abilityType: this.attackingWeaponItem.type,
      // abilityImg: parryingWeapon?.img ?? null, // TODO use it?
      object: this.object,
      options: this.options,
      title: this.title,
      augmentOptions: this.augmentOptions,
      meditateOptions: this.meditateOptions,
      defendingActorOptions: actorOptions,
      defenceOptions: defenceOptions,
      parryingWeaponOptions: parryingWeaponOptions,
      parryingWeaponUsageOptions: parryingWeaponUsageOptions,
      totalChance:
        Number(defenceChance ?? 0) +
        Number(this.object.augmentModifier ?? 0) +
        Number(this.object.meditateModifier ?? 0) +
        Number(this.object.otherModifier ?? 0),
    };
  }

  activateListeners(html: JQuery): void {
    // Do the roll to chat
    html[0]?.querySelectorAll<HTMLElement>("[data-defend]").forEach((el) => {
      el.addEventListener("click", async () => {
        const actor = this.attackingWeaponItem.parent;
        // TODO Hardcoded oneHand - could be dodge!
        const skillItem = actor?.items.get(this.attackingWeaponItem.system.usage.oneHand.skillId);

        const defendRollOptions: AbilityRollOptions = {
          naturalSkill: skillItem?.system.chance,
          modifiers: [
            {
              value: Number(this.object.augmentModifier),
              description: localize("RQG.Roll.AbilityRoll.Augment"),
            },
            {
              value: Number(this.object.meditateModifier),
              description: localize("RQG.Roll.AbilityRoll.Meditate"),
            },
            {
              value: Number(this.object.otherModifier),
              description: this.object.otherModifierDescription,
            },
          ],
          abilityName: this.attackingWeaponItem.name ?? undefined,
          abilityType: this.attackingWeaponItem.type ?? undefined,
          abilityImg: this.attackingWeaponItem.img ?? undefined,
          speaker: ChatMessage.getSpeaker({
            actor: this.attackingWeaponItem.parent as RqgActor | undefined,
          }),
          // resultMessages?: Map<AbilitySuccessLevelEnum | undefined, string>; // TODO Idea - add fields in IAbility to specify text specific for an ability
        };

        const defendRoll = new AbilityRoll("1d100", {}, defendRollOptions);
        await defendRoll.evaluate();
        if (!defendRoll.successLevel) {
          throw new RqgError("Evaluated AbilityRoll didn't give successLevel");
        }
        const messageData = this.attackChatMessage!.toObject();

        foundry.utils.mergeObject(
          messageData,
          {
            flags: {
              [systemId]: {
                chat: {
                  attackState: `Defended`,
                  defendRoll: defendRoll,
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

        // TODO Send update to Attacker user (or GM) via socket, include acting actor !!!
        this.attackChatMessage?.update(messageData);

        // TODO Introduce ability for GM to fudge roll here

        await skillItem?.checkExperience?.(defendRoll.successLevel); // TODO move to later in flow
        await this.close();
      });
    });

    super.activateListeners(html);
  }

  async _updateObject(event: Event, formData: DefenceDialogObjectData): Promise<void> {
    this.object = formData;
    this.render(true);

    if (
      this.attackChatMessage?.getFlag(systemId, "chat.defendingActorUuid") !==
      this.object.defendingActorUuid
    ) {
      await this.attackChatMessage?.update({
        flags: { [systemId]: { chat: { defendingActorUuid: this.object.defendingActorUuid } } },
      } as any); // TODO fix type
      this.attackChatMessage?.render(true);
      // TODO update the chat message to reflect the current defender
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
  ): Record<string, string> {
    const defenceOptions: any = {};

    if (parryingWeaponUuid) {
      defenceOptions.parry = "Parry"; // TODO translate
    }

    const dodgeSkill = defendingActor?.getBestEmbeddedDocumentByRqid(CONFIG.RQG.skillRqid.dodge);
    if (dodgeSkill) {
      defenceOptions.dodge = dodgeSkill.name;
    }

    defenceOptions.ignore = "Ignore"; // TODO translate

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
      usages.oneHand = localize("RQG.Game.WeaponUsage.oneHand-full");
    }

    if (this.usageHasParryManeuver(parryingWeapon.system.usage.offHand)) {
      usages.offHand = localize("RQG.Game.WeaponUsage.offHand-full");
    }

    if (this.usageHasParryManeuver(parryingWeapon.system.usage.twoHand)) {
      usages.twoHand = localize("RQG.Game.WeaponUsage.twoHand-full");
    }

    if (this.usageHasParryManeuver(parryingWeapon.system.usage.missile)) {
      usages.missile = localize("RQG.Game.WeaponUsage.missile-full");
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
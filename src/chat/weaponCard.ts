import { Ability, ResultEnum } from "../data-model/shared/ability";
import { RqgActor } from "../actors/rqgActor";
import { SkillData } from "../data-model/item-data/skillData";
import { MeleeWeaponData } from "../data-model/item-data/meleeWeaponData";
import { MissileWeaponData } from "../data-model/item-data/missileWeaponData";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";

type WeaponCardFlags = {
  actorId: string;
  skillItemData: ItemData<SkillData>;
  weaponItemData: ItemData<MeleeWeaponData> | ItemData<MissileWeaponData>;
  result: ResultEnum;
  formData: {
    modifier: number;
    chance: number;
    combatManeuver: string;
  };
};

export class WeaponCard extends ChatMessage {
  public static async show(actor: RqgActor, skillId: string, weaponId: string): Promise<void> {
    const defaultModifier = 0;
    const skillItem = actor.getOwnedItem(skillId);

    const flags: WeaponCardFlags = {
      actorId: actor.id,
      skillItemData: skillItem.data,
      weaponItemData: actor.getOwnedItem(weaponId).data,
      result: undefined,
      formData: {
        modifier: defaultModifier,
        chance: skillItem.data.data.chance,
        combatManeuver: undefined,
      },
    };
    await ChatMessage.create(await WeaponCard.renderContent(flags, actor));
  }

  public static async inputChangeHandler(ev, messageId: string) {
    const chatMessage = game.messages.get(messageId);
    const flags: WeaponCardFlags = chatMessage.data.flags.rqg;
    const actor = (game.actors.get(flags.actorId) as unknown) as RqgActor;
    const form: HTMLFormElement = ev.target.closest("form");
    const formData = new FormData(form);
    // @ts-ignore
    for (const [name, value] of formData) {
      flags.formData[name] = value;
    }

    const chance: number = Number(flags.skillItemData.data.chance) || 0;
    const modifier: number = Number(flags.formData.modifier) || 0;

    flags.formData.chance = WeaponCard.calcRollChance(chance, modifier);

    const data = await WeaponCard.renderContent(flags, actor);
    await chatMessage.update(data);
  }

  public static async formSubmitHandler(ev, messageId: string) {
    ev.preventDefault();

    const chatMessage = game.messages.get(messageId);
    const flags: WeaponCardFlags = chatMessage.data.flags.rqg;

    const formData = new FormData(ev.target);
    // @ts-ignore
    for (const [name, value] of formData) {
      flags.formData[name] = value;
    }

    const button = ev.currentTarget;
    button.disabled = true; // TODO Doesn't work, points to form !!!

    const actor: RqgActor = (game.actors.get(flags.actorId) as unknown) as RqgActor;
    const action = ev.originalEvent.submitter.name; // combatManeuver | DamageRoll | HitLocationRoll

    if (action === "combatManeuver") {
      flags.formData.combatManeuver = ev.originalEvent.submitter.value; // slash | crush | impale | special | parry
      const projectileItemData = (flags.weaponItemData.data as MissileWeaponData).isProjectileWeapon
        ? actor.items.get((flags.weaponItemData.data as MissileWeaponData).projectileId).data
        : flags.weaponItemData;
      if (
        flags.weaponItemData.type === ItemTypeEnum.MissileWeapon &&
        projectileItemData.data.quantity > 0
      ) {
        await actor.updateOwnedItem({
          // @ts-ignore
          _id: projectileItemData._id,
          "data.quantity": --projectileItemData.data.quantity,
        });
      } else if (flags.weaponItemData.type === ItemTypeEnum.MissileWeapon) {
        ui.notifications.warn("Out of ammo!");
        return;
      }
      await WeaponCard.roll(flags, chatMessage);
    } else if (action === "damageRoll") {
      let damageBonus =
        actor.data.data.attributes.damageBonus !== "0"
          ? `+ ${actor.data.data.attributes.damageBonus}[Damage Bonus]`
          : "";

      if (flags.weaponItemData.type === ItemTypeEnum.MissileWeapon) {
        const missileWeaponData: ItemData<MissileWeaponData> = (flags.weaponItemData as unknown) as ItemData<MissileWeaponData>;

        if (missileWeaponData.data.isThrownWeapon) {
          damageBonus = " + ceil(" + actor.data.data.attributes.damageBonus + "/2)";
        } else if (missileWeaponData.data.isProjectileWeapon) {
          damageBonus = "";
        }
      }

      const damageType = ev.originalEvent.submitter.value; // Normal Damage | Special Damage | Max Special Damage
      let weaponDamage = flags.weaponItemData.data.damage;
      if (["Special Damage", "Max Special Damage"].includes(damageType)) {
        if (["slash", "impale"].includes(flags.formData.combatManeuver)) {
          weaponDamage = weaponDamage + " + " + weaponDamage;
        } else if (flags.formData.combatManeuver === "crush") {
          // @ts-ignore
          const maxDamageBonus = Roll.create(damageBonus).evaluate({ maximize: true }).total;
          damageBonus = damageBonus + " + " + maxDamageBonus;
        }
      }
      const maximise = damageType === "Max Special Damage";

      // @ts-ignore
      const roll = Roll.create(`${weaponDamage} ${damageBonus}`).evaluate({
        maximize: maximise,
      });
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker(),
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        flavor: `damage`,
      });
    } else if (action === "hitLocationRoll") {
      // @ts-ignore
      const roll = Roll.create("1D20").evaluate();
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker(),
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        flavor: `Hitlocation`,
      });
    } else {
      ui.notifications.error("Oops you shouldn't see this - unknown button in chat card");
    }

    button.disabled = false;
    return false;
  }

  public static async roll(flags: WeaponCardFlags, chatMessage: ChatMessage) {
    const modifier: number = Number(flags.formData.modifier) || 0;
    const chance: number = Number(flags.skillItemData.data.chance) || 0;
    const actor = (game.actors.get(flags.actorId) as unknown) as RqgActor;
    flags.result = await Ability.roll(actor, chance, modifier, flags.skillItemData.name + " check");
    await WeaponCard.checkExperience(actor, flags.skillItemData, flags.result);
    const data = await WeaponCard.renderContent(flags, actor);
    await chatMessage.update(data);
  }

  public static async checkExperience(
    actor: RqgActor,
    skillItemData: ItemData<SkillData>,
    result: ResultEnum
  ): Promise<void> {
    if (result <= ResultEnum.Success && !skillItemData.data.hasExperience) {
      // @ts-ignore
      await actor.updateOwnedItem({ _id: skillItemData._id, data: { hasExperience: true } });
      ui.notifications.info("Yey, you got an experience check on " + skillItemData.name + "!");
    }
  }

  private static async renderContent(flags: WeaponCardFlags, actor: RqgActor) {
    let html = await renderTemplate("systems/rqg/chat/weaponCard.html", flags);
    let whisperRecipients = game.users.filter((u) => u.isGM && u.active);
    whisperRecipients.push(game.user._id);
    return {
      flavor: "Weapon: " + flags.weaponItemData.name,
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: actor as any }),
      content: html,
      whisper: whisperRecipients,
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      flags: {
        core: { canPopout: true },
        rqg: flags,
      },
    };
  }

  private static calcRollChance(value: number, modifier: number): number {
    return value + modifier;
  }
}

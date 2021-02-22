import { Ability, ResultEnum } from "../data-model/shared/ability";
import { RqgActor } from "../actors/rqgActor";
import { SkillData } from "../data-model/item-data/skillData";
import { MeleeWeaponData } from "../data-model/item-data/meleeWeaponData";
import { MissileWeaponData } from "../data-model/item-data/missileWeaponData";

type WeaponCardFlags = {
  actorId: string;
  skillItemData: ItemData<SkillData>;
  weaponItemData: ItemData<MeleeWeaponData> | ItemData<MissileWeaponData>;
  result: ResultEnum;
  formData: {
    modifier: number;
    chance: number;
  };
};

export class WeaponCard {
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
      },
    };
    await ChatMessage.create(await WeaponCard.renderContent(flags));
  }

  public static inputChangeHandler(ev, messageId: string) {
    const chatMessage = game.messages.get(messageId);
    const flags: WeaponCardFlags = chatMessage.data.flags.rqg;
    const form: HTMLFormElement = ev.target.closest("form");
    const formData = new FormData(form);
    // @ts-ignore
    for (const [name, value] of formData) {
      flags.formData[name] = value;
    }

    const chance: number = Number(flags.skillItemData.data.chance) || 0;
    const modifier: number = Number(flags.formData.modifier) || 0;

    flags.formData.chance = WeaponCard.calcRollChance(chance, modifier);

    WeaponCard.renderContent(flags).then((d: Object) => chatMessage.update(d));
  }

  public static formSubmitHandler(ev, messageId: string) {
    ev.preventDefault();

    const chatMessage = game.messages.get(messageId);
    const flags: WeaponCardFlags = chatMessage.data.flags.rqg;

    const formData = new FormData(ev.target);
    // @ts-ignore
    for (const [name, value] of formData) {
      flags.formData[name] = value;
    }

    const button = ev.currentTarget;
    button.disabled = true;

    WeaponCard.roll(flags, chatMessage);

    button.disabled = false;
    return false;
  }

  public static roll(flags: WeaponCardFlags, chatMessage: ChatMessage) {
    const modifier: number = Number(flags.formData.modifier) || 0;
    const chance: number = Number(flags.skillItemData.data.chance) || 0;
    flags.result = Ability.roll(chance, modifier, flags.skillItemData.name + " check");
    const actor: RqgActor = (game.actors.get(flags.actorId) as unknown) as RqgActor;
    WeaponCard.checkExperience(actor, flags.skillItemData, flags.result);
    // TODO Link to DamageRoll, FumbleRoll, ...

    WeaponCard.renderContent(flags).then((d: Object) => chatMessage.update(d));
  }

  public static checkExperience(
    actor: RqgActor,
    skillItemData: ItemData<SkillData>,
    result: ResultEnum
  ): void {
    if (result <= ResultEnum.Success && !skillItemData.data.hasExperience) {
      // @ts-ignore
      actor.updateOwnedItem({ _id: skillItemData._id, data: { hasExperience: true } });
      ui.notifications.info("Yey, you got an experience check on " + skillItemData.name + "!");
    }
  }

  private static async renderContent(flags: WeaponCardFlags) {
    let html = await renderTemplate("systems/rqg/chat/weaponCard.html", flags);

    return {
      title: "Ability check",
      flavor: "",
      user: game.user._id,
      speaker: ChatMessage.getSpeaker(), // TODO figure out what actor/token  is speaking
      content: html,
      whisper: [game.user._id],
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

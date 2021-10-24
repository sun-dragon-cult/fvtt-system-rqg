import { Ability, ResultEnum } from "../data-model/shared/ability";
import {
  assertItemType,
  getActorFromIds,
  getGame,
  getSpeakerName,
  RqgError,
  usersThatOwnActor,
} from "../system/util";
import { RqgActor } from "../actors/rqgActor";
import { RqgActorDataSource } from "../data-model/actor-data/rqgActorData";
import { ItemTypeEnum, RqgItemDataSource } from "../data-model/item-data/itemTypes";
import { ItemDataSource } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";

type SpiritMagicCardFlags = {
  actorId: string;
  tokenId: string | null; // Needed to avoid saving a full (possibly syntetic) actor
  itemData: ItemDataSource;
  formData: {
    level: number;
    boost: number;
    chance: number;
  };
};

export class SpiritMagicCard {
  public static async show(
    spiritMagicItemId: string,
    actor: RqgActor,
    token: TokenDocument | null
  ): Promise<void> {
    const spiritMagicItem = actor.items.get(spiritMagicItemId);
    assertItemType(spiritMagicItem?.data.type, ItemTypeEnum.SpiritMagic);
    if (!actor.id) {
      const msg = `Actor without id in spirit magic card`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, actor);
    }

    const flags: SpiritMagicCardFlags = {
      actorId: actor.id,
      tokenId: token?.id ?? null,
      itemData: spiritMagicItem.data.toObject(),
      formData: {
        level: spiritMagicItem.data.data.points,
        boost: 0,
        chance: actor.data.data.characteristics.power.value * 5,
      },
    };

    ui?.sidebar?.tabs.chat && ui.sidebar?.activateTab(ui?.sidebar.tabs.chat.tabName); // Switch to chat to make sure the user doesn't miss the chat card
    await ChatMessage.create(await this.renderContent(flags));
  }

  public static async inputChangeHandler(ev: Event, messageId: string): Promise<void> {}

  public static async formSubmitHandler(
    ev: JQueryEventObject,
    messageId: string
  ): Promise<boolean> {
    ev.preventDefault();

    const chatMessage = getGame().messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg as SpiritMagicCardFlags;

    const formData = new FormData(ev.target as HTMLFormElement);
    // @ts-ignore formData.entries()
    for (const [name, value] of formData.entries()) {
      if (name in flags.formData) {
        flags.formData[name as keyof typeof flags.formData] = value;
      }
    }

    // @ts-ignore submitter
    const button = ev.originalEvent.submitter as HTMLButtonElement;
    button.disabled = true;
    setTimeout(() => (button.disabled = false), 1000); // Prevent double clicks

    const level: number = Number(flags.formData.level) || 0;
    const boost: number = Number(flags.formData.boost) || 0;

    const actor = getActorFromIds(flags.actorId, flags.tokenId);
    if (actor) {
      const speakerName = getSpeakerName(flags.actorId, flags.tokenId);
      await SpiritMagicCard.roll(flags.itemData, level, boost, actor, speakerName);
    } else {
      ui.notifications?.warn("Couldn't find world actor to do spirit magic roll");
    }
    return false;
  }

  public static async roll(
    itemData: ItemDataSource,
    level: number,
    boost: number,
    actor: RqgActor,
    speakerName: string
  ): Promise<void> {
    assertItemType(itemData.type, ItemTypeEnum.SpiritMagic);
    const actorData = actor.data;
    const validationError = SpiritMagicCard.validateData(
      actorData,
      itemData,
      Number(level),
      Number(boost)
    );
    if (validationError) {
      ui.notifications?.warn(validationError);
    } else {
      const result = await Ability.roll(
        "Cast " + itemData.name,
        actorData.data.characteristics.power.value * 5,
        0,
        speakerName
      );
      await SpiritMagicCard.drawMagicPoints(actor, level + boost, result);
    }
  }

  public static validateData(
    actorData: RqgActorDataSource,
    itemData: RqgItemDataSource,
    level: number,
    boost: number
  ): string {
    assertItemType(itemData.type, ItemTypeEnum.SpiritMagic);
    if (level > itemData.data.points) {
      return "Can not cast spell above learned level";
    } else if (level + boost > (actorData.data.attributes.magicPoints.value || 0)) {
      return "Not enough magic points left";
    } else {
      return "";
    }
  }

  public static async drawMagicPoints(
    actor: RqgActor,
    amount: number,
    result: ResultEnum
  ): Promise<void> {
    if (result <= ResultEnum.Success) {
      const newMp = (actor.data.data.attributes.magicPoints.value || 0) - amount;
      await actor.update({ "data.attributes.magicPoints.value": newMp });
      ui.notifications?.info("Successfully cast the spell, drew " + amount + " magic points.");
    }
  }

  private static async renderContent(flags: SpiritMagicCardFlags): Promise<object> {
    let html = await renderTemplate("systems/rqg/chat/spiritMagicCard.html", flags);
    const speakerName = getSpeakerName(flags.actorId, flags.tokenId);
    return {
      flavor: "Spirit Magic: " + flags.itemData.name,
      user: getGame().user?.id,
      speaker: { alias: speakerName },
      content: html,
      whisper: usersThatOwnActor(getActorFromIds(flags.actorId, flags.tokenId)),
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      flags: {
        core: { canPopout: true },
        rqg: flags,
      },
    };
  }
}

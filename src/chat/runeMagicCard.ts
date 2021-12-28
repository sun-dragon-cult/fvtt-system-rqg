import { ItemDataSource } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";
import { stringify } from "querystring";
import { Rune } from "../actors/item-specific/rune";
import { RqgActor } from "../actors/rqgActor";
import { RqgActorDataSource } from "../data-model/actor-data/rqgActorData";
import { CultDataSource } from "../data-model/item-data/cultData";
import { ItemTypeEnum, RqgItemDataSource } from "../data-model/item-data/itemTypes";
import { Ability } from "../data-model/shared/ability";
import {
  assertItemType,
  getActorFromIds,
  getGame,
  getJournalEntryName,
  getSpeakerName,
  RqgError,
  usersThatOwnActor,
} from "../system/util";

type RuneMagicCardFlags = {
  actorId: string;
  tokenId: string | null; // Needed to avoid saving a full (possibly syntetic) actor
  itemData: ItemDataSource;
  eligibleRunes: RuneForCasting[];
  formData: {
    runePointCost: number;
    magicPointBoost: number;
    ritualOrMeditation: number;
    skillAugmentation: number;
    otherModifiers: number;
    selectedRune: Rune;
    journalEntryName: string;
  };
};

type RuneForCasting = {
  rune: string;
  actorRune: Rune;
};

export class RuneMagicCard {
  public static async show(
    runeMagicItemId: string,
    actor: RqgActor,
    token: TokenDocument | null
  ): Promise<void> {
    const runeMagicItem = actor.items.get(runeMagicItemId);
    assertItemType(runeMagicItem?.data.type, ItemTypeEnum.RuneMagic);
    const cult = actor.items.get(runeMagicItem.data.data.cultId);
    assertItemType(cult?.data.type, ItemTypeEnum.Cult);
    if (!actor.id) {
      const msg = `Actor without id in rune magic card`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, actor);
    }
    let usableRunes = [];
    let runesForCasting: RuneForCasting[] = [];
    if (runeMagicItem.data.data.runes.includes("Magic (condition)")) {
      // Actor can use any of the cult's runes to cast
      // And some cults have the same rune more than once, so de-dupe them
      usableRunes = [...new Set(cult.data.data.runes)];
    } else {
      // Actor can use any of the Rune Magic Spell's runes to cast
      usableRunes = [...new Set(runeMagicItem.data.data.runes)];
    }
    usableRunes.forEach((cultRune) => {
      const actorRune = actor.items.getName(cultRune);
      assertItemType(actorRune?.data.type, ItemTypeEnum.Rune);
      const runeForCasting: RuneForCasting = {
        rune: cultRune,
        actorRune: actorRune,
      };
      runesForCasting.push(runeForCasting);
    });

    const flags: RuneMagicCardFlags = {
      actorId: actor.id,
      tokenId: token?.id ?? null,
      itemData: runeMagicItem.data.toObject(),
      eligibleRunes: runesForCasting,
      formData: {
        runePointCost: runeMagicItem.data.data.points,
        magicPointBoost: 0,
        ritualOrMeditation: 0,
        skillAugmentation: 0,
        otherModifiers: 0,
        selectedRune: runesForCasting[0],
        journalEntryName: getJournalEntryName(runeMagicItem.data.data),
      },
    };

    ui?.sidebar?.tabs.chat && ui.sidebar?.activateTab(ui?.sidebar.tabs.chat.tabName);
    await ChatMessage.create(await this.renderContent(flags));
  }

  public static async inputChangeHandler(ev: Event, messageId: string): Promise<void> {}

  public static async formSubmitHandler(
    ev: JQueryEventObject,
    messageId: string
  ): Promise<boolean> {
    ev.preventDefault();

    console.log("RUNE MAGIC CARD formSubmithander");

    const chatMessage = getGame().messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg as RuneMagicCardFlags;

    const formData = new FormData(ev.target as HTMLFormElement);
    console.log(formData);
    // @ts-ignore formData.entries()
    for (const [name, value] of formData.entries()) {
      if (name in flags.formData) {
        if (name === "selectedRune") {
          flags.formData.selectedRune = flags.eligibleRunes.filter(
            //@ts-ignore _id TODO: WHY?!
            (r) => r.actorRune._id === value
          )[0];
        } else {
          //TODO: This is not type safe, so for instance a value that is supposed to be a number
          //ends up as a string in the formData property
          //@ts-ignore TODO: WHY?!
          flags.formData[name as keyof typeof flags.formData] = value;
        }
      }
    }

    // @ts-ignore submitter
    const button = ev.originalEvent.submitter as HTMLButtonElement;
    button.disabled = true;
    setTimeout(() => (button.disabled = false), 1000); // Prevent double clicks

    const actor = getActorFromIds(flags.actorId, flags.tokenId);
    if (actor) {
      const speakerName = getSpeakerName(flags.actorId, flags.tokenId);
      await RuneMagicCard.roll(flags.itemData, flags, actor, speakerName);
    } else {
      ui.notifications?.warn("Couldn't find world actor to do rune magic roll");
    }
    return false;
  }

  public static async roll(
    itemData: ItemDataSource,
    formData: RuneMagicCardFlags,
    actor: RqgActor,
    speakerName: string
  ): Promise<void> {
    console.log("RUNE MAGIC CARD ROLL");
    console.log(formData);
    assertItemType(itemData.type, ItemTypeEnum.RuneMagic);
    const cult = actor.items.get(itemData.data.cultId);
    assertItemType(cult?.data.type, ItemTypeEnum.Cult);
    const actorData = actor.data;
    const validationError = RuneMagicCard.validateData(actorData, itemData, formData, cult.data);
    if (validationError) {
      ui.notifications?.warn(validationError);
    } else {
      const result = await Ability.roll(
        "Cast " + itemData.name,
        //TODO: neither the chance nor the ritualOrMeditation should be able to be anything but numbers
        // @ts-ignore actorRune TODO: WHY?!
        Number(formData.formData.selectedRune.actorRune.data.chance),
        Number(formData.formData.ritualOrMeditation) +
          Number(formData.formData.skillAugmentation) +
          Number(formData.formData.otherModifiers),
        speakerName
      );
    }
  }

  public static validateData(
    actorData: RqgActorDataSource,
    itemData: RqgItemDataSource,
    formData: RuneMagicCardFlags,
    cultData: CultDataSource
  ): string {
    assertItemType(itemData.type, ItemTypeEnum.RuneMagic);
    console.log("RUNE MAGIC CARD VALIDATE DATA");
    console.log(itemData);
    if (formData.formData.runePointCost > itemData.data.points) {
      return "Can not cast spell above learned level"; //TODO: Does this apply to Rune Magic?
    } else if (formData.formData.runePointCost > (cultData.data.runePoints.value || 0)) {
      return "Not enough rune points left";
    } else {
      return "";
    }
  }

  private static async renderContent(flags: RuneMagicCardFlags): Promise<object> {
    let html = await renderTemplate("systems/rqg/chat/runeMagicCard.hbs", flags);
    const speakerName = getSpeakerName(flags.actorId, flags.tokenId);
    return {
      flavor: "Rune Magic: " + flags.itemData.name,
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

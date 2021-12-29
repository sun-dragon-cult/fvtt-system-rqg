import { ItemDataSource } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";
import { stringify } from "querystring";
import { Rune } from "../actors/item-specific/rune";
import { RqgActor } from "../actors/rqgActor";
import { RqgActorDataSource } from "../data-model/actor-data/rqgActorData";
import { CultDataSource } from "../data-model/item-data/cultData";
import { ItemTypeEnum, RqgItemDataSource } from "../data-model/item-data/itemTypes";
import { RuneDataSource } from "../data-model/item-data/runeData";
import { Ability } from "../data-model/shared/ability";
import { RqgItem } from "../items/rqgItem";
import {
  assertItemType,
  getActorFromIds,
  getGame,
  getJournalEntryName,
  getSpeakerName,
  RqgError,
  usersThatOwnActor,
} from "../system/util";

type ShortRune = {
  name: string;
  id: string;
  chance: number;
};

type RuneMagicCardFlags = {
  actorId: string;
  tokenId: string | null; // Needed to avoid saving a full (possibly syntetic) actor
  itemData: ItemDataSource;
  eligibleRunes: RuneDataSource[];
  formData: {
    runePointCost: number;
    magicPointBoost: number;
    ritualOrMeditation: number;
    skillAugmentation: number;
    otherModifiers: number;
    chance: number;
    selectedRuneId: string;
    journalEntryName: string;
  };
};

export class RuneMagicCard {
  public static async show(
    runeMagicItemId: string,
    actor: RqgActor,
    token: TokenDocument | null
  ): Promise<void> {
    const runeMagicItem = actor.items.get(runeMagicItemId);
    assertItemType(runeMagicItem?.data.type, ItemTypeEnum.RuneMagic);
    console.log("INITIAL RUNE MAGIC ITEM: ", runeMagicItem);
    const cult = actor.items.get(runeMagicItem.data.data.cultId);
    assertItemType(cult?.data.type, ItemTypeEnum.Cult);
    console.log("INITIAL CULT: ", cult);

    if (!actor.id) {
      const msg = `Actor without id in rune magic card`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, actor);
    }

    let usableRuneNames: string[] = [];
    let runesForCasting: RuneDataSource[] = [];
    if (runeMagicItem.data.data.runes.includes("Magic (condition)")) {
      // Actor can use any of the cult's runes to cast
      // And some cults have the same rune more than once, so de-dupe them
      usableRuneNames = [...new Set(cult.data.data.runes)];
    } else {
      // Actor can use any of the Rune Magic Spell's runes to cast
      usableRuneNames = [...new Set(runeMagicItem.data.data.runes)];
    }

    // Get the actor's versions of the runes, which will have their "chance"
    usableRuneNames.forEach((rune) => {
      //@ts-ignore name
      const actorRune = actor.items.getName(rune);
      assertItemType(actorRune?.data.type, ItemTypeEnum.Rune);
      runesForCasting.push(actorRune.data);
    });

    console.log("runesForCasting: ", runesForCasting);

    const strongestRune = runesForCasting.reduce(function (prev, current) {
      //@ts-ignore data WHY?!
      return prev.data.chance > current.data.chance ? prev : current;
    });

    const eligibleShortRunes: ShortRune[] = [];

    console.log("STRONGEST RUNE: ", strongestRune);

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
        chance: strongestRune.data.chance,
        //@ts-ignore id
        selectedRuneId: strongestRune._id || "",
        journalEntryName: getJournalEntryName(runeMagicItem.data.data),
      },
    };

    console.log("INITIAL FLAGS: ", flags);

    ui?.sidebar?.tabs.chat && ui.sidebar?.activateTab(ui?.sidebar.tabs.chat.tabName);
    await ChatMessage.create(await this.renderContent(flags));
  }

  public static async inputChangeHandler(ev: Event, messageId: string): Promise<void> {
    console.log("INPUT CHANGE: ", ev);
    const chatMessage = getGame().messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg as RuneMagicCardFlags;
    console.log("FLAGS", flags);

    const form = (ev.target as HTMLElement).closest("form") as HTMLFormElement;
    const formData = new FormData(form);

    console.log("FORM DATA", formData);

    //@ts-ignore formData.entries
    for (const [name, value] of formData.entries()) {
      if (name in flags.formData) {
        //@ts-ignore Type 'any' is not assignable to type 'never'.
        flags.formData[name as keyof typeof flags.formData] = value;
      }
    }

    console.log("FLAGS after", flags);
    // Get use the selectedRuneId to get the actual rune from the eligible runes
    //@ts-ignore _id
    const selectedRune: RuneDataSource = flags.eligibleRunes.find(
      //@ts-ignore id
      (i) => i._id === flags.formData.selectedRuneId
    ) as Rune;

    console.log("SELECTED RUNE: ", selectedRune);
    //@ts-ignore data WHY?!
    const newChance: number =
      Number(selectedRune.data.chance) +
      Number(flags.formData.ritualOrMeditation) +
      Number(flags.formData.skillAugmentation) +
      Number(flags.formData.otherModifiers);

    console.log("New Chance: ", newChance);

    flags.formData.chance = newChance;

    const data = await RuneMagicCard.renderContent(flags);

    await chatMessage?.update(data);
  }

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
        // if (name === "selectedRune") {
        //   flags.formData.selectedRuneId = flags.eligibleRunes.filter(
        //     //@ts-ignore _id TODO: WHY?!
        //     (r) => r.actorRune._id === value
        //   )[0];
        // } else {
        //TODO: This is not type safe, so for instance a value that is supposed to be a number
        //ends up as a string in the formData property
        //@ts-ignore TODO: WHY?!
        flags.formData[name as keyof typeof flags.formData] = value;
        // }
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
    flags: RuneMagicCardFlags,
    actor: RqgActor,
    speakerName: string
  ): Promise<void> {
    console.log("RUNE MAGIC CARD ROLL");
    console.log(flags);
    assertItemType(itemData.type, ItemTypeEnum.RuneMagic);
    const cult = actor.items.get(itemData.data.cultId);
    assertItemType(cult?.data.type, ItemTypeEnum.Cult);
    const actorData = actor.data;
    const validationError = RuneMagicCard.validateData(actorData, itemData, flags, cult.data);

    //@ts-ignore _id
    const selectedRune: RuneDataSource = flags.eligibleRunes.find((i) => i._id === flags.formData.selectedRuneId);

    console.log("ROLL selectedRune: ", selectedRune);

    if (validationError) {
      ui.notifications?.warn(validationError);
    } else {
      const result = await Ability.roll(
        "Cast " + itemData.name,
        Number(selectedRune.data.chance),
        Number(flags.formData.ritualOrMeditation) +
          Number(flags.formData.skillAugmentation) +
          Number(flags.formData.otherModifiers),
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

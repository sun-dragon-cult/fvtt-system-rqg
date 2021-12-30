import { ItemDataSource } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";
import { Rune } from "../actors/item-specific/rune";
import { RqgActor } from "../actors/rqgActor";
import { RqgActorDataSource } from "../data-model/actor-data/rqgActorData";
import { CultDataSource } from "../data-model/item-data/cultData";
import { ItemTypeEnum, RqgItemDataSource } from "../data-model/item-data/itemTypes";
import { RuneDataSource } from "../data-model/item-data/runeData";
import { Ability, ResultEnum, ResultMessage } from "../data-model/shared/ability";
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
    cultId: string;
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
        cultId: cult.id || "",
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
        //TODO: This is not type safe, so for instance a value that is supposed to be a number
        //ends up as a string in the formData property
        //@ts-ignore TODO: WHY?!
        flags.formData[name as keyof typeof flags.formData] = value;
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

    const selectedRune: RuneDataSource | undefined = flags.eligibleRunes.find(
      //@ts-ignore _id
      (i) => i._id === flags.formData.selectedRuneId
    );

    if (!selectedRune) {
      // the ui should make this impossible
      console.log("Attempt to roll a Rune Magic Spell with no Rune selected on the card.");
      return;
    }

    console.log("ROLL selectedRune: ", selectedRune);

    if (validationError) {
      ui.notifications?.warn(validationError);
    } else {
      const resultMessages: ResultMessage[] = [];
      resultMessages.push({
        result: ResultEnum.Critical,
        html: `<div>The spell takes effect and costs no Rune Points and ${flags.formData.magicPointBoost} Magic Points from boosting.</div>`,
      });
      resultMessages.push({
        result: ResultEnum.Special,
        html: `<div>The spell takes effect and costs ${flags.formData.runePointCost} and ${flags.formData.magicPointBoost} Magic Points from boosting.</div>`,
      });
      resultMessages.push({
        result: ResultEnum.Success,
        html: `<div>The spell takes effect and costs ${flags.formData.runePointCost} and ${flags.formData.magicPointBoost} Magic Points from boosting.</div>`,
      });
      resultMessages.push({
        result: ResultEnum.Failure,
        html: `<div>The spell fails to take effect but no Rune Points are lost.  If boosted with Magic Points, one is lost.</div>`,
      });
      resultMessages.push({
        result: ResultEnum.Fumble,
        html: `<div>The spell fails to take effect and ${flags.formData.runePointCost} Rune Points are lost.  If boosted with Magic Points, one is lost.</div>`,
      });
      const result = await Ability.roll(
        "Cast " + itemData.name,
        Number(selectedRune.data.chance),
        Number(flags.formData.ritualOrMeditation) +
          Number(flags.formData.skillAugmentation) +
          Number(flags.formData.otherModifiers),
        speakerName,
        resultMessages
      );
      if (result === ResultEnum.Critical) {
        // spell takes effect, Rune Points NOT spent, Rune gets xp check, boosting Magic Points spent
        await RuneMagicCard.SpendRuneAndMagicPoints(
          0,
          flags.formData.magicPointBoost,
          flags.actorId,
          flags.formData.cultId
        );
      } else if (result === ResultEnum.Success || result === ResultEnum.Special) {
        // spell takes effect, Rune Points spent, Rune gets xp check, boosting Magic Points spent
        await RuneMagicCard.SpendRuneAndMagicPoints(
          flags.formData.runePointCost,
          flags.formData.magicPointBoost,
          flags.actorId,
          flags.formData.cultId
        );
      } else if (result === ResultEnum.Failure) {
        // spell fails, no Rune Point Loss, if Magic Point boosted, lose 1 Magic Point if boosted
        const boosted = flags.formData.magicPointBoost >= 1 ? 1 : 0;
        await RuneMagicCard.SpendRuneAndMagicPoints(
          0,
          boosted,
          flags.actorId,
          flags.formData.cultId
        );
      } else if (result === ResultEnum.Fumble) {
        // spell fails, lose Rune Points, if Magic Point boosted, lose 1 Magic Point if boosted
        const boosted = flags.formData.magicPointBoost >= 1 ? 1 : 0;
        await RuneMagicCard.SpendRuneAndMagicPoints(
          flags.formData.runePointCost,
          boosted,
          flags.actorId,
          flags.formData.cultId
        );
      }
    }
  }

  private static async SpendRuneAndMagicPoints(
    runePoints: number,
    magicPoints: number,
    actorId: string,
    cultId: string
  ) {
    const actor = getGame().actors?.get(actorId);
    const cult = actor?.items.get(cultId);
    assertItemType(cult?.data.type, ItemTypeEnum.Cult);
    // At this point if the current Rune Points or Magic Points are zero
    // it's too late. That validation happened earlier.
    const newRunePointTotal: number = (cult.data.data.runePoints.value || 0) - runePoints;
    const newMagicPointTotal: number =
      (actor?.data.data.attributes.magicPoints.value || 0) - magicPoints;
    const updateRp: DeepPartial<ItemDataSource> = {
      _id: cult?.id,
      data: { runePoints: { value: newRunePointTotal } },
    };
    await actor?.updateEmbeddedDocuments("Item", [updateRp]);
    const updateMp = {
      "data.attributes.magicPoints.value": newMagicPointTotal,
    };
    await actor?.update(updateMp);
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
      return "Not enough rune points left!";
    } else if (
      formData.formData.magicPointBoost > (actorData?.data?.attributes?.magicPoints?.value || 0)
    ) {
      return "Not enough magic points left to boost that much!";
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

import { ItemDataSource } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";
import { Rune } from "../actors/item-specific/rune";
import { RqgActor } from "../actors/rqgActor";
import { RqgActorDataSource } from "../data-model/actor-data/rqgActorData";
import { CultDataSource } from "../data-model/item-data/cultData";
import { ItemTypeEnum, RqgItemDataSource } from "../data-model/item-data/itemTypes";
import { RuneDataSource } from "../data-model/item-data/runeData";
import { RuneMagicDataSource } from "../data-model/item-data/runeMagicData";
import { Ability, ResultEnum, ResultMessage } from "../data-model/shared/ability";
import { RqgItem } from "../items/rqgItem";
import {
  assertItemType,
  getActorFromIds,
  getGame,
  getJournalEntryName,
  getSpeakerName,
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
    journalPack: string;
    ritualOrMeditationOptions: any;
    skillAugmentationOptions: any;
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
    const cult = actor.items.get(runeMagicItem.data.data.cultId);
    assertItemType(cult?.data.type, ItemTypeEnum.Cult);

    let usableRuneNames: string[] = [];
    let runesForCasting: RuneDataSource[] = [];
    if (
      runeMagicItem.data.data.runes.includes(
        getGame().settings.get("rqg", "magicRuneName") as string
      )
    ) {
      // Actor can use any of the cult's runes to cast
      // And some cults have the same rune more than once, so de-dupe them
      usableRuneNames = [...new Set(cult.data.data.runes)];
    } else {
      // Actor can use any of the Rune Magic Spell's runes to cast
      usableRuneNames = [...new Set(runeMagicItem.data.data.runes)];
    }

    // Get the actor's versions of the runes, which will have their "chance"
    usableRuneNames.forEach((rune) => {
      const actorRune = actor.items.getName(rune);
      assertItemType(actorRune?.data.type, ItemTypeEnum.Rune);
      runesForCasting.push(actorRune.data);
    });

    const strongestRune = runesForCasting.reduce(function (prev, current) {
      return prev.data.chance > current.data.chance ? prev : current;
    });

    const ritualOrMeditationOptions: any = {};
    for (let i = 0; i <= 100; i += 5) {
      ritualOrMeditationOptions[i] = getGame().i18n.localize(
        "RQG.Dialog.RuneMagicCard.MeditationOrRitualValue" + i
      );
    }

    const skillAugmentationOptions: any = {};
    [0, 50, 30, 20, -20, -50].forEach((value) => {
      skillAugmentationOptions[value] = getGame().i18n.localize(
        "RQG.Dialog.RuneMagicCard.SkillAugmentationValue" + value
      );
    });

    const flags: RuneMagicCardFlags = {
      actorId: actor.id || "",
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
        //@ts-ignore _id
        selectedRuneId: strongestRune._id || "",
        journalEntryName: getJournalEntryName(runeMagicItem.data.data),
        journalPack: runeMagicItem.data.data.journalPack,
        ritualOrMeditationOptions: ritualOrMeditationOptions,
        skillAugmentationOptions: skillAugmentationOptions,
      },
    };

    ui?.sidebar?.tabs.chat && ui.sidebar?.activateTab(ui?.sidebar.tabs.chat.tabName);
    await ChatMessage.create(await this.renderContent(flags));
  }

  public static async inputChangeHandler(ev: Event, messageId: string): Promise<void> {
    const chatMessage = getGame().messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg as RuneMagicCardFlags;

    const form = (ev.target as HTMLElement).closest("form") as HTMLFormElement;
    const formData = new FormData(form);

    //@ts-ignore formData.entries
    for (const [name, value] of formData.entries()) {
      if (name in flags.formData) {
        //@ts-ignore Type 'any' is not assignable to type 'never'.
        flags.formData[name as keyof typeof flags.formData] = value;
      }
    }

    //@ts-ignore Type 'AbstractEmbeddedItem' is missing the following properties from type 'RuneDataSource'
    const selectedRune: RuneDataSource = flags.eligibleRunes.find(
      //@ts-ignore _id
      (i) => i._id === flags.formData.selectedRuneId
    ) as Rune;

    const newChance: number =
      Number(selectedRune.data.chance) +
      Number(flags.formData.ritualOrMeditation) +
      Number(flags.formData.skillAugmentation) +
      Number(flags.formData.otherModifiers);

    flags.formData.chance = newChance;
    const data = await RuneMagicCard.renderContent(flags);
    await chatMessage?.update(data);
  }

  public static async formSubmitHandler(
    ev: JQueryEventObject,
    messageId: string
  ): Promise<boolean> {
    ev.preventDefault();

    const chatMessage = getGame().messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg as RuneMagicCardFlags;

    const formData = new FormData(ev.target as HTMLFormElement);
    // @ts-ignore formData.entries()
    for (const [name, value] of formData.entries()) {
      if (name in flags.formData) {
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
      ui.notifications?.warn(getGame().i18n.localize("RQG.Dialog.RuneMagicCard.getActorFromIdsWarning"));
    }
    return false;
  }

  public static async directRoll(
    runeMagicItem: RqgItem,
    actor: RqgActor,
    speakerName: string
  ): Promise<void> {
    assertItemType(runeMagicItem?.data.type, ItemTypeEnum.RuneMagic);
    const cult = actor.items.get(runeMagicItem.data.data.cultId);
    assertItemType(cult?.data.type, ItemTypeEnum.Cult);

    let usableRuneNames: string[] = [];
    let runesForCasting: RuneDataSource[] = [];
    if (runeMagicItem.data.data.runes.includes(getGame().settings.get("rqg", "magicRuneName"))) {
      // Actor can use any of the cult's runes to cast
      // And some cults have the same rune more than once, so de-dupe them
      usableRuneNames = [...new Set(cult.data.data.runes)];
    } else {
      // Actor can use any of the Rune Magic Spell's runes to cast
      usableRuneNames = [...new Set(runeMagicItem.data.data.runes)];
    }

    // Get the actor's versions of the runes, which will have their "chance"
    usableRuneNames.forEach((rune) => {
      const actorRune = actor.items.getName(rune);
      assertItemType(actorRune?.data.type, ItemTypeEnum.Rune);
      runesForCasting.push(actorRune.data);
    });

    const strongestRune = runesForCasting.reduce(function (prev, current) {
      return prev.data.chance > current.data.chance ? prev : current;
    });

    const flags: RuneMagicCardFlags = {
      actorId: actor.id || "",
      tokenId: actor.token?.id ?? null,
      itemData: runeMagicItem.data.toObject(),
      eligibleRunes: runesForCasting, // won't be used
      formData: {
        runePointCost: runeMagicItem.data.data.points,
        cultId: cult.id || "",
        magicPointBoost: 0,
        ritualOrMeditation: 0,
        skillAugmentation: 0,
        otherModifiers: 0,
        chance: strongestRune.data.chance,
        //@ts-ignore _id
        selectedRuneId: strongestRune._id || "",
        journalEntryName: getJournalEntryName(runeMagicItem.data.data),
        journalPack: runeMagicItem.data.data.journalPack,
        ritualOrMeditationOptions: {}, // won't be used
        skillAugmentationOptions: {}, // won't be used
      },
    };
    ui?.sidebar?.tabs.chat && ui.sidebar?.activateTab(ui?.sidebar.tabs.chat.tabName);
    await RuneMagicCard.roll(flags.itemData, flags, actor, speakerName);
  }

  public static async roll(
    itemData: ItemDataSource,
    flags: RuneMagicCardFlags,
    actor: RqgActor,
    speakerName: string
  ): Promise<void> {
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
      console.log(getGame().i18n.localize("RQG.Dialog.RuneMagicCard.noSelectedRuneWarning"));
      return;
    }

    if (validationError) {
      ui.notifications?.warn(validationError);
    } else {
      const resultMessages: ResultMessage[] = [];
      resultMessages.push({
        result: ResultEnum.Critical,
        html: getGame().i18n.format("RQG.Dialog.RuneMagicCard.resultMessageCritical", {
          magicPointBoost: flags.formData.magicPointBoost,
        }),
      });
      resultMessages.push({
        result: ResultEnum.Special,
        html: getGame().i18n.format("RQG.Dialog.RuneMagicCard.resultMessageSpecial", {
          runePointCost: flags.formData.runePointCost,
          magicPointBoost: flags.formData.magicPointBoost,
        }),
      });
      resultMessages.push({
        result: ResultEnum.Success,
        html: getGame().i18n.format("RQG.Dialog.RuneMagicCard.resultMessageSuccess", {
          runePointCost: flags.formData.runePointCost,
          magicPointBoost: flags.formData.magicPointBoost,
        }),
      });
      resultMessages.push({
        result: ResultEnum.Failure,
        html: getGame().i18n.format("RQG.Dialog.RuneMagicCard.resultMessageFailure"),
      });
      resultMessages.push({
        result: ResultEnum.Fumble,
        html: getGame().i18n.format("RQG.Dialog.RuneMagicCard.resultMessageFumble", {
          runePointCost: flags.formData.runePointCost,
        }),
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
      const runeMagicSpell = flags.itemData as RuneMagicDataSource;
      if (result === ResultEnum.Critical) {
        // spell takes effect, Rune Points NOT spent, Rune gets xp check, boosting Magic Points spent
        await RuneMagicCard.SpendRuneAndMagicPoints(
          0,
          flags.formData.magicPointBoost,
          flags.actorId,
          flags.formData.cultId,
          runeMagicSpell.data.isOneUse
        );
        await actor.AwardExperience(flags.formData.selectedRuneId);
      } else if (result === ResultEnum.Success || result === ResultEnum.Special) {
        // spell takes effect, Rune Points spent, Rune gets xp check, boosting Magic Points spent
        await RuneMagicCard.SpendRuneAndMagicPoints(
          flags.formData.runePointCost,
          flags.formData.magicPointBoost,
          flags.actorId,
          flags.formData.cultId,
          runeMagicSpell.data.isOneUse
        );
        await actor.AwardExperience(flags.formData.selectedRuneId);
      } else if (result === ResultEnum.Failure) {
        // spell fails, no Rune Point Loss, if Magic Point boosted, lose 1 Magic Point if boosted
        const boosted = flags.formData.magicPointBoost >= 1 ? 1 : 0;
        await RuneMagicCard.SpendRuneAndMagicPoints(
          0,
          boosted,
          flags.actorId,
          flags.formData.cultId,
          runeMagicSpell.data.isOneUse
        );
      } else if (result === ResultEnum.Fumble) {
        // spell fails, lose Rune Points, if Magic Point boosted, lose 1 Magic Point if boosted
        const boosted = flags.formData.magicPointBoost >= 1 ? 1 : 0;
        await RuneMagicCard.SpendRuneAndMagicPoints(
          flags.formData.runePointCost,
          boosted,
          flags.actorId,
          flags.formData.cultId,
          runeMagicSpell.data.isOneUse
        );
      }
    }
  }

  private static async SpendRuneAndMagicPoints(
    runePoints: number,
    magicPoints: number,
    actorId: string,
    cultId: string,
    oneUse: boolean
  ) {
    const actor = getGame().actors?.get(actorId);
    const cult = actor?.items.get(cultId);
    assertItemType(cult?.data.type, ItemTypeEnum.Cult);
    // At this point if the current Rune Points or Magic Points are zero
    // it's too late. That validation happened earlier.
    const newRunePointTotal: number = (cult.data.data.runePoints.value || 0) - runePoints;
    const newMagicPointTotal: number =
      (actor?.data.data.attributes.magicPoints.value || 0) - magicPoints;
    let newRunePointMaxTotal: number = cult.data.data.runePoints.max || 0;
    if (oneUse) {
      newRunePointMaxTotal -= runePoints;
      if (newRunePointMaxTotal < (cult.data.data.runePoints.max || 0)) {
        ui.notifications?.info(getGame().i18n.format("RQG.Dialog.RuneMagicCard.SpentOneUseRunePoints", {actorName: actor?.name, runePoints: runePoints, cultName: cult.name}));
      }
    }
    const updateCultItemRunePoints: DeepPartial<ItemDataSource> = {
      _id: cult?.id,
      data: { runePoints: { value: newRunePointTotal, max: newRunePointMaxTotal } },
    };
    await actor?.updateEmbeddedDocuments("Item", [updateCultItemRunePoints]);
    const updateActorMagicPoints = {
      //"data.attributes.magicPoints.value": newMagicPointTotal
      data: { attributes: { magicPoints: { value: newMagicPointTotal } } },
    };
    await actor?.update(updateActorMagicPoints);
  }

  public static validateData(
    actorData: RqgActorDataSource,
    itemData: RqgItemDataSource,
    formData: RuneMagicCardFlags,
    cultData: CultDataSource
  ): string {
    assertItemType(itemData.type, ItemTypeEnum.RuneMagic);
    if (Number(formData.formData.runePointCost) > (Number(cultData.data.runePoints.value) || 0)) {
      return getGame().i18n.format("RQG.Dialog.RuneMagicCard.validationNotEnoughRunePoints");
    } else if (
      Number(formData.formData.magicPointBoost) >
      (Number(actorData?.data?.attributes?.magicPoints?.value) || 0)
    ) {
      return getGame().i18n.format("RQG.Dialog.RuneMagicCard.validationNotEnoughMagicPoints");
    } else {
      return "";
    }
  }

  private static async renderContent(flags: RuneMagicCardFlags): Promise<object> {
    let html = await renderTemplate("systems/rqg/chat/runeMagicCard.hbs", flags);
    const speakerName = getSpeakerName(flags.actorId, flags.tokenId);
    return {
      flavor: getGame().i18n.format("RQG.Dialog.RuneMagicCard.runeMagicResultFlavor", {
        name: flags.itemData.name,
      }),
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

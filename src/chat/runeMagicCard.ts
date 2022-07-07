import { ItemDataSource } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";
import { RqgActor } from "../actors/rqgActor";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { RuneDataPropertiesData } from "../data-model/item-data/runeData";
import { Ability, ResultEnum, ResultMessage } from "../data-model/shared/ability";
import { RqgItem } from "../items/rqgItem";
import {
  activateChatTab,
  assertActorType,
  assertChatMessageFlagType,
  assertItemType,
  cleanIntegerString,
  convertFormValueToInteger,
  convertFormValueToString,
  getDocumentFromUuid,
  getGame,
  getRequiredDocumentFromUuid,
  localize,
  requireValue,
  RqgError,
  usersIdsThatOwnActor,
} from "../system/util";
import { RqgChatMessageFlags, RuneMagicCardFlags } from "../data-model/shared/rqgDocumentFlags";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";
import { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";
import { RqgChatMessage } from "./RqgChatMessage";

export class RuneMagicCard {
  public static async show(
    runeMagicItemId: string,
    actor: RqgActor,
    token: TokenDocument | undefined
  ): Promise<void> {
    const runeMagicItem = actor.items.get(runeMagicItemId);
    assertItemType(runeMagicItem?.data.type, ItemTypeEnum.RuneMagic);
    const cult = actor.items.get(runeMagicItem.data.data.cultId);
    assertItemType(cult?.data.type, ItemTypeEnum.Cult);

    const eligibleRunes = RuneMagicCard.getEligibleRunes(runeMagicItem, actor);
    const defaultRuneId = RuneMagicCard.getStrongestRune(eligibleRunes)?.id;

    const flags: RuneMagicCardFlags = {
      type: "runeMagicCard",
      card: {
        actorUuid: actor.uuid,
        tokenUuid: token?.uuid,
        chatImage: runeMagicItem.img ?? "",
        itemUuid: runeMagicItem?.uuid,
      },
      formData: {
        runePointCost: runeMagicItem.data.data.points.toString(),
        magicPointBoost: "",
        ritualOrMeditation: "0",
        skillAugmentation: "0",
        otherModifiers: "",
        selectedRuneId: defaultRuneId ?? "",
      },
    };

    await ChatMessage.create(await this.renderContent(flags));
    activateChatTab();
  }

  /**
   * Do a roll from the Rune Magic Chat card. Use the flags on the chatMessage to get the required data.
   * Called from {@link RqgChatMessage.doRoll}
   */
  public static async rollFromChat(chatMessage: RqgChatMessage): Promise<void> {
    const flags = chatMessage.data.flags.rqg;
    assertChatMessageFlagType(flags?.type, "runeMagicCard");
    const actor = await getRequiredDocumentFromUuid<RqgActor>(flags.card.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.card.tokenUuid);
    const speaker = ChatMessage.getSpeaker({ actor: actor, token: token });
    const runeMagicItem = (await getRequiredDocumentFromUuid(flags.card.itemUuid)) as
      | RqgItem
      | undefined;
    requireValue(runeMagicItem, "Couldn't find item on item chat message");
    const {
      runePointCost,
      magicPointBoost,
      ritualOrMeditation,
      skillAugmentation,
      otherModifiers,
      selectedRuneId,
    } = await RuneMagicCard.getFormDataFromFlags(flags);
    await RuneMagicCard.roll(
      runeMagicItem,
      runePointCost,
      magicPointBoost,
      ritualOrMeditation,
      skillAugmentation,
      otherModifiers,
      actor,
      speaker,
      selectedRuneId
    );
  }

  public static async roll(
    runeMagicItem: RqgItem,
    runePointsCast: number,
    magicPointBoost: number,
    ritualOrMeditation: number,
    skillAugmentation: number,
    otherModifiers: number,
    actor: RqgActor,
    speaker: ChatSpeakerDataProperties,
    usedRuneId?: string
  ): Promise<void> {
    assertItemType(runeMagicItem?.data.type, ItemTypeEnum.RuneMagic);
    const runeMagicCultId = runeMagicItem?.data.data.cultId;
    const cult = actor.getEmbeddedDocument("Item", runeMagicCultId) as RqgItem | undefined;
    assertItemType(cult?.data.type, ItemTypeEnum.Cult);
    if (!usedRuneId) {
      const eligibleRunes = RuneMagicCard.getEligibleRunes(runeMagicItem, actor);
      usedRuneId = RuneMagicCard.getStrongestRune(eligibleRunes)?.id ?? "";
    }
    const runeItem = actor.getEmbeddedDocument("Item", usedRuneId) as RqgItem | undefined;
    assertItemType(runeItem?.data.type, ItemTypeEnum.Rune);

    const validationError = RuneMagicCard.validateData(
      actor,
      cult,
      runePointsCast,
      magicPointBoost
    );
    if (validationError) {
      ui.notifications?.warn(validationError);
      return;
    }

    const resultMessages: ResultMessage[] = [
      {
        result: ResultEnum.Critical,
        html: localize("RQG.Dialog.runeMagicCard.resultMessageCritical", {
          magicPointBoost: magicPointBoost,
        }),
      },
      {
        result: ResultEnum.Special,
        html: localize("RQG.Dialog.runeMagicCard.resultMessageSpecial", {
          runePointCost: runePointsCast,
          magicPointBoost: magicPointBoost,
        }),
      },
      {
        result: ResultEnum.Success,
        html: localize("RQG.Dialog.runeMagicCard.resultMessageSuccess", {
          runePointCost: runePointsCast,
          magicPointBoost: magicPointBoost,
        }),
      },
      {
        result: ResultEnum.Failure,
        html: localize("RQG.Dialog.runeMagicCard.resultMessageFailure"),
      },
      {
        result: ResultEnum.Fumble,
        html: localize("RQG.Dialog.runeMagicCard.resultMessageFumble", {
          runePointCost: runePointsCast,
        }),
      },
    ];

    const result = await Ability.roll(
      localize("RQG.Dialog.runeMagicCard.Cast", { spellName: runeMagicItem.name }),
      Number(runeItem.data.data.chance),
      ritualOrMeditation + skillAugmentation + otherModifiers,
      speaker,
      resultMessages
    );

    await RuneMagicCard.handleResult(
      result,
      runePointsCast,
      magicPointBoost,
      actor,
      runeItem,
      runeMagicItem
    );
  }

  private static async handleResult(
    result: ResultEnum,
    runePointsUsed: number,
    magicPointsUsed: number,
    actor: RqgActor,
    runeItem: RqgItem,
    runeMagicItem: RqgItem
  ): Promise<void> {
    assertItemType(runeItem.data.type, ItemTypeEnum.Rune);
    assertItemType(runeMagicItem.data.type, ItemTypeEnum.RuneMagic);
    const cult = actor.getEmbeddedDocument("Item", runeMagicItem.data.data.cultId ?? "") as
      | RqgItem
      | undefined;
    assertItemType(cult?.data.type, ItemTypeEnum.Cult);
    const isOneUse = runeMagicItem.data.data.isOneUse;

    switch (result) {
      case ResultEnum.Critical:
      case ResultEnum.SpecialCritical:
      case ResultEnum.HyperCritical:
        // spell takes effect, Rune Points NOT spent, Rune gets xp check, boosting Magic Points spent
        await RuneMagicCard.SpendRuneAndMagicPoints(0, magicPointsUsed, actor, cult, isOneUse);
        await actor.AwardExperience(runeItem.id);
        break;

      case ResultEnum.Success:
      case ResultEnum.Special:
        // spell takes effect, Rune Points spent, Rune gets xp check, boosting Magic Points spent
        await RuneMagicCard.SpendRuneAndMagicPoints(
          runePointsUsed,
          magicPointsUsed,
          actor,
          cult,
          isOneUse
        );
        await actor.AwardExperience(runeItem.id);
        break;

      case ResultEnum.Failure:
        {
          // spell fails, no Rune Point Loss, if Magic Point boosted, lose 1 Magic Point if boosted
          const boosted = magicPointsUsed >= 1 ? 1 : 0;
          await RuneMagicCard.SpendRuneAndMagicPoints(0, boosted, actor, cult, isOneUse);
        }
        break;

      case ResultEnum.Fumble:
        // spell fails, lose Rune Points, if Magic Point boosted, lose 1 Magic Point if boosted
        const boosted = magicPointsUsed >= 1 ? 1 : 0;
        await RuneMagicCard.SpendRuneAndMagicPoints(runePointsUsed, boosted, actor, cult, isOneUse);
        break;

      default:
        const msg = "Got unexpected result from roll in runeMagicCard";
        ui.notifications?.error(msg);
        throw new RqgError(msg);
    }
  }

  private static async SpendRuneAndMagicPoints(
    runePoints: number,
    magicPoints: number,
    actor: RqgActor,
    cult: RqgItem,
    isOneUse: boolean
  ) {
    assertItemType(cult.data.type, ItemTypeEnum.Cult);
    assertActorType(actor.data.type, ActorTypeEnum.Character);
    // At this point if the current Rune Points or Magic Points are zero
    // it's too late. That validation happened earlier.
    const newRunePointTotal = (cult.data.data.runePoints.value || 0) - runePoints;
    const newMagicPointTotal = (actor?.data.data.attributes.magicPoints.value || 0) - magicPoints;
    let newRunePointMaxTotal = cult.data.data.runePoints.max || 0;
    if (isOneUse) {
      newRunePointMaxTotal -= runePoints;
      if (newRunePointMaxTotal < (cult.data.data.runePoints.max || 0)) {
        ui.notifications?.info(
          localize("RQG.Dialog.runeMagicCard.SpentOneUseRunePoints", {
            actorName: actor?.name,
            runePoints: runePoints,
            cultName: cult.name,
          })
        );
      }
    }
    const updateCultItemRunePoints: DeepPartial<ItemDataSource> = {
      _id: cult?.id,
      data: { runePoints: { value: newRunePointTotal, max: newRunePointMaxTotal } },
    };
    await actor?.updateEmbeddedDocuments("Item", [updateCultItemRunePoints]);
    const updateActorMagicPoints = {
      data: { attributes: { magicPoints: { value: newMagicPointTotal } } },
    };
    await actor?.update(updateActorMagicPoints);
  }

  public static validateData(
    actor: RqgActor,
    cultItem: RqgItem,
    runePointsUsed: number,
    magicPointsBoost: number
  ): string {
    assertItemType(cultItem?.data.type, ItemTypeEnum.Cult);
    if (runePointsUsed > (Number(cultItem.data.data.runePoints.value) || 0)) {
      return getGame().i18n.format("RQG.Dialog.RuneMagicCard.validationNotEnoughRunePoints");
    } else if (magicPointsBoost > (Number(actor?.data.data.attributes?.magicPoints?.value) || 0)) {
      return localize("RQG.Dialog.runeMagicCard.validationNotEnoughMagicPoints");
    } else {
      return "";
    }
  }

  public static async renderContent(flags: RqgChatMessageFlags): Promise<object> {
    assertChatMessageFlagType(flags.type, "runeMagicCard");
    const actor = await getRequiredDocumentFromUuid<RqgActor>(flags.card.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.card.tokenUuid);
    const runeMagicItem = await getRequiredDocumentFromUuid<RqgItem>(flags.card.itemUuid);
    assertItemType(runeMagicItem.data.type, ItemTypeEnum.RuneMagic);
    const eligibleRunes = RuneMagicCard.getEligibleRunes(runeMagicItem, actor);
    const { otherModifiers, selectedRuneId, ritualOrMeditation, skillAugmentation } =
      await RuneMagicCard.getFormDataFromFlags(flags);
    const selectedRune = actor.getEmbeddedDocument("Item", selectedRuneId) as RqgItem | undefined;
    assertItemType(selectedRune?.data.type, ItemTypeEnum.Rune);

    const chance =
      Number(selectedRune.data.data.chance) +
      ritualOrMeditation +
      skillAugmentation +
      otherModifiers;

    const ritualOrMeditationOptions: any = {};
    for (let i = 0; i <= 100; i += 5) {
      ritualOrMeditationOptions[i] = localize(
        "RQG.Dialog.runeMagicCard.MeditationOrRitualValue" + i
      );
    }

    const skillAugmentationOptions: any = {};
    [0, 50, 30, 20, -20, -50].forEach((value) => {
      skillAugmentationOptions[value] = localize(
        "RQG.Dialog.runeMagicCard.SkillAugmentationValue" + value
      );
    });

    const templateData = {
      ...flags,
      eligibleRunes: eligibleRunes,
      spellRunes: runeMagicItem.data.data.runes,
      isOneUse: runeMagicItem.data.data.isOneUse,
      descriptionLink: runeMagicItem.data.data.descriptionRqidLink,
      ritualOrMeditationOptions: ritualOrMeditationOptions,
      skillAugmentationOptions: skillAugmentationOptions,
      chance: chance,
      cardHeading: localize("RQG.Dialog.runeMagicCard.runeMagicResultFlavor", {
        name: runeMagicItem.name,
      }),
    };

    let html = await renderTemplate("systems/rqg/chat/runeMagicCard.hbs", templateData);

    return {
      user: getGame().user?.id,
      speaker: ChatMessage.getSpeaker({ actor: actor, token: token }),
      actorImg: actor.img,
      content: html,
      whisper: usersIdsThatOwnActor(actor),
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      flags: {
        core: { canPopout: true },
        rqg: flags,
      },
    };
  }

  public static async getFormDataFromFlags(flags: RqgChatMessageFlags): Promise<{
    runePointCost: number;
    ritualOrMeditation: number;
    skillAugmentation: number;
    otherModifiers: number;
    magicPointBoost: number;
    selectedRuneId: string;
  }> {
    assertChatMessageFlagType(flags.type, "runeMagicCard");
    const runePointCost = convertFormValueToInteger(flags.formData.runePointCost);
    const magicPointBoost = convertFormValueToInteger(flags.formData.magicPointBoost);
    const ritualOrMeditation = convertFormValueToInteger(flags.formData.ritualOrMeditation);
    const skillAugmentation = convertFormValueToInteger(flags.formData.skillAugmentation);
    const otherModifiers = convertFormValueToInteger(flags.formData.otherModifiers);
    const selectedRuneId = convertFormValueToString(flags.formData.selectedRuneId);
    return {
      runePointCost: runePointCost,
      magicPointBoost: magicPointBoost,
      ritualOrMeditation: ritualOrMeditation,
      skillAugmentation: skillAugmentation,
      otherModifiers: otherModifiers,
      selectedRuneId: selectedRuneId,
    };
  }

  /**
   * Store the current raw string (FormDataEntryValue) form values to the flags
   * Called from {@link RqgChatMessage.formSubmitHandler} and {@link RqgChatMessage.inputChangeHandler}
   */
  public static updateFlagsFromForm(flags: RqgChatMessageFlags, ev: Event): void {
    assertChatMessageFlagType(flags.type, "runeMagicCard");
    const form = (ev.target as HTMLElement)?.closest("form") as HTMLFormElement;
    const formData = new FormData(form);

    flags.formData.runePointCost = cleanIntegerString(formData.get("runePointCost"));
    flags.formData.magicPointBoost = cleanIntegerString(formData.get("magicPointBoost"));
    flags.formData.ritualOrMeditation = cleanIntegerString(formData.get("ritualOrMeditation"));
    flags.formData.skillAugmentation = cleanIntegerString(formData.get("skillAugmentation"));
    flags.formData.otherModifiers = cleanIntegerString(formData.get("otherModifiers"));
    flags.formData.selectedRuneId = convertFormValueToString(formData.get("selectedRuneId"));
  }

  /**
   * Given a rune spell and an actor, returns the runes that are possible to use for casting that spell.
   */
  private static getEligibleRunes(runeMagicItem: RqgItem, actor: RqgActor): RqgItem[] {
    assertItemType(runeMagicItem.data.type, ItemTypeEnum.RuneMagic);
    assertActorType(actor.data.type, ActorTypeEnum.Character);

    // The cult from where the spell was learned
    const cult = actor.getEmbeddedDocument("Item", runeMagicItem.data.data.cultId) as
      | RqgItem
      | undefined;
    assertItemType(cult?.data.type, ItemTypeEnum.Cult);

    // Get the name of the "magic" rune.
    const magicRuneName = getGame().settings.get("rqg", "magicRuneName");

    let usableRuneNames: string[];
    if (runeMagicItem.data.data.runes.includes(magicRuneName)) {
      // Actor can use any of the cult's runes to cast
      // And some cults have the same rune more than once, so de-dupe them
      usableRuneNames = [...new Set(cult.data.data.runes)];
    } else {
      // Actor can use any of the Rune Magic Spell's runes to cast
      usableRuneNames = [...new Set(runeMagicItem.data.data.runes)];
    }

    let runesForCasting: RqgItem[] = [];
    // Get the actor's versions of the runes, which will have their "chance"
    usableRuneNames.forEach((runeName: string) => {
      const actorRune = actor.items.getName(runeName);
      assertItemType(actorRune?.data.type, ItemTypeEnum.Rune);
      runesForCasting.push(actorRune);
    });

    return runesForCasting;
  }

  private static getStrongestRune(runeMagicItems: RqgItem[]): RqgItem | undefined {
    if (runeMagicItems.length === 0) {
      return undefined;
    }
    return runeMagicItems.reduce((strongest: RqgItem, current: RqgItem) => {
      const strongestRuneChance = (strongest.data.data as RuneDataPropertiesData).chance ?? 0;
      const currentRuneChance = (current.data.data as RuneDataPropertiesData).chance ?? 0;
      return strongestRuneChance > currentRuneChance ? strongest : current;
    });
  }
}

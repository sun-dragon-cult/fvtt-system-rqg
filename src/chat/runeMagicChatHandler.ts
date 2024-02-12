import { RqgActor } from "../actors/rqgActor";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { RqgItem } from "../items/rqgItem";
import {
  assertChatMessageFlagType,
  assertHtmlElement,
  assertItemType,
  cleanIntegerString,
  convertFormValueToInteger,
  convertFormValueToString,
  getDocumentFromUuid,
  getGame,
  getRequiredDocumentFromUuid,
  getRequiredRqgActorFromUuid,
  localize,
  requireValue,
  usersIdsThatOwnActor,
} from "../system/util";
import { RqgChatMessageFlags } from "../data-model/shared/rqgDocumentFlags";
import { ChatSpeakerData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";
import { RqgChatMessage } from "./RqgChatMessage";
import { ChatMessageDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData";
import { RuneMagic } from "../items/rune-magic-item/runeMagic";
import { templatePaths } from "../system/loadHandlebarsTemplates";

export class RuneMagicChatHandler {
  /**
   * Do a roll from the Rune Magic Chat message. Use the flags on the chatMessage to get the required data.
   * Called from {@link RqgChatMessage.doRoll}
   */
  public static async rollFromChat(chatMessage: RqgChatMessage): Promise<void> {
    const flags = chatMessage.flags.rqg;
    assertChatMessageFlagType(flags?.type, "runeMagicChat");
    const runeMagicItem = await getRequiredDocumentFromUuid<RqgItem | undefined>(
      flags.chat.itemUuid,
    );
    requireValue(runeMagicItem, "Couldn't find item on item chat message");

    // TODO don't roll from chat, roll from dialog
    // const {
    //   runePointCost,
    //   magicPointBoost,
    //   ritualOrMeditation,
    //   skillAugmentation,
    //   otherModifiers,
    //   selectedRuneId,
    // } = await RuneMagicChatHandler.getFormDataFromFlags(flags);

    // await runeMagicItem.abilityRoll({
    //   runePointCost,
    //   magicPointBoost,
    //   ritualOrMeditation,
    //   skillAugmentation,
    //   otherModifiers,
    //   selectedRuneId,
    // });
  }

  public static async renderContent(
    flags: RqgChatMessageFlags,
  ): Promise<ChatMessageDataConstructorData> {
    assertChatMessageFlagType(flags.type, "runeMagicChat");
    const actor = await getRequiredRqgActorFromUuid<RqgActor>(flags.chat.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.chat.tokenUuid);
    const runeMagicItem = await getRequiredDocumentFromUuid<RqgItem>(flags.chat.itemUuid);
    assertItemType(runeMagicItem.type, ItemTypeEnum.RuneMagic);
    const eligibleRunes = RuneMagic.getEligibleRunes(runeMagicItem);
    const { otherModifiers, selectedRuneId, ritualOrMeditation, skillAugmentation } =
      await RuneMagicChatHandler.getFormDataFromFlags(flags);
    const selectedRune = actor.getEmbeddedDocument("Item", selectedRuneId) as RqgItem | undefined;
    assertItemType(selectedRune?.type, ItemTypeEnum.Rune);

    const chance =
      Number(selectedRune.system.chance) + ritualOrMeditation + skillAugmentation + otherModifiers;

    const ritualOrMeditationOptions: any = {};
    for (let i = 0; i <= 100; i += 5) {
      ritualOrMeditationOptions[i] = localize(
        "RQG.Dialog.runeMagicChat.MeditationOrRitualValue" + i,
      );
    }

    const skillAugmentationOptions: any = {};
    [0, 50, 30, 20, -20, -50].forEach((value) => {
      skillAugmentationOptions[value] = localize(
        "RQG.Dialog.runeMagicChat.SkillAugmentationValue" + value,
      );
    });

    const templateData = {
      ...flags,
      eligibleRunes: eligibleRunes,
      isOneUse: runeMagicItem.system.isOneUse,
      descriptionLink: runeMagicItem.system.descriptionRqidLink,
      ritualOrMeditationOptions: ritualOrMeditationOptions,
      skillAugmentationOptions: skillAugmentationOptions,
      chance: chance,
      chatHeading: localize("RQG.Dialog.runeMagicChat.runeMagicResultFlavor", {
        name: runeMagicItem.name,
      }),
    };

    const html = await renderTemplate(templatePaths.runeMagicChatHandler, templateData);
    const speaker = ChatMessage.getSpeaker({ actor: actor, token: token }) as ChatSpeakerData;

    return {
      user: getGame().user?.id,
      speaker: speaker,
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
    assertChatMessageFlagType(flags.type, "runeMagicChat");
    const runePointCost = convertFormValueToInteger(flags.formData.runePointCost);
    const magicPointBoost = convertFormValueToInteger(flags.formData.magicPointBoost);
    const ritualOrMeditation = convertFormValueToInteger(flags.formData.ritualOrMeditation);
    const skillAugmentation = convertFormValueToInteger(flags.formData.skillAugmentation);
    const otherModifiers = convertFormValueToInteger(flags.formData.otherModifiers);
    const selectedRuneId = convertFormValueToString(flags.formData.selectedRuneId);
    return {
      runePointCost,
      magicPointBoost,
      ritualOrMeditation,
      skillAugmentation,
      otherModifiers,
      selectedRuneId,
    };
  }

  /**
   * Store the current raw string (FormDataEntryValue) form values to the flags
   * Called from {@link RqgChatMessage.formSubmitHandler} and {@link RqgChatMessage.inputChangeHandler}
   */
  public static updateFlagsFromForm(flags: RqgChatMessageFlags, ev: Event): void {
    assertChatMessageFlagType(flags.type, "runeMagicChat");
    const target = ev.target;
    assertHtmlElement(target);
    const form = target?.closest<HTMLFormElement>("form") ?? undefined;
    const formData = new FormData(form);

    flags.formData.runePointCost = cleanIntegerString(formData.get("runePointCost"));
    flags.formData.magicPointBoost = cleanIntegerString(formData.get("magicPointBoost"));
    flags.formData.ritualOrMeditation = cleanIntegerString(formData.get("ritualOrMeditation"));
    flags.formData.skillAugmentation = cleanIntegerString(formData.get("skillAugmentation"));
    flags.formData.otherModifiers = cleanIntegerString(formData.get("otherModifiers"));
    flags.formData.selectedRuneId = convertFormValueToString(formData.get("selectedRuneId"));
  }
}

import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgActor } from "../../actors/rqgActor";
import { RqgItem } from "../rqgItem";
import { assertActorType, assertItemType, getGame, localize, RqgError } from "../../system/util";
import { ItemDataSource } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";
import { systemId } from "../../system/config";
import { RuneMagicChatFlags } from "../../data-model/shared/rqgDocumentFlags";
import { RuneMagicChatHandler } from "../../chat/runeMagicChatHandler";
import { ResultEnum, ResultMessage } from "../../data-model/shared/ability";
import { ActorTypeEnum } from "../../data-model/actor-data/rqgActorData";
import { RuneDataPropertiesData } from "../../data-model/item-data/runeData";

export class RuneMagic extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", RuneMagicSheet, {
  //     types: [ItemTypeEnum.RuneMagic],
  //     makeDefault: true,
  //   });
  // }

  static async toChat(runeMagic: RqgItem): Promise<void> {
    const eligibleRunes = RuneMagic.getEligibleRunes(runeMagic);
    const defaultRuneId = RuneMagic.getStrongestRune(eligibleRunes)?.id;
    assertItemType(runeMagic.type, ItemTypeEnum.RuneMagic);
    const flags: RuneMagicChatFlags = {
      type: "runeMagicChat",
      chat: {
        actorUuid: runeMagic.actor!.uuid,
        tokenUuid: runeMagic.actor!.token?.uuid,
        chatImage: runeMagic.img ?? "",
        itemUuid: runeMagic.uuid,
      },
      formData: {
        runePointCost: runeMagic.system.points.toString(),
        magicPointBoost: "",
        ritualOrMeditation: "0",
        skillAugmentation: "0",
        otherModifiers: "",
        selectedRuneId: defaultRuneId ?? "",
      },
    };

    await ChatMessage.create(await RuneMagicChatHandler.renderContent(flags));
  }

  static async abilityRoll(
    runeMagicItem: RqgItem,
    options: {
      runePointCost: number;
      magicPointBoost: number;
      ritualOrMeditation: number;
      skillAugmentation: number;
      otherModifiers: number;
      selectedRuneId?: string;
    }
  ): Promise<ResultEnum | undefined> {
    assertItemType(runeMagicItem.type, ItemTypeEnum.RuneMagic);
    const runeMagicCultId = runeMagicItem?.system.cultId;
    const cult = runeMagicItem.actor?.items.get(runeMagicCultId);
    assertItemType(cult?.type, ItemTypeEnum.Cult);
    if (!options.selectedRuneId) {
      const eligibleRunes = RuneMagic.getEligibleRunes(runeMagicItem);
      options.selectedRuneId = RuneMagic.getStrongestRune(eligibleRunes)?.id ?? "";
    }
    const runeItem = runeMagicItem.actor?.items.get(options.selectedRuneId);
    assertItemType(runeItem?.type, ItemTypeEnum.Rune);

    const validationError = RuneMagic.validateData(
      cult,
      options.runePointCost,
      options.magicPointBoost
    );
    if (validationError) {
      ui.notifications?.warn(validationError);
      return;
    }

    const resultMessages: ResultMessage[] = [
      {
        result: ResultEnum.Critical,
        html: localize("RQG.Dialog.runeMagicChat.resultMessageCritical", {
          magicPointBoost: options.magicPointBoost,
        }),
      },
      {
        result: ResultEnum.Special,
        html: localize("RQG.Dialog.runeMagicChat.resultMessageSpecial", {
          runePointCost: options.runePointCost,
          magicPointBoost: options.magicPointBoost,
        }),
      },
      {
        result: ResultEnum.Success,
        html: localize("RQG.Dialog.runeMagicChat.resultMessageSuccess", {
          runePointCost: options.runePointCost,
          magicPointBoost: options.magicPointBoost,
        }),
      },
      {
        result: ResultEnum.Failure,
        html: localize("RQG.Dialog.runeMagicChat.resultMessageFailure"),
      },
      {
        result: ResultEnum.Fumble,
        html: localize("RQG.Dialog.runeMagicChat.resultMessageFumble", {
          runePointCost: options.runePointCost,
        }),
      },
    ];

    const speaker = ChatMessage.getSpeaker({ actor: runeMagicItem.actor ?? undefined });
    const result = await runeMagicItem._roll(
      localize("RQG.Dialog.runeMagicChat.Cast", { spellName: runeMagicItem.name }),
      Number(runeItem.system.chance),
      options.ritualOrMeditation + options.skillAugmentation + options.otherModifiers,
      speaker,
      resultMessages
    );

    await RuneMagic.handleRollResult(
      result,
      options.runePointCost,
      options.magicPointBoost,
      runeItem,
      runeMagicItem
    );

    return result;
  }

  static onActorPrepareEmbeddedEntities(item: RqgItem): RqgItem {
    if (item.type !== ItemTypeEnum.RuneMagic || !item.actor) {
      const msg = localize("RQG.Item.Notification.WrongItemTypeRuneMagicError");
      ui.notifications?.error(msg);
      throw new RqgError(msg, item);
    }
    const actor = item.actor;
    if (item.system.cultId) {
      const runeMagicCult = actor.items.get(item.system.cultId);
      if (!runeMagicCult || runeMagicCult.type !== ItemTypeEnum.Cult) {
        // This warning can happen when drag-dropping a rune spell from one Actor to another,
        // but the notification happens a lot of times and doesn't really matter since the system immediately,
        // displays the "Which cult provides this Rune Magic?" dialog allowing the player to fix it.

        // const msg = localize("RQG.Item.Notification.ActorDoesNotHaveCultOnRuneMagicWarning");
        // ui.notifications?.warn(msg);
        // console.warn(msg, item, actor);

        item.system.cultId = ""; // remove the mismatched link to make it appear in the GUI
      }
      if (runeMagicCult && runeMagicCult.type === ItemTypeEnum.Cult) {
        item.system.chance = RuneMagic.calcRuneMagicChance(
          actor.items.toObject(),
          runeMagicCult.system.runes,
          item.system.runes
        );
      }
    }
    return item;
  }

  private static calcRuneMagicChance(
    actorItems: ItemDataSource[],
    cultRuneNames: string[],
    runeMagicRuneNames: string[]
  ): number {
    const runeChances = actorItems
      .filter(
        (i) =>
          i.type === ItemTypeEnum.Rune &&
          (runeMagicRuneNames.includes(i.name ?? "") ||
            (runeMagicRuneNames.includes(
              getGame().settings.get(systemId, "magicRuneName") as string
            ) &&
              cultRuneNames.includes(i.name ?? "")))
      )
      // @ts-ignore r is a runeItem TODO rewrite as reduce
      .map((r: RqgItem) => r.system.chance);
    return Math.max(...runeChances);
  }

  /*
   * Connect runeMagic item to a cult.
   */
  static async onEmbedItem(
    actor: RqgActor,
    runeMagicItem: RqgItem,
    options: any,
    userId: string
  ): Promise<any> {
    let updateData = {};
    const actorCults = actor.items.filter((i) => i.type === ItemTypeEnum.Cult);
    assertItemType(runeMagicItem.type, ItemTypeEnum.RuneMagic);

    if (!runeMagicItem.system.cultId) {
      let cultId;
      // If the actor only has one cult then attach this runeMagic to that Cult
      if (actorCults.length === 1 && actorCults[0].id) {
        cultId = actorCults[0].id;
      } else {
        // else ask which one
        cultId = await RuneMagic.chooseCultDialog(
          actorCults.map((c) => {
            return { name: c.name, id: c.id };
          }),
          runeMagicItem.name ?? "",
          actor.name ?? ""
        );
      }
      updateData = {
        _id: runeMagicItem.id,
        system: { cultId: cultId },
      };
    }
    return updateData;
  }

  static async chooseCultDialog(
    actorCults: any,
    runeMagicName: string,
    actorName: string
  ): Promise<string> {
    const htmlContent = await renderTemplate(
      "systems/rqg/items/rune-magic-item/runeMagicCultDialog.hbs",
      {
        actorCults: actorCults,
        runeMagicName: runeMagicName,
        actorName: actorName,
      }
    );
    return await new Promise(async (resolve, reject) => {
      const dialog = new Dialog({
        title: localize("RQG.Item.RuneMagic.runeMagicCultDialog.title"),
        content: htmlContent,
        default: "submit",
        buttons: {
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: localize("RQG.Item.RuneMagic.runeMagicCultDialog.btnAddRuneMagic"),
            callback: (html: JQuery | HTMLElement) => {
              const selectedCultId = (html as JQuery).find("[name=cultId]").val() as string;
              resolve(selectedCultId);
            },
          },
          cancel: {
            label: localize("RQG.Dialog.Common.btnCancel"),
            icon: '<i class="fas fa-times"></i>',
            callback: () => {
              reject();
            },
          },
        },
      });
      await dialog.render(true);
    });
  }

  public static validateData(
    cultItem: RqgItem,
    runePointCost: number,
    magicPointsBoost: number
  ): string {
    assertItemType(cultItem?.type, ItemTypeEnum.Cult);
    if (runePointCost > (Number(cultItem.system.runePoints.value) || 0)) {
      return getGame().i18n.format("RQG.Dialog.runeMagicChat.validationNotEnoughRunePoints");
    } else if (
      magicPointsBoost > (Number(cultItem.actor?.system.attributes?.magicPoints?.value) || 0)
    ) {
      return localize("RQG.Dialog.runeMagicChat.validationNotEnoughMagicPoints");
    } else {
      return "";
    }
  }

  /**
   * Given a rune spell and an actor, returns the runes that are possible to use for casting that spell.
   */
  static getEligibleRunes(runeMagicItem: RqgItem): RqgItem[] {
    assertItemType(runeMagicItem.type, ItemTypeEnum.RuneMagic);

    // The cult from where the spell was learned
    const cult = runeMagicItem.actor?.items.get(runeMagicItem.system.cultId);
    assertItemType(cult?.type, ItemTypeEnum.Cult);

    // Get the name of the "magic" rune.
    const magicRuneName = getGame().settings.get(systemId, "magicRuneName");

    let usableRuneNames: string[];
    if (runeMagicItem.system.runes.includes(magicRuneName)) {
      // Actor can use any of the cult's runes to cast
      // And some cults have the same rune more than once, so de-dupe them
      // @ts-expect-error system
      usableRuneNames = [...new Set(cult.system.runes)];
    } else {
      // Actor can use any of the Rune Magic Spell's runes to cast
      // @ts-expect-error system
      usableRuneNames = [...new Set(runeMagicItem.system.runes)];
    }

    let runesForCasting: RqgItem[] = [];
    // Get the actor's versions of the runes, which will have their "chance"
    usableRuneNames.forEach((runeName: string) => {
      const actorRune = runeMagicItem.actor?.items.getName(runeName);
      actorRune && runesForCasting.push(actorRune);
    });

    return runesForCasting;
  }

  static getStrongestRune(runeMagicItems: RqgItem[]): RqgItem | undefined {
    if (runeMagicItems.length === 0) {
      return undefined;
    }
    return runeMagicItems.reduce((strongest: RqgItem, current: RqgItem) => {
      const strongestRuneChance = (strongest.system as RuneDataPropertiesData).chance ?? 0;
      const currentRuneChance = (current.system as RuneDataPropertiesData).chance ?? 0;
      return strongestRuneChance > currentRuneChance ? strongest : current;
    });
  }

  private static async handleRollResult(
    result: ResultEnum,
    runePointCost: number,
    magicPointsUsed: number,
    runeItem: RqgItem,
    runeMagicItem: RqgItem
  ): Promise<void> {
    assertItemType(runeItem.type, ItemTypeEnum.Rune);
    assertItemType(runeMagicItem.type, ItemTypeEnum.RuneMagic);
    const cult = runeMagicItem.actor?.items.get(runeMagicItem.system.cultId ?? "");
    assertItemType(cult?.type, ItemTypeEnum.Cult);
    const isOneUse = runeMagicItem.system.isOneUse;

    switch (result) {
      case ResultEnum.Critical:
      case ResultEnum.SpecialCritical:
      case ResultEnum.HyperCritical:
        // spell takes effect, Rune Points NOT spent, Rune gets xp check, boosting Magic Points spent
        await RuneMagic.SpendRuneAndMagicPoints(
          0,
          magicPointsUsed,
          runeMagicItem.actor ?? undefined,
          cult,
          isOneUse
        );
        await runeItem.awardExperience();
        break;

      case ResultEnum.Success:
      case ResultEnum.Special:
        // spell takes effect, Rune Points spent, Rune gets xp check, boosting Magic Points spent
        await RuneMagic.SpendRuneAndMagicPoints(
          runePointCost,
          magicPointsUsed,
          runeMagicItem.actor ?? undefined,
          cult,
          isOneUse
        );
        await runeItem.awardExperience();
        break;

      case ResultEnum.Failure:
        {
          // spell fails, no Rune Point Loss, if Magic Point boosted, lose 1 Magic Point if boosted
          const boosted = magicPointsUsed >= 1 ? 1 : 0;
          await RuneMagic.SpendRuneAndMagicPoints(
            0,
            boosted,
            runeMagicItem.actor ?? undefined,
            cult,
            isOneUse
          );
        }
        break;

      case ResultEnum.Fumble:
        // spell fails, lose Rune Points, if Magic Point boosted, lose 1 Magic Point if boosted
        const boosted = magicPointsUsed >= 1 ? 1 : 0;
        await RuneMagic.SpendRuneAndMagicPoints(
          runePointCost,
          boosted,
          runeMagicItem.actor ?? undefined,
          cult,
          isOneUse
        );
        break;

      default:
        const msg = "Got unexpected result from roll in runeMagicChat";
        ui.notifications?.error(msg);
        throw new RqgError(msg);
    }
  }

  private static async SpendRuneAndMagicPoints(
    runePoints: number,
    magicPoints: number,
    actor: RqgActor | undefined,
    cult: RqgItem,
    isOneUse: boolean
  ) {
    assertItemType(cult.type, ItemTypeEnum.Cult);
    assertActorType(actor?.type, ActorTypeEnum.Character);
    // At this point if the current Rune Points or Magic Points are zero
    // it's too late. That validation happened earlier.
    const newRunePointTotal = (cult.system.runePoints.value || 0) - runePoints;
    const newMagicPointTotal = (actor?.system.attributes.magicPoints.value || 0) - magicPoints;
    let newRunePointMaxTotal = cult.system.runePoints.max || 0;
    if (isOneUse) {
      newRunePointMaxTotal -= runePoints;
      if (newRunePointMaxTotal < (cult.system.runePoints.max || 0)) {
        ui.notifications?.info(
          localize("RQG.Dialog.runeMagicChat.SpentOneUseRunePoints", {
            actorName: actor?.name,
            runePoints: runePoints,
            cultName: cult.name,
          })
        );
      }
    }
    const updateCultItemRunePoints: DeepPartial<ItemDataSource> = {
      _id: cult?.id,
      system: { runePoints: { value: newRunePointTotal, max: newRunePointMaxTotal } },
    };
    await actor?.updateEmbeddedDocuments("Item", [updateCultItemRunePoints]);
    const updateActorMagicPoints = {
      system: { attributes: { magicPoints: { value: newMagicPointTotal } } },
    };
    await actor?.update(updateActorMagicPoints);
  }
}

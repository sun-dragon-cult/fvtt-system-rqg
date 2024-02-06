import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { assertItemType, localize } from "../../system/util";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { SpiritMagicChatFlags } from "../../data-model/shared/rqgDocumentFlags";
import { SpiritMagicChatHandler } from "../../chat/spiritMagicChatHandler";
import { RqgItem } from "../rqgItem";
import { AbilitySuccessLevelEnum } from "../../rolls/AbilityRoll/AbilityRoll.defs";

export class SpiritMagic extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", SpiritMagicSheet, {
  //     types: [ItemTypeEnum.SpiritMagic],
  //     makeDefault: true,
  //   });
  // }

  static async toChat(spiritMagic: RqgItem): Promise<void> {
    assertItemType(spiritMagic.type, ItemTypeEnum.SpiritMagic);

    const flags: SpiritMagicChatFlags = {
      type: "spiritMagicChat",
      chat: {
        actorUuid: spiritMagic.actor!.uuid,
        tokenUuid: spiritMagic.actor!.token?.uuid,
        chatImage: spiritMagic.img ?? "",
        itemUuid: spiritMagic.uuid,
      },
      formData: {
        level: spiritMagic.system.points.toString(),
        boost: "",
      },
    };

    await ChatMessage.create(await SpiritMagicChatHandler.renderContent(flags));
  }

  static async abilityRoll(
    spiritMagicItem: RqgItem,
    options: { level: number; boost: number },
  ): Promise<AbilitySuccessLevelEnum | undefined> {
    const validationError = SpiritMagic.validateRollData(
      spiritMagicItem,
      options.level,
      options.boost,
    );
    if (validationError) {
      ui.notifications?.warn(validationError);
      return;
    }
    const mpCost = options.level + options.boost;
    const result = await spiritMagicItem._roll(
      (spiritMagicItem.actor?.system.characteristics.power.value ?? 0) * 5,
      [],
      ChatMessage.getSpeaker({ actor: spiritMagicItem.actor ?? undefined }),
    );
    await spiritMagicItem.actor?.drawMagicPoints(mpCost, result);
    return result;
  }

  public static validateRollData(
    spiritMagicItem: RqgItem,
    level: number | undefined,
    boost: number | undefined,
  ): string | undefined {
    assertItemType(spiritMagicItem.type, ItemTypeEnum.SpiritMagic);
    if (level == null || level > spiritMagicItem.system.points) {
      return localize("RQG.Dialog.spiritMagicChat.CantCastSpellAboveLearnedLevel");
    } else if (
      boost == null ||
      level + boost > (spiritMagicItem.actor?.system.attributes.magicPoints.value || 0)
    ) {
      return localize("RQG.Dialog.spiritMagicChat.NotEnoughMagicPoints");
    } else {
      return;
    }
  }
}

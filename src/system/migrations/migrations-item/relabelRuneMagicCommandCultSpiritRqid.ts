import { ItemTypeEnum } from "@item-model/itemTypes.ts";

import { RqidLink } from "../../../data-model/shared/rqidLink";
import type { RuneMagicItem } from "@item-model/runeMagicDataModel.ts";
import { isDocumentSubType } from "../../util.ts";
import type { CultItem } from "@item-model/cultDataModel.ts";
import type { RqgItem } from "@items/rqgItem.ts";

const oldRqid = "i.rune-magic.command-cult-spirit-elemental";
const newRqid = "i.rune-magic.command-cult-spirit";
const oldEnglishName = "Command Cult Spirit (Elemental)";
const newEnglishName = "Command Cult Spirit";
const newCommandCultSpiritDescriptionRqid = "je..command-cult-spirit";

export async function relabelRuneMagicCommandCultSpiritRqid(
  itemData: RqgItem,
): Promise<Item.UpdateData> {
  const updateData: Item.UpdateData = {};

  if (
    (isDocumentSubType<RuneMagicItem>(itemData, ItemTypeEnum.RuneMagic) ||
      isDocumentSubType<CultItem>(itemData, ItemTypeEnum.Cult)) &&
    itemData?.flags?.rqg?.documentRqidFlags?.id === oldRqid
  ) {
    if (itemData.name === oldEnglishName) {
      foundry.utils.mergeObject(updateData, { name: newEnglishName });
    }

    const descriptionName =
      itemData?.system?.descriptionRqidLink?.name == null ||
      itemData?.system?.descriptionRqidLink?.name === oldEnglishName
        ? newEnglishName
        : itemData?.system?.descriptionRqidLink?.name;

    foundry.utils.mergeObject(updateData, {
      system: {
        descriptionRqidLink: {
          rqid: newCommandCultSpiritDescriptionRqid,
          name: descriptionName,
        },
      },
      flags: {
        rqg: {
          documentRqidFlags: {
            id: newRqid,
          },
        },
      },
    });
  }

  if (isDocumentSubType<CultItem>(itemData, ItemTypeEnum.Cult)) {
    // Cast to RqidLink[] to allow comparison with legacy hyphenated rqid format
    const links = itemData.system.commonRuneMagicRqidLinks as RqidLink[];
    const commandCultSpiritLink = links.find((link) => link.rqid === oldRqid);
    if (commandCultSpiritLink) {
      const newName =
        commandCultSpiritLink.name === oldEnglishName ? newEnglishName : commandCultSpiritLink.name;

      const newCommandCultSpiritLink = new RqidLink(newRqid, newName);
      newCommandCultSpiritLink.bonus = undefined;
      const index = links.indexOf(commandCultSpiritLink);
      links.splice(index, 1, newCommandCultSpiritLink);

      foundry.utils.mergeObject(updateData, {
        system: { commonRuneMagicRqidLinks: links },
      });
    }
  }

  return updateData;
}

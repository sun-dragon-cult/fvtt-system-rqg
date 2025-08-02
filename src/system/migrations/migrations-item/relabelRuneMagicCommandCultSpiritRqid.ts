import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";
import type { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import type { ItemUpdate } from "../applyMigrations";
import { RqidLink } from "../../../data-model/shared/rqidLink";

const oldRqid = "i.rune-magic.command-cult-spirit-elemental";
const newRqid = "i.rune-magic.command-cult-spirit";
const oldEnglishName = "Command Cult Spirit (Elemental)";
const newEnglishName = "Command Cult Spirit";
const newCommandCultSpiritDescriptionRqid = "je..command-cult-spirit";

export async function relabelRuneMagicCommandCultSpiritRqid(
  itemData: ItemData,
): Promise<ItemUpdate> {
  const updateData: any = {};

  if (
    itemData.type === ItemTypeEnum.RuneMagic &&
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

  if (itemData.type === ItemTypeEnum.Cult) {
    const commandCultSpiritLink = itemData.system.commonRuneMagicRqidLinks.find(
      (link) => link.rqid === oldRqid,
    );
    if (commandCultSpiritLink) {
      const newName =
        commandCultSpiritLink.name === oldEnglishName ? newEnglishName : commandCultSpiritLink.name;

      const newCommandCultSpiritLink = new RqidLink(newRqid, newName);
      const index = itemData.system.commonRuneMagicRqidLinks.indexOf(commandCultSpiritLink);
      itemData.system.commonRuneMagicRqidLinks.splice(index, 1, newCommandCultSpiritLink);

      foundry.utils.mergeObject(updateData, {
        system: { commonRuneMagicRqidLinks: itemData.system.commonRuneMagicRqidLinks },
      });
    }
  }

  return updateData;
}

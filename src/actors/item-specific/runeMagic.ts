import { AbstractEmbeddedItem } from "./abstractEmbeddedItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgActor } from "../rqgActor";
import { RqgItem } from "../../items/rqgItem";
import { assertItemType, getGame, localize, RqgError } from "../../system/util";
import { ItemDataSource } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";

export class RuneMagic extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", RuneMagicSheet, {
  //     types: [ItemTypeEnum.RuneMagic],
  //     makeDefault: true,
  //   });
  // }

  static onActorPrepareEmbeddedEntities(item: RqgItem): RqgItem {
    if (item.data.type !== ItemTypeEnum.RuneMagic || !item.actor) {
      const msg = localize("RQG.Item.Notification.WrongItemTypeRuneMagicError");
      ui.notifications?.error(msg);
      throw new RqgError(msg, item);
    }
    const actor = item.actor;
    if (item.data.data.cultId) {
      const runeMagicCult = actor.items.get(item.data.data.cultId);
      if (!runeMagicCult || runeMagicCult.data.type !== ItemTypeEnum.Cult) {
        const msg = localize("RQG.Item.Notification.ActorDoesNotHaveCultOnRuneMagicWarning");
        ui.notifications?.warn(msg);
        console.warn(msg, item, actor);
        item.data.data.cultId = ""; // remove the mismatched link to make it appear in the GUI
      }
      if (runeMagicCult && runeMagicCult.data.type === ItemTypeEnum.Cult) {
        item.data.data.chance = RuneMagic.calcRuneMagicChance(
          actor.items.toObject(),
          runeMagicCult.data.data.runes,
          item.data.data.runes
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
            (runeMagicRuneNames.includes(getGame().settings.get("rqg", "magicRuneName") as string) &&
              cultRuneNames.includes(i.name ?? "")))
      )
      // @ts-ignore r is a runeItem TODO rewrite as reduce
      .map((r: RqgItem) => r.data.chance);
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
    assertItemType(runeMagicItem.data.type, ItemTypeEnum.RuneMagic);

    if (!runeMagicItem.data.data.cultId) {
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
        data: { cultId: cultId },
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
      "systems/rqg/actors/item-specific/runeMagicCultDialog.hbs",
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
}

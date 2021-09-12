import { AbstractEmbeddedItem } from "./abstractEmbeddedItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgActor } from "../rqgActor";
import { RqgItem } from "../../items/rqgItem";
import { RqgError } from "../../system/util";
import { ItemDataSource } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";

export class RuneMagic extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", RuneMagicSheet, {
  //     types: [ItemTypeEnum.RuneMagic],
  //     makeDefault: true,
  //   });
  // }

  // If the actor only has one cult then attach this runeMagic to that Cult
  static preEmbedItem(actor: RqgActor, itemData: any, options: object[], userId: string): void {
    const actorCults = actor.items.filter((i) => i.data.type === ItemTypeEnum.Cult);
    if (actorCults.length === 1 && itemData.type === ItemTypeEnum.RuneMagic) {
      itemData.data.cultId = actorCults[0].id;
    }
  }

  static onActorPrepareEmbeddedEntities(item: RqgItem): RqgItem {
    if (item.data.type !== ItemTypeEnum.RuneMagic || !item.actor) {
      const msg = `Wrong itemtype or not embedded item in Actor PrepareEmbeddedEntities`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, item);
    }
    const actor = item.actor;
    const runeMagicCult = actor.items.get(item.data.data.cultId);
    if (!runeMagicCult || runeMagicCult.data.type !== ItemTypeEnum.Cult) {
      const msg = `Cult referenced by rune magic item ${item.name} doesn't exist on actor ${actor.name}`;
      ui.notifications?.warn(msg);
      console.warn(msg, item, actor);
      item.data.data.cultId = ""; // remove the mismatched link to make it appear in the GUI
    }
    if (runeMagicCult && runeMagicCult.data.type === ItemTypeEnum.Cult) {
      item.data.data.chance = RuneMagic.calcRuneMagicChance(
        // TODO should this be returning ItemData ??? no ItemDataSource
        actor.items.toObject(),
        runeMagicCult.data.data.runes,
        item.data.data.runes
      );
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
            (runeMagicRuneNames.includes("Magic (condition)") &&
              cultRuneNames.includes(i.name ?? "")))
      )
      // @ts-ignore r is a runeItem TODO rewrite as reduce
      .map((r: RqgItem) => r.data.chance);
    return Math.max(...runeChances);
  }

  /*
   * If the runeMagic item still isn't connected to a cult (after preEmbedItem),
   * then ask the user what cult it should be connected to.
   */
  static async onEmbedItem(
    actor: RqgActor,
    runeMagicItem: RqgItem,
    options: any,
    userId: string
  ): Promise<any> {
    let updateData = {};
    const actorCults = actor.items.filter((i) => i.type === ItemTypeEnum.Cult);
    if (runeMagicItem.data.type !== ItemTypeEnum.RuneMagic) {
      const msg = `Called runeMagic onEmbedItem with something else than a runeMagic Item`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, runeMagicItem);
    }
    if (!runeMagicItem.data.data.cultId) {
      const cultId = await RuneMagic.chooseCultDialog(
        actorCults.map((c) => {
          return { name: c.name, id: c.id };
        }),
        runeMagicItem.name ?? "",
        actor.name ?? ""
      );
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
      "systems/rqg/actors/item-specific/runeMagicCultDialog.html",
      {
        actorCults: actorCults,
        runeMagicName: runeMagicName,
        actorName: actorName,
      }
    );
    return await new Promise(async (resolve, reject) => {
      const dialog = new Dialog({
        title: "Select the cult where the rune magic is learned",
        content: htmlContent,
        default: "submit",
        buttons: {
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: "Add Rune Magic",

            callback: (html: JQuery | HTMLElement) => {
              const selectedCultId = (html as JQuery).find("[name=cultId]").val() as string;
              resolve(selectedCultId);
            },
          },
          cancel: {
            label: "Cancel",
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

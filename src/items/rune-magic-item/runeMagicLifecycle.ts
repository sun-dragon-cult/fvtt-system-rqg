import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { RqgActor } from "@actors/rqgActor.ts";
import { RqgItem } from "../rqgItem";
import { assertDocumentSubType, isDocumentSubType, localize } from "../../system/util";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqgActorData";
import { RqidLink } from "../../data-model/shared/rqidLink";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import type { RuneMagicItem } from "@item-model/runeMagicDataModel.ts";
import type { CultItem } from "@item-model/cultDataModel.ts";

function calcRuneMagicChance(
  actorItems: CharacterActor["items"]["contents"],
  cultRuneRqidLinks: RqidLink[],
  runeMagicRuneRqidLinks: RqidLink[],
): number {
  const runeMagicRqids = runeMagicRuneRqidLinks.map((r) => r.rqid);
  const cultRqids = cultRuneRqidLinks.map((r) => r.rqid);
  const runeChances = actorItems.reduce((acc: number[], item) => {
    if (
      isDocumentSubType(item, ItemTypeEnum.Rune) &&
      (runeMagicRqids.includes(item.flags.rqg?.documentRqidFlags?.id ?? "") ||
        (runeMagicRqids.includes(CONFIG.RQG.runeRqid.magic) &&
          cultRqids.includes(item.flags.rqg?.documentRqidFlags?.id ?? "")))
    ) {
      acc.push(item.system.chance ?? 0);
    }
    return acc;
  }, []);

  return runeChances.length > 0 ? Math.max(...runeChances) : 0;
}

async function chooseCultDialog(
  actorCultOptions: SelectOptionData<string>[],
  runeMagicName: string,
  actorName: string,
): Promise<string | undefined> {
  const htmlContent = await foundry.applications.handlebars.renderTemplate(
    templatePaths.dialogRuneMagicCult,
    {
      actorCultOptions,
      runeMagicName: runeMagicName,
      actorName: actorName,
    },
  );
  return await new Promise((resolve, reject) => {
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
    dialog.render(true);
  });
}

export const runeMagicLifecycle = {
  onActorPrepareEmbeddedEntities(item: RqgItem): RqgItem {
    const actor = item.actor;
    assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);
    assertDocumentSubType<RuneMagicItem>(
      item,
      ItemTypeEnum.RuneMagic,
      "RQG.Item.Notification.WrongItemTypeRuneMagicError",
    );

    if (item.system.cultId) {
      const runeMagicCult = actor.items.get(item.system.cultId) as RqgItem | undefined;

      if (isDocumentSubType<CultItem>(runeMagicCult, ItemTypeEnum.Cult)) {
        item.system.chance = calcRuneMagicChance(
          actor.items.contents,
          runeMagicCult.system.runeRqidLinks,
          item.system.runeRqidLinks,
        );
      } else {
        // This warning can happen when drag-dropping a rune spell from one Actor to another,
        // but the notification happens a lot of times and doesn't really matter since the system immediately,
        // displays the "Which cult provides this Rune Magic?" dialog allowing the player to fix it.

        // const msg = localize("RQG.Item.Notification.ActorDoesNotHaveCultOnRuneMagicWarning");
        // ui.notifications?.warn(msg);
        // console.warn(msg, item, actor);

        item.system.cultId = ""; // remove the mismatched link to make it appear in the GUI
      }
    }
    return item;
  },

  /*
   * Connect runeMagic item to a cult.
   */
  async onEmbedItem(
    actor: RqgActor,
    runeMagicItem: RqgItem,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId: string,
  ): Promise<any> {
    let updateData = {};
    const actorCults: CultItem[] = actor.items.filter((i) =>
      isDocumentSubType<CultItem>(i, ItemTypeEnum.Cult),
    );
    assertDocumentSubType<RuneMagicItem>(runeMagicItem, ItemTypeEnum.RuneMagic);

    // Do not ask what cult should get the RuneMagic item if it is already attached to a cult from the actor
    // (used in Cult Item for attaching common rune magic automatically)
    if (
      !runeMagicItem.system.cultId ||
      !actorCults.some((cult) => cult.id === runeMagicItem.system.cultId)
    ) {
      let cultId: string | undefined;
      // If the actor only has one cult then attach this runeMagic to that Cult
      if (actorCults.length === 1 && actorCults[0]!.id) {
        cultId = actorCults[0]!.id;
      } else {
        // else ask which one
        cultId = await chooseCultDialog(
          actorCults.map((c) => {
            return {
              value: c.id ?? "",
              label: c.name ?? "",
            };
          }),
          runeMagicItem.name ?? "",
          actor.name ?? "",
        );
      }
      if (cultId) {
        updateData = {
          _id: runeMagicItem.id,
          system: { cultId: cultId },
        };
      }
    }
    return updateData;
  },
};

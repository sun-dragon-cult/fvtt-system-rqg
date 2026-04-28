import type { RqgItem } from "@items/rqgItem.ts";
import type { RqgActor } from "@actors/rqgActor.ts";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { spellSchemaFields } from "../shared/spellSchemaFields";
import type { RqidLink } from "../shared/rqidLink";
import type { RqidString } from "../../system/api/rqidApi";
import { rqidLinkArraySchemaField } from "../shared/rqidLinkField";
import { assertDocumentSubType, isDocumentSubType, localize } from "../../system/util";
import { ActorTypeEnum, type CharacterActor } from "../actor-data/rqgActorData";
import { ItemTypeEnum } from "./itemTypes";
import type { RuneItem } from "./runeDataModel";
import type { CultItem } from "./cultDataModel";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

export type RuneMagicItem = RqgItem & { system: Item.SystemOfType<"runeMagic"> };

const { BooleanField, StringField } = foundry.data.fields;

type RuneMagicSchema = ReturnType<typeof RuneMagicDataModel.defineSchema>;

export class RuneMagicDataModel extends RqgItemDataModel<RuneMagicSchema, { chance: number }> {
  declare descriptionRqidLink: RqidLink<RqidString>;

  static override defineSchema() {
    return {
      ...spellSchemaFields(),
      cultId: new StringField({ blank: true, nullable: false, initial: "" }),
      runeRqidLinks: rqidLinkArraySchemaField(),
      isStackable: new BooleanField({ nullable: false, initial: false }),
      isOneUse: new BooleanField({ nullable: false, initial: false }),
    } as const;
  }

  override onActorPrepareEmbeddedEntities(): void {
    const actor = (this.parent as RuneMagicItem).actor;
    assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);
    const item = this.parent as RuneMagicItem;

    if (item.system.cultId) {
      const runeMagicCult = actor.items.get(item.system.cultId) as RqgItem | undefined;

      if (isDocumentSubType<CultItem>(runeMagicCult, ItemTypeEnum.Cult)) {
        item.system.chance = this.calcRuneMagicChance(
          actor.items.contents,
          runeMagicCult.system.runeRqidLinks,
          item.system.runeRqidLinks,
        );
      } else {
        // This warning can happen when drag-dropping a rune spell from one Actor to another,
        // but the notification happens a lot of times and doesn't really matter since the system
        // immediately displays the "Which cult provides this Rune Magic?" dialog.

        item.system.cultId = ""; // remove the mismatched link to make it appear in the GUI
      }
    }
  }

  override async onEmbedItem(
    actor: RqgActor,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userId: string,
  ): Promise<Record<string, unknown>> {
    let updateData = {};
    const runeMagicItem = this.parent as RuneMagicItem;
    const actorCults: CultItem[] = actor.items.filter((i) =>
      isDocumentSubType<CultItem>(i, ItemTypeEnum.Cult),
    );

    // Do not ask what cult should get the RuneMagic item if it is already attached to a cult from the actor
    // (used in Cult Item for attaching common rune magic automatically)
    if (
      !runeMagicItem.system.cultId ||
      !actorCults.some((cult) => cult.id === runeMagicItem.system.cultId)
    ) {
      let cultId;
      // If the actor only has one cult then attach this runeMagic to that Cult
      if (actorCults.length === 1 && actorCults[0]!.id) {
        cultId = actorCults[0]!.id;
      } else {
        // else ask which one
        cultId = await RuneMagicDataModel.chooseCultDialog(
          actorCults.map((c) => {
            return { name: c.name, id: c.id };
          }),
          runeMagicItem.name ?? "",
          actor.name ?? "",
        );
      }
      updateData = {
        _id: runeMagicItem.id,
        system: { cultId: cultId },
      };
    }
    return updateData;
  }

  private calcRuneMagicChance(
    actorItems: CharacterActor["items"]["contents"],
    cultRuneRqidLinks: RqidLink[],
    runeMagicRuneRqidLinks: RqidLink[],
  ): number {
    const runeMagicRqids = runeMagicRuneRqidLinks.map((r) => r.rqid);
    const cultRqids = cultRuneRqidLinks.map((r) => r.rqid);
    const runeChances = actorItems.reduce((acc: number[], item) => {
      if (
        isDocumentSubType<RuneItem>(item, ItemTypeEnum.Rune) &&
        (runeMagicRqids.includes(item.flags.rqg?.documentRqidFlags?.id ?? "") ||
          (runeMagicRqids.includes(CONFIG.RQG.runeRqid.magic) &&
            cultRqids.includes(item.flags.rqg?.documentRqidFlags?.id ?? "")))
      ) {
        acc.push(item.system.chance);
      }
      return acc;
    }, []);

    return runeChances.length > 0 ? Math.max(...runeChances) : 0;
  }

  private static async chooseCultDialog(
    actorCults: any,
    runeMagicName: string,
    actorName: string,
  ): Promise<string> {
    const htmlContent = await foundry.applications.handlebars.renderTemplate(
      templatePaths.dialogRuneMagicCult,
      {
        actorCults: actorCults,
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
}

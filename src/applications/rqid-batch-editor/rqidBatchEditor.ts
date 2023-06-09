import { systemId } from "../../system/config.js";
import {
  convertFormValueToString,
  getDomDataset,
  getGame,
  getGameUser,
  localize,
  localizeItemType,
  toKebabCase,
} from "../../system/util";
import { Rqid } from "../../system/api/rqidApi";
import type { Document } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/module.mjs";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { DocumentRqidFlags } from "../../data-model/shared/rqgDocumentFlags";

interface ItemUpdate {
  itemId: string;
  name: string;
  documentRqidFlags: DocumentRqidFlags;
  actorId?: string;
  tokenId?: string;
  sceneId?: string;
}

interface ExistingRqids {
  name: string;
  rqid: string;
  optionText: string;
}

interface ItemNameWithoutRqid {
  name: string;
  rqid: string;
  selectedRqid: string;
  selectedRqidSuffix: string;
}

interface RqidBatchEditorData {
  summary: string;
  itemType: string;
  idPrefix: string;
  existingRqids: ExistingRqids[];
  itemNamesWithoutRqid: ItemNameWithoutRqid[];
}

interface RqidBatchEditorOptions extends FormApplication.Options {
  itemType: ItemTypeEnum;
  idPrefix: string;
  prefixRegex: RegExp;
  existingRqids: Map<string, string>;
}

interface Updates {
  itemNamesWithoutRqid: Map<string, string | undefined>;
  updateList: ItemUpdate[];
}

export class RqidBatchEditor extends FormApplication<
  RqidBatchEditorOptions,
  RqidBatchEditorData,
  Updates
> {
  public resolve: (value: PromiseLike<void> | void) => void = () => {};
  public reject: (value: PromiseLike<void> | void) => void = () => {};

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "form", "rqid-batch-editor"],
      popOut: true,
      template: `systems/rqg/applications/rqid-batch-editor/rqidBatchEditor.hbs`,
      width: 1000,
      id: "rqid-batch-editor-application",
      title: "RQG.Dialog.BatchRqidEditor.Title",
      closeOnSubmit: false,
      submitOnClose: false,
      submitOnChange: false,
      resizable: true,
    });
  }

  async close(options?: FormApplication.CloseOptions): Promise<void> {
    await super.close(options);
    this.resolve();
  }

  async getData(): Promise<RqidBatchEditorData> {
    const existingRqids = [...this.options.existingRqids.keys()]
      .reduce((out: any, itemName) => {
        out.push({
          name: itemName,
          rqid: this.options.existingRqids.get(itemName),
          optionText: itemName,
        });
        return out;
      }, [])
      .sort((a: Document<any, any>, b: Document<any, any>) => a.name!.localeCompare(b.name!));

    const itemNamesWithoutRqid = [...this.object.itemNamesWithoutRqid.keys()]
      .reduce((out: any, itemName) => {
        out.push({
          name: itemName,
          key: this.options.existingRqids.get(itemName) ?? "",
          selectedRqid: this.object.itemNamesWithoutRqid.get(itemName),
          selectedRqidSuffix: this.object.itemNamesWithoutRqid
            .get(itemName)
            ?.replace(this.options.prefixRegex ?? "", ""),
        });
        return out;
      }, [])
      .sort((a: Document<any, any>, b: Document<any, any>) => a.name!.localeCompare(b.name!));

    let summary: string;
    switch (this.options.itemType) {
      case ItemTypeEnum.Skill:
        summary = localize("RQG.Dialog.BatchRqidEditor.SummarySkill");
        break;
      case ItemTypeEnum.RuneMagic:
        summary = localize("RQG.Dialog.BatchRqidEditor.SummaryRuneMagic");
        break;
      default:
        const documentNameTranslation = localizeItemType(this.options.itemType);
        summary = localize("RQG.Dialog.BatchRqidEditor.SummaryDefault", {
          type: documentNameTranslation,
        });
    }

    return {
      summary: summary,
      itemType: this.options.itemType,
      idPrefix: this.options.idPrefix,
      existingRqids: existingRqids,
      itemNamesWithoutRqid: itemNamesWithoutRqid,
    };
  }

  activateListeners(html: JQuery): void {
    super.activateListeners(html);
    html.find(".existing").change(this.onSetExistingName.bind(this));
    html.find(".generate-rqid").click(this.onClickGuess.bind(this));
    html.find("input").change(this.onTypeRqid.bind(this));
  }

  onSetExistingName(event: any): void {
    const name = getDomDataset(event, "name") ?? "";
    const newRqid = convertFormValueToString(event.currentTarget?.value);
    this.object.itemNamesWithoutRqid.set(name, newRqid);
    this.render(true);
  }

  onClickGuess(event: any): void {
    const name = getDomDataset(event, "name") ?? "";
    const newRqid = this.options.idPrefix + toKebabCase(name);
    this.object.itemNamesWithoutRqid.set(name, newRqid);
    this.render(true);
  }

  onTypeRqid(event: any): void {
    const name = getDomDataset(event, "name") ?? "";
    const newRqid =
      this.options.idPrefix + toKebabCase(convertFormValueToString(event.currentTarget.value));
    this.object.itemNamesWithoutRqid.set(name, newRqid);
    this.render(true);
  }

  async _updateObject(event: Event, formData: any): Promise<void> {
    if (event instanceof SubmitEvent) {
      const clickedButton = event.submitter as HTMLButtonElement;
      clickedButton.disabled = true;

      await RqidBatchEditor.persistChanges(
        this.object.updateList,
        this.object.itemNamesWithoutRqid
      );
      await this.close();
    }
  }

  get title(): string {
    return super.title + " - " + localizeItemType(this.options.itemType);
  }

  static async persistChanges(
    updateList: ItemUpdate[],
    itemNamesWithoutRqid: Map<string, string | undefined>
  ): Promise<void> {
    const items: any[] = [];
    const actors: any = {};
    const scenes: any = {};
    for (const update of updateList) {
      update.documentRqidFlags.id = itemNamesWithoutRqid.get(update.name);
      if (typeof update.documentRqidFlags.lang === "undefined") {
        update.documentRqidFlags.lang = getGame().settings.get(systemId, "worldLanguage");
      }
      if (typeof update.documentRqidFlags.priority === "undefined") {
        update.documentRqidFlags.priority = 0;
      }
      const flags = flattenObject({
        flags: { rqg: { documentRqidFlags: update.documentRqidFlags } },
      }); // TODO !!!
      if (typeof update.sceneId !== "undefined") {
        if (typeof scenes[update.sceneId] === "undefined") {
          const scene = getGame().scenes?.get(update.sceneId); // TODO Maybe Undefined
          scenes[update.sceneId] = scene?.toObject();
        }
        const tokenOffset = scenes[update.sceneId].tokens.findIndex(
          (t: TokenDocument) => t._id === update.tokenId
        );
        if (tokenOffset > -1) {
          // TODO Added "contents" ***
          const itemOffset = scenes[update.sceneId].tokens[tokenOffset].actorData.items.findIndex(
            (i: any) => i._id === update.itemId
          );
          if (itemOffset > -1) {
            const expandedFlags = expandObject(
              Object.entries(flags).reduce((out: any, entry) => {
                if (entry[0].match(/^flags\.rqg\.documentRqidFlags/)) {
                  out[entry[0]] = entry[1];
                }
                return out;
              }, {})
            );
            scenes[update.sceneId].tokens[tokenOffset].actorData.items[itemOffset] = mergeObject(
              scenes[update.sceneId].tokens[tokenOffset].actorData.items[itemOffset],
              expandedFlags
            );
          }
        }
      } else if (typeof update.actorId !== "undefined") {
        if (typeof actors[update.actorId] === "undefined") {
          actors[update.actorId] = [];
        }
        const item: any = {
          _id: update.itemId,
        };
        for (const key of Object.keys(flags)) {
          if (key.match(/^flags\.rqg\.documentRqidFlags/)) {
            item[key] = flags[key];
          }
        }
        actors[update.actorId].push(item);
      } else {
        const item: any = {
          _id: update.itemId,
        };
        for (const key of Object.keys(flags)) {
          if (key.match(/^flags\.rqg\.documentRqidFlags/)) {
            item[key] = flags[key];
          }
        }
        items.push(item);
      }
    }
    if (items.length) {
      await Item.updateDocuments(items);
    }
    if (Object.keys(actors).length) {
      for (const actorId of Object.keys(actors)) {
        await Item.updateDocuments(actors[actorId], { parent: getGame().actors?.get(actorId) });
      }
    }
    if (Object.keys(scenes).length) {
      for (const sceneId of Object.keys(scenes)) {
        const scene = getGame().scenes?.get(sceneId);
        scene?.update(scenes[sceneId]);
      }
    }
  }

  static async scanWorldForMissingRqids(
    documentType: ItemTypeEnum,
    prefixRegex: RegExp
  ): Promise<
    [
      updateList: ItemUpdate[],
      itemNamesWithoutRqid: Map<string, string | undefined>,
      existingRqids: Map<string, string>
    ]
  > {
    const updateList: ItemUpdate[] = [];
    const itemNamesWithoutRqid: Map<string, string | undefined> = new Map();
    const existingRqids: Map<string, string> = new Map();

    // Collect Rqids from system compendium packs
    const systemItemPacks = getGame().packs.filter(
      (p) =>
        // @ts-expect-error packageName
        p.metadata.packageName === systemId &&
        // @ts-expect-error type
        p.metadata.type === "Item" &&
        // @ts-expect-error packageType
        p.metadata.packageType === "system"
    );
    for (const pack of systemItemPacks) {
      const packIndex = await pack.getIndex();
      packIndex.forEach((packIndexData: any) => {
        if (packIndexData.type === documentType) {
          if (
            prefixRegex.test(packIndexData.flags.rqg?.documentRqidFlags?.id) &&
            // @ts-expect-error isEmpty
            !foundry.utils.isEmpty(packIndexData.flags.rqg?.documentRqidFlags?.id)
          ) {
            existingRqids.set(packIndexData.name, packIndexData?.flags.rqg.documentRqidFlags.id);
          } else {
            itemNamesWithoutRqid.set(packIndexData.name, undefined);
          }
        }
      });
    }

    // Collect Rqids from world Actors items
    const worldActors = getGame().actors?.contents ?? [];
    worldActors.forEach((actor) => {
      const actorData = actor.toObject();

      actorData.items.forEach((item) => {
        const itemData =
          item instanceof CONFIG.Item.documentClass ? (item as any).toObject() : item;
        if (itemData.type === documentType) {
          if (
            prefixRegex.test(itemData.flags.rqg?.documentRqidFlags?.id) &&
            // @ts-expect-error isEmpty
            !foundry.utils.isEmpty(itemData.flags.rqg?.documentRqidFlags?.id)
          ) {
            existingRqids.set(itemData.name, itemData.flags.rqg.documentRqidFlags.id);
          } else {
            itemNamesWithoutRqid.set(itemData.name, undefined);
            updateList.push({
              actorId: actor._id ?? undefined,
              itemId: itemData._id,
              name: itemData.name,
              documentRqidFlags: itemData.flags.rqg?.documentRqidFlags ?? {},
            });
          }
        }
      });
    });

    // Collect Rqids from world items
    const worldItems = getGame().items?.contents ?? [];
    worldItems.forEach((item) => {
      const itemData = item instanceof CONFIG.Item.documentClass ? (item as any).toObject() : item;
      if (itemData.type === documentType) {
        if (
          prefixRegex.test(itemData.flags.rqg?.documentRqidFlags?.id) &&
          // @ts-expect-error isEmpty
          !foundry.utils.isEmpty(itemData.flags.rqg?.documentRqidFlags?.id)
        ) {
          existingRqids.set(itemData.name, itemData.flags.rqg.documentRqidFlags.id);
        } else {
          itemNamesWithoutRqid.set(itemData.name, undefined);
          updateList.push({
            itemId: itemData._id,
            name: itemData.name,
            documentRqidFlags: itemData.flags.rqg?.documentRqidFlags ?? {},
          });
        }
      }
    });

    // Collect Rqids from Scene token actor items
    const worldScenes = getGame().scenes ?? [];
    worldScenes.forEach((scene) => {
      const sceneData = scene.toObject();
      const sceneTokens = sceneData.tokens ?? [];
      sceneTokens.forEach((token) => {
        if (token.actorId && !token.actorLink) {
          const actorData = duplicate(token.actorData);
          const actorItems = actorData.items ?? [];
          actorItems.forEach((item) => {
            const itemData =
              item instanceof CONFIG.Item.documentClass ? (item as any).toObject() : item;
            if (itemData.type === documentType) {
              if (
                prefixRegex.test(itemData.flags.rqg?.documentRqidFlags?.id) &&
                // @ts-expect-error isEmpty
                !foundry.utils.isEmpty(itemData.flags.rqg?.documentRqidFlags?.id)
              ) {
                existingRqids.set(itemData.name, itemData.flags.rqg.documentRqidFlags.id);
              } else {
                itemNamesWithoutRqid.set(itemData.name, undefined);
                updateList.push({
                  sceneId: sceneData._id,
                  tokenId: token._id ?? undefined,
                  itemId: itemData._id,
                  name: itemData.name,
                  documentRqidFlags: itemData.flags.rqg?.documentRqidFlags ?? {},
                });
              }
            }
          });
        }
      });
    });

    // Are there any missingNames without Rqid?
    if ([...itemNamesWithoutRqid.values()].some((v) => !v)) {
      // Fill existingRqids with Rqid from items
      const items: any = await Rqid.fromRqidRegexBest(prefixRegex, "i", "en");

      const namesToDeleteFromExistingRqids: Set<string> = new Set();
      items.forEach((item: any) => {
        const previousRqidSuffix = existingRqids.get(item.name)?.replace(prefixRegex, "");
        const previousExpandedName = `${item.name ?? ""} ➤ ${previousRqidSuffix}`;

        const newRqidSuffix = item.flags.rqg.documentRqidFlags.id?.replace(prefixRegex, "");
        const newExpandedName = `${item.name ?? ""} ➤ ${newRqidSuffix}`;

        if (
          // If foundKeys already has this item name but with another Rqid, then add the new one as well under a different name
          existingRqids.has(item.name) &&
          existingRqids.get(item.name) !== item.flags.rqg.documentRqidFlags.id
        ) {
          existingRqids.set(previousExpandedName, toKebabCase(existingRqids.get(item.name))!);
          existingRqids.set(newExpandedName, toKebabCase(item.flags.rqg.documentRqidFlags.id));
          namesToDeleteFromExistingRqids.add(item.name);
        }
      });

      // Remove the names without specification for names pointing to multiple Rqids
      namesToDeleteFromExistingRqids.forEach((k) => existingRqids.delete(k));

      // Prefill itemNamesWithoutRqid with Rqid from matching existingRqids
      for (const name of itemNamesWithoutRqid.keys()) {
        itemNamesWithoutRqid.set(name, existingRqids.get(name)!);
      }
    }

    return [updateList, itemNamesWithoutRqid, existingRqids];
  }

  // Render the application and resolve a Promise when the application is closed so that it can be awaited
  public async show(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.render(true);
    });
  }

  // Render the application in sequence for all provided item types
  static async factory(...itemTypes: ItemTypeEnum[]): Promise<void> {
    if (!getGameUser().isGM) {
      ui.notifications?.info(localize("RQG.Notification.Error.GMOnlyOperation"));
      return;
    }
    for (const itemType of itemTypes) {
      const rqidDocumentName = "i"; // Hardcoded for now until more documents than Item are supported

      const idPrefix = `${rqidDocumentName}.${toKebabCase(itemType)}.`;
      const prefixRegex = new RegExp(
        "^" + rqidDocumentName + "\\." + toKebabCase(itemType) + "\\."
      );

      const [updateList, itemNamesWithoutRqid, existingRqids] =
        await RqidBatchEditor.scanWorldForMissingRqids(itemType, prefixRegex);
      if (
        // @ts-expect-errors isEmpty  Are there any document without rqid to show?
        foundry.utils.isEmpty(itemNamesWithoutRqid)
      ) {
        continue;
      }
      const rqidBatchEditor = new RqidBatchEditor(
        {
          itemNamesWithoutRqid: itemNamesWithoutRqid,
          updateList: updateList,
        },
        {
          itemType,
          idPrefix,
          prefixRegex,
          existingRqids: existingRqids,
        }
      );
      await rqidBatchEditor.show();
    }
  }
}

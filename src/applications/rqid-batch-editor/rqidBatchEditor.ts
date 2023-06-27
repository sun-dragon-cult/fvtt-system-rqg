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
import { ItemDataSource } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";

interface ItemUpdate {
  itemId: string;
  name: string;
  documentRqidFlags: DocumentRqidFlags;
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
  itemName2Rqid: Map<string, string | undefined>;
  // actorId -> ItemUpdate[]
  actorChangesMap: Map<string, ItemUpdate[]>;
  // sceneId -> tokenId -> ItemUpdate[]
  sceneChangesMap: Map<string, Map<string, ItemUpdate[]>>;
  worldItemChanges: ItemUpdate[];
  // packId -> ItemUpdate[]
  packItemChangesMap: Map<string, ItemUpdate[]>;
  // packId -> actorId -> ItemUpdate[]
  packActorChangesMap: Map<string, Map<string, ItemUpdate[]>>;
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

    const itemNamesWithoutRqid: ItemNameWithoutRqid[] = [...this.object.itemName2Rqid.keys()]
      .reduce((out: any, itemName) => {
        out.push({
          name: itemName,
          key: this.options.existingRqids.get(itemName) ?? "",
          selectedRqid: this.object.itemName2Rqid.get(itemName),
          selectedRqidSuffix: this.object.itemName2Rqid
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
    this.object.itemName2Rqid.set(name, newRqid);
    this.render(true);
  }

  onClickGuess(event: any): void {
    const name = getDomDataset(event, "name") ?? "";
    const newRqid = this.options.idPrefix + toKebabCase(name);
    this.object.itemName2Rqid.set(name, newRqid);
    this.render(true);
  }

  onTypeRqid(event: any): void {
    const name = getDomDataset(event, "name") ?? "";
    const newRqid =
      this.options.idPrefix + toKebabCase(convertFormValueToString(event.currentTarget.value));
    this.object.itemName2Rqid.set(name, newRqid);
    this.render(true);
  }

  async _updateObject(event: Event, formData: any): Promise<void> {
    if (event instanceof SubmitEvent) {
      const clickedButton = event.submitter as HTMLButtonElement;
      clickedButton.disabled = true;

      await RqidBatchEditor.persistChanges(
        this.object.sceneChangesMap,
        this.object.actorChangesMap,
        this.object.worldItemChanges,
        this.object.packItemChangesMap,
        this.object.packActorChangesMap,
        this.object.itemName2Rqid
      );
      await this.close();
    }
  }

  get title(): string {
    return super.title + " - " + localizeItemType(this.options.itemType);
  }

  static async persistChanges(
    // sceneId -> tokenId -> ItemUpdate[]
    sceneChangesMap: Map<string, Map<string, ItemUpdate[]>>,
    // actorId ->  ItemUpdate[]
    actorChangesMap: Map<string, ItemUpdate[]>,
    itemChanges: ItemUpdate[],
    // packId -> ItemUpdate[]
    packItemChanges: Map<string, ItemUpdate[]>,
    // packId -> actorId -> ItemUpdate[]
    packActorChanges: Map<string, Map<string, ItemUpdate[]>>,
    itemNames2Rqid: Map<string, string | undefined>
  ): Promise<void> {
    const changesCount = sceneChangesMap.size + actorChangesMap.size + 1 + packItemChanges.size;
    let progress = 0;
    // @ts-expect-error displayProgressBar
    SceneNavigation.displayProgressBar({ label: `0 / ${changesCount}`, pct: 0 });

    // TODO https://stackoverflow.com/questions/66868195/running-for-loop-in-parallel-using-async-await-promises

    // Update items embedded in actors
    for (const [actorId, actorItemUpdates] of actorChangesMap) {
      const actor = getGame().actors?.get(actorId);
      if (!actor) {
        console.error("RQG | Could not find actor with id", actorId);
        continue;
      }

      const embeddeItemdUpdates: any[] = actorItemUpdates.reduce((acc: any[], itemUpdate) => {
        const rqidFlags: DocumentRqidFlags = {
          id: itemNames2Rqid.get(itemUpdate.name),
          lang:
            itemUpdate.documentRqidFlags.lang ?? getGame().settings.get(systemId, "worldLanguage"),
          priority: itemUpdate.documentRqidFlags.priority ?? 0,
        };
        const embeddedItemUpdate = RqidBatchEditor.getItemUpdate(itemUpdate, rqidFlags);
        if (embeddedItemUpdate) {
          acc.push(embeddedItemUpdate);
        }
        return acc;
      }, []);

      if (!isEmpty(embeddeItemdUpdates)) {
        await Item.updateDocuments(embeddeItemdUpdates, {
          parent: getGame().actors?.get(actorId), // actorUpdates would be empty without actorId
        });
      }
      this.updateProgress(++progress, changesCount);
    }

    // Update world items
    const worldItemUpdates = itemChanges.reduce((acc: any[], itemUpdate) => {
      const rqidFlags: DocumentRqidFlags = {
        id: itemNames2Rqid.get(itemUpdate.name),
        lang:
          itemUpdate.documentRqidFlags.lang ?? getGame().settings.get(systemId, "worldLanguage"),
        priority: itemUpdate.documentRqidFlags.priority ?? 0,
      };
      const embeddedItemUpdate = RqidBatchEditor.getItemUpdate(itemUpdate, rqidFlags);
      if (embeddedItemUpdate) {
        acc.push(embeddedItemUpdate);
      }
      return acc;
    }, []);

    if (!isEmpty(worldItemUpdates)) {
      await Item.updateDocuments(worldItemUpdates);
      // RqidBatchEditor.updateProgress(index, updateList.length);
    }
    this.updateProgress(++progress, changesCount);

    // Scene updates
    for (const [sceneId, token2ItemUpdates] of sceneChangesMap) {
      const scene = getGame().scenes?.get(sceneId);
      if (!scene) {
        console.error("RQG | Could not find scene with id", sceneId);
        continue;
      }

      for (const [tokenId, tokenItemUpdates] of token2ItemUpdates) {
        const token = scene.tokens.get(tokenId);
        if (!token) {
          console.error("RQG | Could not find scene token with id", tokenId);
          continue;
        }
        // @ts-expect-error actorData..
        if (!token?.actorData) {
          console.error("RQG | Could not find actorData on token with id", tokenId);
          continue;
        }

        tokenItemUpdates.forEach((itemUpdate) => {
          // @ts-expect-error actorData
          const item = token.actorData.items.find((i) => i._id === itemUpdate.itemId);
          const rqidFlags: DocumentRqidFlags = {
            id: itemNames2Rqid.get(itemUpdate.name),
            lang:
              itemUpdate.documentRqidFlags.lang ??
              getGame().settings.get(systemId, "worldLanguage"),
            priority: itemUpdate.documentRqidFlags.priority ?? 0,
          };
          setProperty(item, "flags.rqg.documentRqidFlags", rqidFlags);
          // item.flag.rqg.documentRqidFlags = rqidFlags;
        });
      }
      // The scene tokens have been updated above
      await scene.update({ tokens: duplicate(scene.tokens.contents) as any });
      this.updateProgress(++progress, changesCount);
    }

    // Item Pack Compendium updates
    for (const [packId, itemChanges] of packItemChanges) {
      // TODO if pack is locked - unlock

      const itemUpdates = itemChanges.reduce((acc: any[], itemUpdate) => {
        const rqidFlags: DocumentRqidFlags = {
          id: itemNames2Rqid.get(itemUpdate.name),
          lang:
            itemUpdate.documentRqidFlags.lang ?? getGame().settings.get(systemId, "worldLanguage"),
          priority: itemUpdate.documentRqidFlags.priority ?? 0,
        };
        const embeddedItemUpdate = RqidBatchEditor.getItemUpdate(itemUpdate, rqidFlags);
        if (embeddedItemUpdate) {
          acc.push(embeddedItemUpdate);
        }
        return acc;
      }, []);

      const pack = getGame().packs.get(packId)!;
      const wasLocked = pack.locked;
      await pack.configure({ locked: false });
      await Item.updateDocuments(itemUpdates, { pack: packId });
      await pack.configure({ locked: wasLocked });

      this.updateProgress(++progress, changesCount);
    }
  }

  static updateProgress(index: number, totalCount: number): void {
    const progress = Math.ceil((100 * index) / totalCount);
    // @ts-expect-error displayProgressBar
    SceneNavigation.displayProgressBar({
      label: `${index} / ${totalCount}`,
      pct: Math.round(progress),
    });
  }

  static async findItemsWithMissingRqids(
    documentType: ItemTypeEnum,
    prefixRegex: RegExp
  ): Promise<{
    // updateList: ItemUpdate[],
    sceneChangesMap: Map<string, Map<string, ItemUpdate[]>>; // sceneId -> tokenIs -> ItemUpdate
    actorChangesMap: Map<string, ItemUpdate[]>; // actorId -> ItemUpdate
    itemChanges: ItemUpdate[];
    packItemChangesMap: Map<string, ItemUpdate[]>;
    packActorChangesMap: Map<string, Map<string, ItemUpdate[]>>;
    itemNamesWithoutRqid: Map<string, string | undefined>;
    existingRqids: Map<string, string>;
  }> {
    // sceneId -> tokenId -> ItemUpdate[]
    const sceneChangesMap = new Map<string, Map<string, ItemUpdate[]>>();
    // actorId -> ItemUpdate[]
    const actorChangesMap = new Map<string, ItemUpdate[]>();
    const itemChanges: ItemUpdate[] = [];
    // packId -> ItemUpdate[]
    const packItemChangesMap = new Map<string, ItemUpdate[]>();
    // packId -> actorId -> ItemUpdate[]
    const packActorChangesMap = new Map<string, Map<string, ItemUpdate[]>>();

    const itemNamesWithoutRqid: Map<string, string | undefined> = new Map();
    const existingRqids: Map<string, string> = new Map();

    // Collect Rqids from system compendium packs
    const worldItemPacks = getGame().packs;
    for (const pack of worldItemPacks) {
      const packIndex = await pack.getIndex();
      packIndex.forEach((packIndexData: any) => {
        if (packIndexData.type !== documentType) {
          return;
          // Handle actor compendium packs
        }

        if (
          // @ts-expect-error packageName
          pack.metadata.packageName === systemId &&
          // @ts-expect-error type
          pack.metadata.type === "Item" &&
          // @ts-expect-error packageType
          pack.metadata.packageType === "system"
        ) {
          // If the pack is a system item compendium then remember the name -> rqid combo in "existingRqids"
          if (
            prefixRegex.test(packIndexData?.flags?.rqg?.documentRqidFlags?.id) &&
            // @ts-expect-error isEmpty
            !foundry.utils.isEmpty(packIndexData?.flags?.rqg?.documentRqidFlags?.id)
          ) {
            // RQG System compendium pack item
            existingRqids.set(packIndexData.name, packIndexData.flags.rqg.documentRqidFlags.id);
          }
        } else {
          if (
            prefixRegex.test(packIndexData?.flags?.rqg?.documentRqidFlags?.id) &&
            // @ts-expect-error isEmpty
            !foundry.utils.isEmpty(packIndexData?.flags?.rqg?.documentRqidFlags?.id)
          ) {
            // TODO Should these (non system compendium pack items) be counted?
            existingRqids.set(packIndexData.name, packIndexData.flags.rqg.documentRqidFlags.id);
          } else {
            itemNamesWithoutRqid.set(packIndexData.name, undefined);

            // @ts-expect-error metadata.id
            const currentUpdates: ItemUpdate[] = packItemChangesMap.has(pack.metadata.id)
              ? // @ts-expect-error metadata.id
                packItemChangesMap.get(pack.metadata.id!)!
              : [];
            currentUpdates.push({
              itemId: packIndexData._id,
              name: packIndexData.name,
              documentRqidFlags: packIndexData?.flags?.rqg?.documentRqidFlags ?? {},
            });

            // @ts-expect-error metadata.id
            packItemChangesMap.set(pack.metadata.id, currentUpdates);
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
        if (itemData.type !== documentType) {
          return;
        }
        if (
          prefixRegex.test(itemData.flags.rqg?.documentRqidFlags?.id) && // TODO behöver man kolla prefix här ?? och är det samma action som inget rqid?
          !isEmpty(itemData.flags.rqg?.documentRqidFlags?.id)
        ) {
          existingRqids.set(itemData.name, itemData.flags.rqg.documentRqidFlags.id);
        } else {
          itemNamesWithoutRqid.set(itemData.name, undefined);
          if (!actor._id) {
            console.warn("RQG | Found actor without _id", actor.name);
            return;
          }
          const currentUpdates: ItemUpdate[] = actorChangesMap.has(actor._id)
            ? actorChangesMap.get(actor._id)!
            : [];
          currentUpdates.push({
            itemId: itemData._id,
            name: itemData.name,
            documentRqidFlags: itemData.flags.rqg?.documentRqidFlags ?? {},
          });

          actorChangesMap.set(actor._id, currentUpdates);
        }
      });
    });

    // Collect Rqids from world items
    const worldItems = getGame().items?.contents ?? [];
    worldItems.forEach((item) => {
      const itemData = item instanceof CONFIG.Item.documentClass ? (item as any).toObject() : item;
      if (itemData.type !== documentType) {
        return;
      }
      if (
        prefixRegex.test(itemData.flags.rqg?.documentRqidFlags?.id) &&
        !isEmpty(itemData.flags.rqg?.documentRqidFlags?.id)
      ) {
        existingRqids.set(itemData.name, itemData.flags.rqg.documentRqidFlags.id);
      } else {
        itemNamesWithoutRqid.set(itemData.name, undefined);
        if (!itemData._id) {
          console.warn("RQG | Found item without _id", itemData.name);
          return;
        }
        const currentUpdates: ItemUpdate = {
          itemId: itemData._id,
          name: itemData.name,
          documentRqidFlags: itemData.flags.rqg?.documentRqidFlags ?? {},
        };
        itemChanges.push(currentUpdates);
      }
    });

    // Collect Rqids from Scene token actor items
    const worldScenes = getGame().scenes ?? [];

    // Loop over world scenes
    worldScenes.forEach((scene) => {
      const sceneTokens = scene.tokens.contents ?? [];
      if (!scene._id) {
        console.warn("RQG | Found scene without _id", scene.name);
        return;
      }

      const tokenActorItemChangesMap = new Map<string, ItemUpdate[]>(); // key: tokenId

      // Loop over scene linked tokens
      sceneTokens.forEach((token) => {
        // @ts-expect-errors actorId & actorLink on TokenDocument
        if (!token.actorId || token.actorLink) {
          return; // Unlinked token
        }
        if (!token._id) {
          console.warn("RQG | Found token without _id", token.name);
          return;
        }

        // @ts-expect-error actorData
        const actorData = token.actorData;
        const tokenActorItems: ItemDataSource[] = actorData.items ?? [];

        // Loop over actor items
        tokenActorItems.forEach((item) => {
          const itemData = item;
          if (itemData.type !== documentType) {
            return;
          }
          if (!itemData._id) {
            console.warn("RQG | Found item without _id", itemData.name);
            return;
          }

          if (
            itemData.flags.rqg?.documentRqidFlags?.id &&
            prefixRegex.test(itemData.flags.rqg.documentRqidFlags.id)
          ) {
            // rqid already set on item
            existingRqids.set(itemData.name, itemData.flags.rqg.documentRqidFlags.id);
          } else {
            itemNamesWithoutRqid.set(itemData.name, undefined);

            const currentUpdates: ItemUpdate[] = tokenActorItemChangesMap.has(token._id!) // why is ! needed, it's checked on row 531
              ? tokenActorItemChangesMap.get(token._id!)!
              : [];
            currentUpdates.push({
              itemId: itemData._id,
              name: itemData.name,
              documentRqidFlags: itemData.flags.rqg?.documentRqidFlags ?? {},
            });

            tokenActorItemChangesMap.set(token._id!, currentUpdates);
          }
        });
      });
      sceneChangesMap.set(scene._id, tokenActorItemChangesMap);
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
          existingRqids.set(previousExpandedName, existingRqids.get(item.name)!);
          existingRqids.set(newExpandedName, item.flags.rqg.documentRqidFlags.id);
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

    return {
      sceneChangesMap,
      actorChangesMap,
      itemChanges,
      packItemChangesMap,
      packActorChangesMap,
      itemNamesWithoutRqid,
      existingRqids,
    };
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

      const {
        sceneChangesMap,
        actorChangesMap,
        itemChanges,
        packItemChangesMap,
        packActorChangesMap,
        itemNamesWithoutRqid,
        existingRqids,
      } = await RqidBatchEditor.findItemsWithMissingRqids(itemType, prefixRegex);
      if (isEmpty(itemNamesWithoutRqid)) {
        continue;
      }

      const rqidBatchEditor = new RqidBatchEditor(
        {
          itemName2Rqid: itemNamesWithoutRqid,
          sceneChangesMap: sceneChangesMap,
          actorChangesMap: actorChangesMap,
          worldItemChanges: itemChanges,
          packItemChangesMap: packItemChangesMap,
          packActorChangesMap: packActorChangesMap,
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

  // -------------

  /**
   * Convert an ItemUpdate & flags to a format for foundry update.
   */
  private static getItemUpdate(update: ItemUpdate, flags: DocumentRqidFlags): any | undefined {
    if (!update.itemId || !flags.id) {
      return undefined;
    }
    return {
      _id: update.itemId,
      "flags.rqg.documentRqidFlags": flags,
    };
  }
}

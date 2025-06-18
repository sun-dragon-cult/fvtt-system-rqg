import { DocumentRqidFlags } from "../../data-model/shared/rqgDocumentFlags";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export interface ItemChange {
  itemId: string;
  name: string;
  documentRqidFlags: DocumentRqidFlags;
}

export interface ExistingRqids {
  name: string;
  rqid: string;
  optionText: string;
}

export interface ItemNameWithoutRqid {
  name: string;
  rqid: string;
  selectedRqid: string;
  selectedRqidSuffix: string;
}

export interface RqidBatchEditorData {
  summary: string;
  itemType: string;
  idPrefix: string;
  existingRqidOptions: SelectOptionData<string>[];
  itemNamesWithoutRqid: ItemNameWithoutRqid[];
}

export interface RqidBatchEditorOptions extends FormApplication.Options {
  itemType: ItemTypeEnum;
  idPrefix: string;
  prefixRegex: RegExp;
  existingRqids: Map<string, string>;
}

export interface Changes {
  itemName2Rqid: Map<string, string | undefined>;
  // actorId -> ItemUpdate[]
  actorChangesMap: Map<string, ItemChange[]>;
  // sceneId -> tokenId -> ItemUpdate[]
  sceneChangesMap: Map<string, Map<string, ItemChange[]>>;
  worldItemChanges: ItemChange[];
  // packId -> ItemUpdate[]
  packItemChangesMap: Map<string, ItemChange[]>;
  // packId -> actorId -> ItemUpdate[]
  packActorChangesMap: Map<string, Map<string, ItemChange[]>>;
}

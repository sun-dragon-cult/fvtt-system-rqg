import type { RqgActor } from "@actors/rqgActor.ts";
import { ItemTypeEnum, type RqgItemType } from "@item-model/itemTypes.ts";
import { Armor } from "./armor-item/armor";
import { Cult } from "./cult-item/cult";
import { Gear } from "./gear-item/gear";
import { HitLocation } from "./hit-location-item/hitLocation";
import { Passion } from "./passion-item/passion";
import { Rune } from "./rune-item/rune";
import { RuneMagic } from "./rune-magic-item/runeMagic";
import { Skill } from "./skill-item/skill";
import { SpiritMagic } from "./spirit-magic-item/spiritMagic";
import { Weapon } from "./weapon-item/weapon";
import type { RqgItem } from "./rqgItem";

export interface ItemLifecycleStrategy {
  onEmbedItem?(actor: RqgActor, child: RqgItem, options: any, userId: string): Promise<any>;
  preUpdateItem?(actor: RqgActor, item: RqgItem, result: any[], options: any): void;
  onDeleteItem?(actor: RqgActor, itemData: RqgItem, options: any, userId: string): any[];
  onActorPrepareEmbeddedEntities?(item: RqgItem): RqgItem;
  onActorPrepareDerivedData?(item: RqgItem): RqgItem;
}

type ItemLifecycleStrategyClass = {
  prototype: unknown;
  onEmbedItem?(actor: RqgActor, child: RqgItem, options: any, userId: string): Promise<any>;
  preUpdateItem?(actor: RqgActor, item: RqgItem, result: any[], options: any): void;
  onDeleteItem?(actor: RqgActor, itemData: RqgItem, options: any, userId: string): any[];
  onActorPrepareEmbeddedEntities?(item: RqgItem): RqgItem;
  onActorPrepareDerivedData?(item: RqgItem): RqgItem;
};

const itemLifecycleStrategyByType = new Map<RqgItemType, ItemLifecycleStrategyClass>([
  [ItemTypeEnum.Armor as RqgItemType, Armor],
  [ItemTypeEnum.Cult as RqgItemType, Cult],
  [ItemTypeEnum.Gear as RqgItemType, Gear],
  [ItemTypeEnum.HitLocation as RqgItemType, HitLocation],
  [ItemTypeEnum.Passion as RqgItemType, Passion],
  [ItemTypeEnum.Rune as RqgItemType, Rune],
  [ItemTypeEnum.RuneMagic as RqgItemType, RuneMagic],
  [ItemTypeEnum.Skill as RqgItemType, Skill],
  [ItemTypeEnum.SpiritMagic as RqgItemType, SpiritMagic],
  [ItemTypeEnum.Weapon as RqgItemType, Weapon],
]);

export function getItemLifecycleStrategy(
  itemType: Item.SubType,
): ItemLifecycleStrategy | undefined {
  return itemLifecycleStrategyByType.get(itemType as RqgItemType);
}

/**
 * Dispatches Actor.prepareEmbeddedDocuments item preparation using the strategy pattern.
 *
 * Side effect: strategy implementations can mutate the provided item's system data in-place.
 */
export function applyActorPrepareEmbeddedEntities(item: RqgItem): void {
  getItemLifecycleStrategy(item.type)?.onActorPrepareEmbeddedEntities?.(item);
}

/**
 * Dispatches Actor.prepareDerivedData item preparation using the strategy pattern.
 *
 * Side effect: strategy implementations can mutate the provided item's system data in-place.
 */
export function applyActorPrepareDerivedData(item: RqgItem): void {
  getItemLifecycleStrategy(item.type)?.onActorPrepareDerivedData?.(item);
}

/**
 * Dispatches Item.updateDocuments pre-update handling using the strategy pattern.
 *
 * Side effect: mutates the updates array by appending/merging additional update payloads.
 */
export function applyItemPreUpdate(
  actor: RqgActor,
  item: RqgItem,
  updates: any[],
  options: any,
): void {
  getItemLifecycleStrategy(item.type)?.preUpdateItem?.(actor, item, updates, options);
}

/**
 * Dispatches Actor._onCreateDescendantDocuments item behavior using the strategy pattern.
 *
 * Side effect: strategies may mutate options, create/delete embedded documents, or return follow-up update data.
 */
export async function applyActorCreateDescendantDocuments(
  actor: RqgActor,
  item: RqgItem,
  options: any,
  userId: string,
): Promise<any> {
  return getItemLifecycleStrategy(item.type)?.onEmbedItem?.(actor, item, options, userId);
}

/**
 * Dispatches Actor._onDeleteDescendantDocuments item behavior using the strategy pattern.
 * Builds follow-up updates via the item-type strategy.
 *
 * Side effect: none in dispatcher itself; strategies can inspect actor state and compute update payloads.
 */
export function buildActorDeleteDescendantDocumentsUpdates(
  actor: RqgActor,
  item: RqgItem,
  options: any,
  userId: string,
): any[] | undefined {
  return getItemLifecycleStrategy(item.type)?.onDeleteItem?.(actor, item, options, userId);
}

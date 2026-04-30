import type { RqgActor } from "@actors/rqgActor.ts";
import { ItemTypeEnum, type RqgItemType } from "@item-model/itemTypes.ts";
import { armorLifecycle } from "./armor-item/armorLifecycle";
import { cultLifecycle } from "./cult-item/cultLifecycle";
import { gearLifecycle } from "./gear-item/gearLifecycle";
import { hitLocationLifecycle } from "./hit-location-item/hitLocationLifecycle";
import { runeLifecycle } from "./rune-item/runeLifecycle";
import { runeMagicLifecycle } from "./rune-magic-item/runeMagicLifecycle";
import { skillLifecycle } from "./skill-item/skillLifecycle";
import { weaponLifecycle } from "./weapon-item/weaponLifecycle";
import type { RqgItem } from "./rqgItem";

export interface ItemLifecycleStrategy {
  onEmbedItem?(actor: RqgActor, child: RqgItem, options: any, userId: string): Promise<any>;
  preUpdateItem?(actor: RqgActor, item: RqgItem, result: any[], options: any): void;
  onDeleteItem?(actor: RqgActor, itemData: RqgItem, options: any, userId: string): any[];
  onActorPrepareEmbeddedEntities?(item: RqgItem): RqgItem;
  onActorPrepareDerivedData?(item: RqgItem): RqgItem;
}

const itemLifecycleStrategyByType = new Map<RqgItemType, ItemLifecycleStrategy>([
  [ItemTypeEnum.Armor as RqgItemType, armorLifecycle],
  [ItemTypeEnum.Cult as RqgItemType, cultLifecycle],
  [ItemTypeEnum.Gear as RqgItemType, gearLifecycle],
  [ItemTypeEnum.HitLocation as RqgItemType, hitLocationLifecycle],
  [ItemTypeEnum.Rune as RqgItemType, runeLifecycle],
  [ItemTypeEnum.RuneMagic as RqgItemType, runeMagicLifecycle],
  [ItemTypeEnum.Skill as RqgItemType, skillLifecycle],
  [ItemTypeEnum.Weapon as RqgItemType, weaponLifecycle],
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

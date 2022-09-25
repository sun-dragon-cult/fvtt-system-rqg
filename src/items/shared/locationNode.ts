import { defaultPriceData, IPhysicalItem } from "../../data-model/item-data/IPhysicalItem";
import { hasOwnProperty, localize, RqgError } from "../../system/util";
import { ItemDataSource } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export type LocationNode = IPhysicalItem & {
  // For the grouping of physical items in a tree structure
  name: string | null;
  id: string | null;
  contains: LocationNode[];
};

export function createItemLocationTree(itemDatas: ItemDataSource[]): LocationNode {
  let locationTree: LocationNode = {
    name: "",
    id: "",
    description: "",
    gmNotes: "",
    contains: [],
    isContainer: false,
    physicalItemType: "unique",
    quantity: 1,
    location: "",
    attunedTo: "",
    encumbrance: 0,
    equippedStatus: "notCarried",
    price: defaultPriceData,
  };
  // @ts-expect-error system
  const physicalItemDatas = itemDatas.filter((i) => hasOwnProperty(i.system, "physicalItemType"));
  let physicalItemNodes: LocationNode[] = physicalItemDatas
    .filter(
      // TODO v10 any
      (itemData: any) => !(itemData.type === ItemTypeEnum.Weapon && itemData.system.isNatural)
    ) // TODO v10 any
    .map((itemData: any) => {
      const itemLocation =
        (hasOwnProperty(itemData.system, "location") && itemData.system.location) || "";
      // Placing an item inside itself is not allowed - count it as root level
      let location = itemLocation === itemData.name ? "" : itemLocation;
      if (hasLoop(itemData, physicalItemDatas)) {
        ui.notifications?.warn(
          localize("RQG.Item.Notification.CircularGearLocationWarning", {
            itemLocation: itemLocation,
          })
        );
        location = "";
      }
      const containingItem = physicalItemDatas.find(
        // @ts-ignore
        (p) => itemData.system.location && p.name === itemData.system.location
      );
      // @ts-ignore
      if (containingItem && !containingItem.system.isContainer) {
        ui.notifications?.warn(
          localize("RQG.Item.Notification.ItemIsNotContainerWarning", {
            itemName: containingItem.name,
          })
        ); // TODO make a real solution!
        location = "";
      }
      return {
        name: itemData.name,
        id: itemData._id,
        location: location,
        description: (itemData.system as any).description,
        gmNotes: (itemData.system as any).gmNotes,
        attunedTo: (itemData.system as any).attunedTo,
        contains: [],
        isContainer: (itemData.system as any).isContainer,
        physicalItemType: (itemData.system as any).physicalItemType,
        encumbrance: (itemData.system as any).encumbrance,
        equippedStatus: (itemData.system as any).equippedStatus,
        quantity: (itemData.system as any).quantity || 1,
        price: (itemData.system as any).price,
      };
    });

  // 1) Add all "virtual" nodes (locations that don't match an item name)
  const itemNames = physicalItemDatas.map((i) => i.name);
  const virtualNodesMap: Map<string, LocationNode> = physicalItemNodes
    .filter(
      (node) =>
        node.location !== "" && // no root node
        !itemNames.includes(node.location) // no actual item
    )
    .reduce((acc, val) => {
      // No duplicate locations
      acc.set(val.location, val);
      return acc;
    }, new Map());

  const virtualNodes: LocationNode[] = [...virtualNodesMap].map(([_, node]) => {
    return {
      name: node.location,
      id: "",
      quantity: 1,
      description: "",
      gmNotes: "",
      contains: [],
      physicalItemType: "unique",
      location: "",
      isContainer: false,
      attunedTo: "",
      encumbrance: 0,
      equippedStatus: "notCarried",
      price: defaultPriceData,
    };
  });
  locationTree.contains = locationTree.contains.concat(virtualNodes);

  // 2) Recursively add items to the locationTree node where item.location === node.name
  let retriesLeft = 1000; // Failsafe in case the algorithm fails
  while (physicalItemNodes.length > 0 && retriesLeft) {
    retriesLeft--;
    physicalItemNodes = physicalItemNodes.filter((itemNode) => {
      const treeNode = searchTree(locationTree, itemNode.location);
      if (treeNode) {
        treeNode.contains.push(itemNode);
      }
      return !treeNode; // keep the ones not added to the tree yet
    });
  }
  if (!retriesLeft) {
    console.error(
      "RQG | Physical Item Location algorithm did not finish. remaining items:",
      physicalItemDatas
    );
  }

  return locationTree;
}

// Find a node matching the location in the node tree
function searchTree(node: LocationNode, location: string): LocationNode | null {
  if (node.name === location) {
    return node;
  } else if (node.contains && node.contains.length > 0) {
    let result = null;
    for (let i = 0; result === null && i < node.contains.length; i++) {
      result = searchTree(node.contains[i], location);
    }
    return result;
  }
  return null;
}

function hasLoop(initialItem: ItemDataSource, physicalItems: ItemDataSource[]): boolean {
  let currentItem = physicalItems.find(
    // @ts-expect-error system
    (i) => hasOwnProperty(i.system, "location") && initialItem.name === i.system.location
  );
  let isLoop: boolean = false;
  while (
    // @ts-expect-error system
    hasOwnProperty(currentItem?.system, "location") &&
    // @ts-expect-error system
    currentItem?.system?.location &&
    !isLoop
  ) {
    isLoop =
      // @ts-expect-error system
      hasOwnProperty(initialItem.system, "location") &&
      // @ts-expect-error system
      initialItem.system.location === currentItem?.name;
    currentItem = physicalItems.find(
      (i) =>
        // @ts-expect-error system
        hasOwnProperty(currentItem?.system, "location") && i.name === currentItem?.system.location
    );
  }
  return isLoop;
}

export function getOtherItemIdsInSameLocationTree(
  itemName: string,
  itemsDatas: ItemDataSource[]
): string[] {
  const itemLocationTree = createItemLocationTree(itemsDatas);
  let rootNode = searchTree(itemLocationTree, itemName);
  while (rootNode && rootNode.location) {
    rootNode = searchTree(itemLocationTree, rootNode.location);
  }
  if (rootNode == null) {
    const msg = localize("RQG.Item.Notification.CantFindRootLocationNode");
    ui.notifications?.error(msg);
    throw new RqgError(msg, itemLocationTree);
  }
  const itemIds = getDescendants([], rootNode);
  return itemIds.map((id) => id);
}

function getDescendants(ids: string[], node: LocationNode): string[] {
  if (node) {
    if (node.id) {
      ids.push(node.id);
    }
    ids.concat(node.contains.flatMap((n) => getDescendants(ids, n)));
  }
  return ids;
}

import { emptyPrice, IPhysicalItem } from "../../../data-model/item-data/IPhysicalItem";
import { hasOwnProperty, localize, RqgError } from "../../../system/util";
import { ItemDataSource } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";
import { ItemTypeEnum } from "../../../data-model/item-data/itemTypes";

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
    price: emptyPrice,
  };
  const physicalItemDatas = itemDatas.filter((i) => hasOwnProperty(i.data, "physicalItemType"));
  let physicalItemNodes: LocationNode[] = physicalItemDatas
    .filter((itemData) => !(itemData.type === ItemTypeEnum.Weapon && itemData.data.isNatural))
    .map((itemData) => {
      const itemLocation =
        (hasOwnProperty(itemData.data, "location") && itemData.data.location) || "";
      // Placing an item inside itself is not allowed - count it as root level
      let location = itemLocation === itemData.name ? "" : itemLocation;
      if (hasLoop(itemData, physicalItemDatas)) {
        ui.notifications?.warn(
          localize("RQG.Items.Notification.CircularGearLocationWarning", {itemLocation: itemLocation})
        );
        location = "";
      }
      const containingItem = physicalItemDatas.find(
        // @ts-ignore
        (p) => itemData.data.location && p.name === itemData.data.location
      );
      // @ts-ignore
      if (containingItem && !containingItem.data.isContainer) {
        ui.notifications?.warn(localize("RQG.Items.Notification.ItemIsNotContainerWarning", {itemName: containingItem.name})); // TODO make a real solution!
        location = "";
      }
      return {
        name: itemData.name,
        id: itemData._id,
        location: location,
        description: (itemData.data as any).description,
        gmNotes: (itemData.data as any).gmNotes,
        attunedTo: (itemData.data as any).attunedTo,
        contains: [],
        isContainer: (itemData.data as any).isContainer,
        physicalItemType: (itemData.data as any).physicalItemType,
        encumbrance: (itemData.data as any).encumbrance,
        equippedStatus: (itemData.data as any).equippedStatus,
        quantity: (itemData.data as any).quantity || 1,
        price: (itemData.data as any).price,
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

  const virtualNodes: LocationNode[] = [...virtualNodesMap].map(([i, node]) => {
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
      price: emptyPrice,
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
    (i) => hasOwnProperty(i.data, "location") && initialItem.name === i.data.location
  );
  let isLoop: boolean = false;
  while (hasOwnProperty(currentItem?.data, "location") && currentItem?.data?.location && !isLoop) {
    isLoop =
      hasOwnProperty(initialItem.data, "location") &&
      initialItem.data.location === currentItem?.name;
    currentItem = physicalItems.find(
      (i) => hasOwnProperty(currentItem?.data, "location") && i.name === currentItem?.data.location
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
    const msg = localize("RQG.Items.Notification.CantFindRootLocationNode");
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

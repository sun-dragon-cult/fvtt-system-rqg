import { emptyPrice, IPhysicalItem } from "../../data-model/item-data/IPhysicalItem";
import { RqgItem } from "../rqgItem";
import { RqgActor } from "../../actors/rqgActor";

export type LocationNode = IPhysicalItem & {
  // For the grouping of physical items in a tree structure
  name: string;
  id: string;
  contains: LocationNode[];
};

export function createItemLocationTree(physicalItems: RqgItem[]): LocationNode {
  let locationTree: LocationNode = {
    name: "",
    id: "",
    description: "",
    gmNotes: "",
    contains: [],
    isContainer: false,
    physicalItemType: "unique",
    location: "",
    attunedTo: "",
    encumbrance: 0,
    equippedStatus: "notCarried",
    price: emptyPrice,
  };
  let physicalItemNodes: LocationNode[] = physicalItems
    .filter((i) => i.type && !i.data.data.isNatural)
    .map((i) => {
      // Placing an item inside itself is not allowed - count it as root level
      let location = i.data.data.location === i.name ? "" : i.data.data.location;
      if (hasLoop(i, physicalItems)) {
        ui.notifications.warn(
          "Circular gear locations (A in B in A) - check your gear locations: " +
            i.data.data.location
        );
        location = "";
      }
      const containingItem = physicalItems.find(
        (p) => i.data.data.location && p.name === i.data.data.location
      );
      if (containingItem && !containingItem.data.data.isContainer) {
        ui.notifications.warn(containingItem.name + " is not a container"); // TODO make a real solution!
        location = "";
      }
      return {
        name: i.name,
        id: i._id,
        location: location,
        description: i.data.data.description,
        gmNotes: i.data.data.gmNotes,
        attunedTo: i.data.data.attunedTo,
        contains: [],
        isContainer: i.data.data.isContainer,
        physicalItemType: i.data.data.physicalItemType,
        encumbrance: i.data.data.encumbrance,
        equippedStatus: i.data.data.equippedStatus,
        quantity: i.data.data.quantity,
        price: i.data.data.price,
      };
    });

  // 1) Add all "virtual" nodes (locations that don't match a item name)
  const itemNames = physicalItems.map((i) => i.name);
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
      physicalItems
    );
  }

  return locationTree;
}

// Find a node matching the location in the node tree
export function searchTree(node: LocationNode, location: string): LocationNode | null {
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

export function hasLoop(initialItem: RqgItem, physicalItems: RqgItem[]): boolean {
  let currentItem = physicalItems.find((i) => initialItem.name === i.data.data.location);
  let isLoop: boolean = false;
  while (currentItem?.data?.data?.location && !isLoop) {
    isLoop = initialItem.data.data.location === currentItem?.name;
    currentItem = physicalItems.find((i) => i.name === currentItem.data.data.location);
  }
  return isLoop;
}

export function getItemIdsInSameLocationTree(item: ItemData, actor: RqgActor): string[] {
  const physicalItems: RqgItem[] = actor.items.filter((i) => i.data.data.physicalItemType);
  const itemLocationTree = createItemLocationTree(physicalItems);
  let rootNode = searchTree(itemLocationTree, item?.name);
  while (rootNode && rootNode.location) {
    rootNode = searchTree(itemLocationTree, rootNode.location);
  }
  let itemIds = getDescendants([], rootNode);
  return itemIds.map((id) => id);
}

export function getDescendants(ids: string[], node: LocationNode): string[] {
  if (node) {
    if (node.id) {
      ids.push(node.id);
    }
    ids.concat(node.contains.flatMap((n) => getDescendants(ids, n)));
  }
  return ids;
}

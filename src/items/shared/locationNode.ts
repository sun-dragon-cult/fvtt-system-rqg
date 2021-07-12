import { emptyPrice, IPhysicalItem } from "../../data-model/item-data/IPhysicalItem";
import { RqgItem } from "../rqgItem";
import { RqgActor } from "../../actors/rqgActor";
import { RqgError } from "../../system/util";
import { RqgItemData } from "../../data-model/item-data/itemTypes";

export type LocationNode = IPhysicalItem & {
  // For the grouping of physical items in a tree structure
  name: string;
  id: string;
  contains: LocationNode[];
};

// TODO fix type. items is really Object (item.data.toObject)
export function createItemLocationTree(items: RqgItem[]): LocationNode {
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
  const physicalItems: RqgItem[] = items.filter((i: Item<any>) => i.data.physicalItemType);

  let physicalItemNodes: LocationNode[] = physicalItems
    // @ts-ignore
    .filter((i) => "physicalItemType" in i.data && !i.data.isNatural)
    .map((i) => {
      // Placing an item inside itself is not allowed - count it as root level
      // @ts-ignore
      let location = i.data.location === i.name ? "" : i.data.location;
      if (hasLoop(i, physicalItems)) {
        ui.notifications?.warn(
          "Circular gear locations (A in B in A) - check your gear locations: " +
            // @ts-ignore
            i.data.data.location
        );
        location = "";
      }
      const containingItem = physicalItems.find(
        // @ts-ignore
        (p) => i.data.location && p.name === i.data.location
      );
      // @ts-ignore
      if (containingItem && !containingItem.data.isContainer) {
        ui.notifications?.warn(containingItem.name + " is not a container"); // TODO make a real solution!
        location = "";
      }
      return {
        name: i.name,
        id: i._id,
        location: location,
        // @ts-ignore
        description: i.data.description,
        // @ts-ignore
        gmNotes: i.data.gmNotes,
        // @ts-ignore
        attunedTo: i.data.attunedTo,
        contains: [],
        // @ts-ignore
        isContainer: i.data.isContainer,
        // @ts-ignore
        physicalItemType: i.data.physicalItemType,
        // @ts-ignore
        encumbrance: i.data.encumbrance,
        // @ts-ignore
        equippedStatus: i.data.equippedStatus,
        // @ts-ignore
        quantity: i.data.quantity || 1,
        // @ts-ignore
        price: i.data.price,
      };
    });

  // 1) Add all "virtual" nodes (locations that don't match an item name)
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

function hasLoop(initialItem: RqgItem, physicalItems: RqgItem[]): boolean {
  // @ts-ignore
  let currentItem = physicalItems.find((i) => initialItem.name === i.data.location);
  let isLoop: boolean = false;
  // @ts-ignore
  while (currentItem?.data?.location && !isLoop) {
    // @ts-ignore
    isLoop = initialItem.data.location === currentItem?.name;
    // @ts-ignore
    currentItem = physicalItems.find((i) => i.name === currentItem.data.location);
  }
  return isLoop;
}

export function getItemIdsInSameLocationTree(item: RqgItemData, actor: RqgActor): string[] {
  // @ts-ignore 0.8
  const itemLocationTree = createItemLocationTree(actor.items.toObject(false));
  let rootNode = searchTree(itemLocationTree, item.name);
  while (rootNode && rootNode.location) {
    rootNode = searchTree(itemLocationTree, rootNode.location);
  }
  if (rootNode == null) {
    const msg = "Couldn't find root location Node";
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

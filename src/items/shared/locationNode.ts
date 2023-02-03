import { defaultPriceData, IPhysicalItem } from "../../data-model/item-data/IPhysicalItem";
import { hasOwnProperty, localize, RqgError } from "../../system/util";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgItem } from "../rqgItem";

export type LocationNode = IPhysicalItem & {
  // For the grouping of physical items in a tree structure
  name: string | null;
  id: string | null;
  contains: LocationNode[];
};

export function createItemLocationTree(items: RqgItem[]): LocationNode {
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
  const physicalItems = items.filter((i) => hasOwnProperty(i.system, "physicalItemType"));
  let physicalItemNodes: LocationNode[] = physicalItems
    .filter((item) => !(item.type === ItemTypeEnum.Weapon && item.system.isNatural))
    .map((item) => {
      const itemLocation =
        (hasOwnProperty(item.system, "location") &&
          ((item.system.location as string) || undefined)) ||
        "";
      // Placing an item inside itself is not allowed - count it as root level
      let location = itemLocation === item.name ? "" : itemLocation;
      if (hasLoop(item, physicalItems)) {
        ui.notifications?.warn(
          localize("RQG.Item.Notification.CircularGearLocationWarning", {
            itemLocation: itemLocation,
          })
        );
        location = "";
      }
      const containingItem = physicalItems.find(
        (p) => item.system.location && p.name === item.system.location
      );
      if (containingItem && !containingItem.system.isContainer) {
        ui.notifications?.warn(
          localize("RQG.Item.Notification.ItemIsNotContainerWarning", {
            itemName: containingItem.name,
          })
        ); // TODO make a real solution!
        location = "";
      }
      return {
        name: item.name,
        id: item.id,
        location: location,
        description: item.system.description,
        gmNotes: item.system.gmNotes,
        attunedTo: item.system.attunedTo,
        contains: [],
        isContainer: item.system.isContainer,
        physicalItemType: item.system.physicalItemType,
        encumbrance: item.system.encumbrance,
        equippedStatus: item.system.equippedStatus,
        quantity: item.system.quantity || 1,
        price: item.system.price,
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
  let currentItem = physicalItems.find(
    (i) => hasOwnProperty(i.system, "location") && initialItem.name === i.system.location
  );
  let isLoop: boolean = false;
  while (
    hasOwnProperty(currentItem?.system, "location") &&
    currentItem?.system?.location &&
    !isLoop
  ) {
    isLoop =
      hasOwnProperty(initialItem.system, "location") &&
      initialItem.system.location === currentItem?.name;
    currentItem = physicalItems.find(
      (i) =>
        hasOwnProperty(currentItem?.system, "location") && i.name === currentItem?.system.location
    );
  }
  return isLoop;
}

export function getOtherItemIdsInSameLocationTree(itemName: string, items: RqgItem[]): string[] {
  const itemLocationTree = createItemLocationTree(items);
  let rootNode = searchTree(itemLocationTree, itemName);
  while (rootNode && rootNode.location) {
    rootNode = searchTree(itemLocationTree, rootNode.location);
  }
  if (rootNode == null) {
    const msg = localize("RQG.Item.Notification.CantFindRootLocationNode");
    ui.notifications?.error(msg);
    throw new RqgError(msg, itemLocationTree);
  }
  const itemIds = getDescendants(rootNode);
  return itemIds.map((id) => id);
}

function getDescendants(node: LocationNode | null, ids: string[] = []): string[] {
  if (node) {
    if (node.id) {
      ids.push(node.id);
    }
    ids.concat(node.contains.flatMap((n) => getDescendants(n, ids)));
  }
  return ids;
}

import { RqgItem } from "../rqgItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { LocationItemNode, LocationItemNodeData } from "./locationItemNode";
import { formatListByUserLanguage, isDefined, localize } from "../../system/util";

export class ItemTree {
  /** Map container name to a list of content names */
  itemGraph = new Map<string, string[]>();

  /** Map item name to item data */
  itemLocationData = new Map<string, LocationItemNode>();

  /** discovered loops (already broken in constructor) */
  loopNodes: string[] = [];

  constructor(items: RqgItem[]) {
    const physicalItems = items.filter(
      (item) =>
        item.system.physicalItemType &&
        !(item.type === ItemTypeEnum.Weapon && item.system.isNatural),
    );

    // Items that only exist because another item has a location that references it
    const virtualItems = this.createVirtualItems(physicalItems);
    this.populateItemGraphAndItemLocationData(virtualItems, physicalItems);
    this.breakLoops();
    this.populateItemLocationDataContains();
  }

  private populateItemGraphAndItemLocationData(
    virtualItems: RqgItem[],
    physicalItems: RqgItem[],
  ): void {
    [...virtualItems, ...physicalItems]
      // Add data to itemGraph & itemLocationData
      .forEach((item) => {
        const containerName = item.system.location ?? "";
        const itemName = item.name ?? "🐛 Item without name";
        // Don't put the items inside themselves
        if (itemName !== containerName) {
          const currentContent = this.itemGraph.get(containerName) ?? [];
          currentContent.push(itemName);
          this.itemGraph.set(containerName, currentContent);
        }
        this.itemLocationData.set(itemName, LocationItemNode.fromItem(item));
      });
  }

  private createVirtualItems(physicalItems: RqgItem[]): RqgItem[] {
    // Root item that everything will be put into
    const virtualRootItem = {
      name: "",
      system: {
        location: "",
        isContainer: true,
      },
    } as RqgItem;

    return [virtualRootItem, ...physicalItems].reduce((acc: RqgItem[], item: RqgItem) => {
      if (!physicalItems.some((physicalItem) => physicalItem.name === item.system.location)) {
        const existingVirtualItem = acc.find((v) => v.name === item.system.location);
        if (existingVirtualItem) {
          return acc;
        }

        const newVirtualItem = {
          name: item.system.location,
          id: `virtual:${item.system.equippedStatus}:${item.system.location}`,
          system: {
            location: "",
            isContainer: true,
            equippedStatus: item.system.equippedStatus,
          },
        } as RqgItem;

        acc.push(newVirtualItem);
      }
      return acc;
    }, []);
  }

  private populateItemLocationDataContains(): void {
    this.itemGraph.forEach((contents, name) => {
      const containerLocation = this.itemLocationData.get(name);
      if (!containerLocation) {
        throw Error("couldn't find container name");
      }
      contents.forEach((contentItemName) => {
        const locData = this.itemLocationData.get(contentItemName);
        if (!locData) {
          throw Error("couldn't find contained name");
        }
        containerLocation.contains.push(locData);
      });
    });
  }

  /**
   * Returns a list of possible item locations. Useful for actorSheet to populate the location field dropdown.
   */
  public getPhysicalItemLocations(): string[] {
    const containers = [...this.itemLocationData.values()]
      .filter((l) => l.isContainer && l.name !== "")
      .map((l) => l.name ?? "");
    return containers;
  }

  /**
   * Return a translated string detailing which item names are part of a loop.
   * If no loop exists return an empty string ("").
   */
  public get loopMessage(): string {
    if (this.loopNodes.length === 0) {
      return "";
    }
    const loopItemString = formatListByUserLanguage(this.loopNodes);
    return localize("RQG.Actor.Gear.LocationLoop", { loopItems: loopItemString });
  }

  /**
   * Return a js object that can be used in the actorSheet for displaying items in items.
   */
  public toSheetData(): LocationItemNodeData {
    const rootNode = this.itemLocationData.get("");
    if (!rootNode) {
      throw Error("No root");
    }
    return rootNode.toObject();
  }

  /**
   * Get a list of ids that are in the same location tree as `itemName`.
   * Does not return virtual node ids.
   * This is useful for document updates.
   * */
  public getOtherItemIdsInSameLocationTree(itemName: string): string[] {
    const nodeIds: string[] = [];
    const container = this.getTopContainerNodeOfItem(itemName);
    if (!container) {
      const itemNameNode = this.itemLocationData.get(itemName);
      if (!itemNameNode?.isContainer) {
        return []; // not in a container and is not a container itself
      } else {
        this.addDescendantNodeIds(nodeIds, itemNameNode);
        return nodeIds;
      }
    }

    this.addDescendantNodeIds(nodeIds, container);

    return nodeIds;
  }

  /**
   * Get a list of ids that are directly in a container (has a location that points to the itemName).
   * This is useful for document updates.
   * */
  public getItemIdsDirectlyInSameContainer(itemName: string): string[] {
    const container = this.itemGraph.get(itemName);
    if (!container) {
      return [];
    }

    return container.map((name) => this.itemLocationData.get(name)?.id).filter(isDefined);
  }

  /**
   * Get a list of ids that are below the same location tree as `itemName`.
   * Does not return virtual node ids.
   * This is useful for document updates.
   * */
  public getItemIdsBelowNode(itemName: string): string[] {
    const nodeIds: string[] = [];
    const itemNode = this.itemLocationData.get(itemName);
    if (itemNode?.isContainer) {
      this.addDescendantNodeIds(nodeIds, itemNode);
      return nodeIds;
    } else {
      return [];
    }
  }

  /**
   * Check if any loops exist in the tree (graph).
   * Has the side effects of populating a string with item names of the loop that later can be
   * fetched with {@link loopMessage}. Also modifies the itemGraph to remove the loop
   */
  private breakLoops(): void {
    const loopNodes = this.findLoop();
    if (loopNodes.size) {
      this.loopNodes = [...loopNodes]; // Store the affected nodes
      // Break loop to make the graph a tree
      const loopNodeName1 = [...loopNodes][0];
      // const loopNodeName2 = [...loopNodes][1]; // Has to be at least 2 nodes to make a loop
      const loopNodeItemGraph = this.itemGraph.get(loopNodeName1);
      const removedLoop = loopNodeItemGraph?.filter((n) => !loopNodes.has(n)) ?? [];
      this.itemGraph.set(loopNodeName1, removedLoop);
    }
  }

  private addDescendantNodeIds(acc: string[], node: LocationItemNodeData): void {
    if (node.id && !node.id.startsWith("virtual:")) {
      acc.push(node.id);
    }
    node.contains.forEach((n) => this.addDescendantNodeIds(acc, n));
  }

  /**
   * Return the immediate parent of the itemName or undefined if the item does not have any parent.
   */
  public getContainerNodeOfItem(itemName: string): LocationItemNodeData | undefined {
    const container = [...this.itemLocationData.values()].find((l) =>
      l.contains.some((c) => c.name === itemName),
    );
    if (!container || container.name === "") {
      return undefined;
    } else {
      return container;
    }
  }

  /**
   * Return the top parent of the itemName or undefined if the item does not have any parent.
   */
  public getTopContainerNodeOfItem(itemName: string): LocationItemNodeData | undefined {
    let container = this.getContainerNodeOfItem(itemName);
    if (!container) {
      return undefined;
    }

    while (true) {
      const maybeContainer = this.getContainerNodeOfItem(container.name ?? "");
      if (!maybeContainer || maybeContainer.name === "") {
        break;
      }
      container = maybeContainer;
    }
    return container;
  }

  /**
   * Return a Set of nodes in the loop, or an empty Set if there are no loops
   */
  private findLoop(): Set<string> {
    const allContainerNodes = new Set<string>();

    const unprocessed = new Set<string>();
    const processing = new Set<string>();
    const processed = new Set<string>();

    //Initially put all vertices in the unprocessed set
    this.itemGraph.forEach((name, key) => {
      unprocessed.add(key);
      allContainerNodes.add(key);
    });

    const loopNodeNames = new Set<string>();

    // traverse only unprocessed vertices
    for (const containerName of allContainerNodes) {
      if (
        unprocessed.has(containerName) &&
        this.isCycleUtil(containerName, unprocessed, processing, processed, loopNodeNames)
      ) {
        return loopNodeNames;
      }
    }
    return loopNodeNames;
  }

  /**
   * Uses the black, white, gray algorithm to find cycles.
   * Has sideeffects on:
   *  - loopNodeNames - adds node names in the cycle
   *  - unprocessed, processing & processed - keeps track of "white", "gray" & "black"
   */
  private isCycleUtil(
    nodeName: string,
    unprocessed: Set<string>,
    processing: Set<string>,
    processed: Set<string>,
    loopNodeNames: Set<string>,
  ): boolean {
    //visiting this node, move it to "processing" from "unprocessed"
    unprocessed.delete(nodeName);
    processing.add(nodeName);

    // visit neighbors
    const nodeContents = this.itemGraph.get(nodeName) ?? [];
    for (let i = 0; i < nodeContents.length; i++) {
      const adjVertex = nodeContents[i];

      //check if this node is present in "processing" set, means cycle is found
      if (processing.has(adjVertex)) {
        loopNodeNames.add(adjVertex);
        return true;
      }

      //check if this node is present in "processed" set, means this vertex is already done
      if (processed.has(adjVertex)) {
        continue;
      }

      //do traversal from this vertex
      if (this.isCycleUtil(adjVertex, unprocessed, processing, processed, loopNodeNames)) {
        loopNodeNames.add(adjVertex);
        return true;
      }
    }
    // if here means cycle is not found from this vertex, make it processed from processing
    processing.delete(nodeName);
    processed.add(nodeName);
    return false;
  }
}

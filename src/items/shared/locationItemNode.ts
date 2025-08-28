import {
  defaultPriceData,
  type EquippedStatus,
  type IPhysicalItem,
  type PhysicalItemType,
} from "@item-model/IPhysicalItem.ts";
import { RqgItem } from "../rqgItem";

export interface LocationItemNodeData extends IPhysicalItem {
  name: string | null;
  id: string | null;
  contains: LocationItemNodeData[];
  isVirtual: boolean;
}

/** For the grouping of physical items in a tree structure. */
export class LocationItemNode implements LocationItemNodeData {
  isVirtual: boolean;

  constructor(
    public name: string | null = null,
    public id: string | null = null,
    public contains: LocationItemNode[] = [],
    public physicalItemType: PhysicalItemType = "unique",
    public quantity: number = 1,
    public description: string = "",
    public gmNotes: string = "",
    public location: string = "",
    public isContainer: boolean = true,
    public attunedTo: string = "",
    public encumbrance: number = 0,
    public equippedStatus: EquippedStatus = "notCarried",
    public price = defaultPriceData,
  ) {
    this.isVirtual = !!this.id?.startsWith("virtual:");
  }

  /**
   * Convert an item to a LocationTree or produce an empty locationTree if no input.
   */
  public static fromItem(item: RqgItem): LocationItemNode {
    return new LocationItemNode(
      item.name,
      item.id,
      [],
      item.system.physicalItemType,
      item.system.quantity,
      item.system.description,
      item.system.gmNotes,
      item.system.location,
      item.system.isContainer,
      item.system.attunedTo,
      item.system.encumbrance,
      item.system.equippedStatus,
      item.system.price,
    );
  }

  /**
   * Create a plain js object of this locationItemNode.
   */
  public toObject(): LocationItemNodeData {
    const properties = Object.assign({}, this);
    properties.isVirtual = this.isVirtual;
    return properties;
  }
}

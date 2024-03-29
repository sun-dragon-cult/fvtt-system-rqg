import { RqgItem } from "src/items/rqgItem";

// Mock contains derived values
export const mockItemsWithVirtualNode = [
  {
    _id: "zvhAF1QDmmbQl505",
    id: "zvhAF1QDmmbQl505",
    name: "A",
    type: "gear",
    sort: 11800000,
    img: "icons/containers/bags/pack-leather-white-tan.webp",
    effects: [],
    folder: null,
    system: {
      description: "",
      gmNotes: "",
      quantity: 1,
      price: {
        real: 1,
        estimated: 0,
      },
      encumbrance: 1,
      equippedStatus: "notCarried",
      location: "virtual",
      isContainer: true,
      attunedTo: "",
      physicalItemType: "unique",
    },
    ownership: {
      default: 0,
    },
  },
  {
    _id: "Ed3u5sauDqkPgczI",
    id: "Ed3u5sauDqkPgczI",
    name: "B",
    type: "gear",
    sort: 11800000,
    img: "icons/containers/bags/pack-leather-white-tan.webp",
    effects: [],
    folder: null,
    system: {
      description: "",
      gmNotes: "",
      quantity: 1,
      price: {
        real: 1,
        estimated: 0,
      },
      encumbrance: 1,
      equippedStatus: "notCarried",
      location: "virtual",
      isContainer: true,
      attunedTo: "",
      physicalItemType: "unique",
    },
    ownership: {
      default: 0,
    },
  },
  {
    _id: "h4aMb5lGfZ9H7j7W",
    id: "h4aMb5lGfZ9H7j7W",
    name: "C",
    type: "gear",
    sort: 11800000,
    img: "icons/containers/bags/pack-leather-white-tan.webp",
    effects: [],
    folder: null,
    system: {
      description: "",
      gmNotes: "",
      quantity: 1,
      price: {
        real: 1,
        estimated: 0,
      },
      encumbrance: 1,
      equippedStatus: "carried",
      location: "",
      isContainer: true,
      attunedTo: "",
      physicalItemType: "unique",
    },
    ownership: {
      default: 0,
    },
  },
  {
    _id: "7bM8wF6iOi99JLpJ",
    id: "7bM8wF6iOi99JLpJ",
    name: "D",
    type: "gear",
    sort: 11800000,
    img: "icons/containers/bags/pack-leather-white-tan.webp",
    effects: [],
    folder: null,
    system: {
      description: "",
      gmNotes: "",
      quantity: 1,
      price: {
        real: 1,
        estimated: 0,
      },
      encumbrance: 1,
      equippedStatus: "carried",
      location: "C",
      isContainer: true,
      attunedTo: "",
      physicalItemType: "unique",
    },
    ownership: {
      default: 0,
    },
  },
] as unknown as RqgItem[];

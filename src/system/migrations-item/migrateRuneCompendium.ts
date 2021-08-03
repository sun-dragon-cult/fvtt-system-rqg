import { ItemTypeEnum, RqgItemData } from "../../data-model/item-data/itemTypes";

// Migrate rune img url to new compendium
export function migrateRuneImgLocation(itemData: RqgItemData): any {
  let updateData = {};
  if (
    itemData.type === ItemTypeEnum.Rune &&
    itemData.img.includes("modules/rqg-compendiums/assets/runes/")
  ) {
    const newUrl =
      "modules/rqg-core/assets/runes/" +
      itemData.img.split("modules/rqg-compendiums/assets/runes/")[1];
    updateData = {
      img: newUrl,
    };
  }
  return updateData;
}

// Migrate rune descriptions to new compendium
export function migrateRuneDescription(itemData: RqgItemData): any {
  let updateData = {};
  if (
    itemData.type === ItemTypeEnum.Rune &&
    !itemData.data.journalPack.includes("rqg-core.rune-descriptions")
  ) {
    if (runeDescription[itemData.name]) {
      updateData = {
        data: {
          journalId: runeDescription[itemData.name].journalId,
          journalPack: runeDescription[itemData.name].journalPack,
        },
      };
    }
  }
  return updateData;
}

const runeDescription: any = {
  "Air (element)": {
    journalId: "l6On1MA7MnW7qWrA",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Water (element)": {
    journalId: "j93VzaD9qOZILORZ",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Darkness (element)": {
    journalId: "a0vmiA1kUR98lb50",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Fire (element)": {
    journalId: "BIEK7wfJsaXm9Zmq",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Moon (element)": {
    journalId: "LMZp22OStRRxL93Z",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Earth (element)": {
    journalId: "CLkwxZ9y7j9VX00v",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Law (condition)": {
    journalId: "2Wl6rzY5f5myk8W6",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Magic (condition)": {
    journalId: "UgDSldMq035lVqwR",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Infinity (condition)": {
    journalId: "eefIf11AEJgk13pD",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Luck (condition)": {
    journalId: "OjpMkpX21Qa0qKGN",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Fate (condition)": {
    journalId: "Gsl5fSY7vMvW9p4a",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Beast (form)": {
    journalId: "twWC6a757e2jSQpB",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Chaos (form)": {
    journalId: "Z0LqQPc2Gvv5jJ8G",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Plant (form)": {
    journalId: "I10Ugj9qY3vl27e5",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Spirit (form)": {
    journalId: "zDF14GWcThdD6TMC",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Dragonnewt (form)": {
    journalId: "5w2C65OLBhN66E8j",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Man (form)": {
    journalId: "Y5rHARO63TIb6K7C",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Movement (power)": {
    journalId: "n7w04Ejk7K5WxZVu",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Harmony (power)": {
    journalId: "aDRLDO48F826i6vr",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Fertility (power)": {
    journalId: "Vnkl9a3Wlh3hCnXV",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Truth (power)": {
    journalId: "65WD7NrMeQbd60XS",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Stasis (power)": {
    journalId: "k9aDS2B4r4Kw4jy6",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Illusion (power)": {
    journalId: "5IjM967nFDMlwidI",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Death (power)": {
    journalId: "u1eUcT63yjYZG103",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Disorder (power)": {
    journalId: "wRsskyTp7uZxvJJg",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Combine (technique)": {
    journalId: "5Efm1mCbg178godF",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Tap (technique)": {
    journalId: "WQxNLQ3Hs6hoj91D",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Dispel (technique)": {
    journalId: "sZoKKkZs0LzrQQo2",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Separate (technique)": {
    journalId: "NWgJo2ogTE38Xm3U",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Summon (technique)": {
    journalId: "UVUjCIghlt2p8baD",
    journalPack: "rqg-core.rune-descriptions",
  },
  "Command (technique)": {
    journalId: "1z88e2QndcBTfzBC",
    journalPack: "rqg-core.rune-descriptions",
  },
};

import { type Characteristics } from "./characteristics";
import { type Background } from "./background";
import { Attributes } from "./attributes";

interface CharacterDataSource {
  type: "character";
  data: CharacterDataSourceData;
}

interface CharacterDataSourceData {
  characteristics: Characteristics;
  background: Background;
  allies: string; // Editor text with links to allies and general notes
  editMode: boolean;
  extendedName: string;
  // --- Derived / Convenience Data Below ---
  attributes: Attributes; // Most are derived // TODO Split / move data?
}

export type ActorsDataSource = CharacterDataSource;

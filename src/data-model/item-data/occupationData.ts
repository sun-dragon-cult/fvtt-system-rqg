import { RqidLink } from "../shared/rqidLink";
import { ItemTypeEnum } from "./itemTypes";
import type { RqgItem } from "@items/rqgItem.ts";

export type OccupationItem = RqgItem & { system: OccupationDataPropertiesData };

export const StandardOfLivingEnum = {
  Destitute: "destitute",
  Poor: "poor",
  Free: "free",
  Noble: "noble",
  PettyKing: "petty-king",
} as const;
export type StandardOfLivingEnum = (typeof StandardOfLivingEnum)[keyof typeof StandardOfLivingEnum];

export class OccupationalSkill {
  incomeSkill: boolean = false;
  bonus: number = 0;
  skillRqidLink: RqidLink | undefined = undefined;
}

export interface OccupationDataSourceData {
  occupation: string;
  occupationRqidLink: RqidLink | undefined;
  specialization: string;
  homelands: string[]; // The user can drop Homeland items on here but it will just save the data.homeland in this string array
  occupationalSkills: OccupationalSkill[];
  standardOfLiving: StandardOfLivingEnum;
  baseIncome: number;
  baseIncomeNotes: string;
  cultRqidLinks: RqidLink[];
  ransom: number;
  startingEquipmentRqidLinks: RqidLink[];
}

// --- Derived Data ---
export interface OccupationDataPropertiesData extends OccupationDataSourceData {}

export interface OccupationDataSource {
  type: typeof ItemTypeEnum.Occupation;
  system: OccupationDataSourceData;
}

export interface OccupationDataProperties {
  type: typeof ItemTypeEnum.Occupation;
  system: OccupationDataSourceData;
}

// export const defaultOccupationData: OccupationDataSourceData = {
//   occupation: "",
//   occupationRqidLink: undefined,
//   specialization: "",
//   homelands: [],
//   occupationalSkills: [],
//   standardOfLiving: StandardOfLivingEnum.Free,
//   baseIncome: 0,
//   baseIncomeNotes: "",
//   cultRqidLinks: [],
//   ransom: 0,
//   startingEquipmentRqidLinks: [],
// };

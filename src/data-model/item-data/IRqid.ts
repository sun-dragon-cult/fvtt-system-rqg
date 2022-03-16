export interface IRqgItem {
  rqid: string;
  rqidPriority: number;
  rqidLang: string;
}

// These can't really be made into settings because they'll 
// be used at compile time to create the template.json
export const DEFAULT_RQIDPRIORITY = 999999;
export const DEFAULT_RQIDLANG = "en"
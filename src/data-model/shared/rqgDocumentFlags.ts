export const documentRqidFlags = "documentRqidFlags" as const;
export const actorWizardFlags = "actorWizardFlags" as const;

export interface RqgItemFlags {
  [documentRqidFlags]: DocumentRqidFlags;
}

export interface RqgJournalEntryFlags {
  [documentRqidFlags]: DocumentRqidFlags;
}

export interface RqgRollTableFlags {
  [documentRqidFlags]: DocumentRqidFlags;
}

export interface RqgActorFlags {
  [documentRqidFlags]?: DocumentRqidFlags;
  [actorWizardFlags]?: {
    actorWizardComplete?: boolean;
    selectedSpeciesUuid?: string;
    selectedHomelandRqid?: string;
    isActorTemplate?: boolean;
    wizardChoices?: string;
  };
}

export interface DocumentRqidFlags {
  /** Defines what the document is. Example "i.skill.ride-bison" */
  /**
   * Defines the identity of a document (item, journal entry, ...).
   * The id is not unique, instead it is used to identify what the document is. It is made up of three parts
   * separated with a dot (.)
   * First parts is document type abbreviation {@link RQG_CONFIG} see rqid.prefixes
   * Second part is type inside the document, for example cult or skill. This can be empty for documents that
   * do not have types
   * Third part is the sluggified id given to the document.
   * Example `i.skill.ride-bison`or `je..rune-descriptions-air`
   */
  id?: string;
  /** Defines what language the document is written in. Example "en", "pl" */
  lang?: string;
  /** Defines how this rqid should be ranked compared to others with the same id. Higher number wins. */
  priority?: number;
}

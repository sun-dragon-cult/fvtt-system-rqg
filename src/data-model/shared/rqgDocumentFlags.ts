export const documentRqidFlags = "documentRqidFlags";
export const actorWizardFlags = "actorWizardFlags";

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
    selectedSpeciesId?: string;
    selectedHomelandRqid?: string;
    isActorTemplate?: boolean;
    wizardChoices?: string;
  };
}

/**
 * Data that defines the identity of a document (item, journal entry, ...).
 * The id is not unique, instead it is used to identify what the document is.
 * This
 */
export interface DocumentRqidFlags {
  /** Defines what the document is. Example "i.skill.ride" */
  id?: string;
  /** Defines what language the document is written in. Example "en", "pl" */
  lang?: string;
  /** Defines how this rqid should be ranked compared to others with the same id. Higher number wins. */
  priority?: number;
}

import Document = foundry.abstract.Document;

/**
 * Base DataModel class for all RQG item types.
 * Extend this instead of `foundry.abstract.TypeDataModel` directly.
 */
export abstract class RqgItemDataModel<
  Schema extends foundry.data.fields.DataSchema,
  DerivedData extends Record<string, unknown> = Record<string, never>,
> extends foundry.abstract.TypeDataModel<
  Schema,
  Document.Any,
  Record<string, never>,
  DerivedData
> {}

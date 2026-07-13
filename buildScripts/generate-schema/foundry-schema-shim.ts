/**
 * Minimal runtime shim for `foundry.data.fields` (and the handful of other Foundry
 * globals referenced at *import time* by the Item/Actor DataModel source files).
 *
 * This is intentionally **not** the same mock as `test/setup/foundryMockFunctions.js`
 * (which exists for unit tests and, for historical reasons, does not preserve the
 * real Foundry property names for nested fields — e.g. it stores `SchemaField`
 * children under `.schema` instead of `.fields`, and never records `ArrayField`'s
 * element field at all). Schema generation needs faithful field trees, so this shim
 * mirrors the real `foundry.data.fields.*` API surface that production code already
 * depends on (see `field.fields` / `field.element` usage in
 * `src/data-model/item-data/rqg-item-data-model.ts`).
 *
 * `installFoundrySchemaShim()` must run before any DataModel module is imported,
 * since several `defineSchema()` implementations destructure
 * `const { StringField, ... } = foundry.data.fields` at module top-level.
 */

class BaseFieldShim {
  readonly options: Record<string, unknown>;

  constructor(options: Record<string, unknown> = {}) {
    this.options = options;
  }
}

export class StringFieldShim extends BaseFieldShim {}
export class NumberFieldShim extends BaseFieldShim {}
export class BooleanFieldShim extends BaseFieldShim {}
export class ObjectFieldShim extends BaseFieldShim {}
export class DocumentUUIDFieldShim extends BaseFieldShim {}

export class ArrayFieldShim extends BaseFieldShim {
  readonly element: unknown;

  constructor(element: unknown, options: Record<string, unknown> = {}) {
    super(options);
    this.element = element;
  }
}

export class SchemaFieldShim extends BaseFieldShim {
  readonly fields: Record<string, unknown>;

  constructor(fields: Record<string, unknown>, options: Record<string, unknown> = {}) {
    super(options);
    this.fields = fields;
  }
}

/** Stand-in for `foundry.dice.Roll`, only needed as a base class for `AbilityRoll`. */
class RollShim {}

/** Stand-in for `foundry.abstract.TypeDataModel`, only needed as a base class. */
class TypeDataModelShim {
  static defineSchema(): Record<string, unknown> {
    return {};
  }

  static migrateData(source: unknown): unknown {
    return source;
  }
}

/**
 * Installs the schema-generation shim onto `globalThis.foundry`.
 * Call this once, before dynamically importing any DataModel module.
 */
export function installFoundrySchemaShim(): void {
  (globalThis as Record<string, unknown>)["foundry"] = {
    data: {
      fields: {
        StringField: StringFieldShim,
        NumberField: NumberFieldShim,
        BooleanField: BooleanFieldShim,
        ObjectField: ObjectFieldShim,
        DocumentUUIDField: DocumentUUIDFieldShim,
        ArrayField: ArrayFieldShim,
        SchemaField: SchemaFieldShim,
      },
    },
    abstract: {
      TypeDataModel: TypeDataModelShim,
    },
    documents: {},
    dice: {
      Roll: RollShim,
    },
    utils: {
      mergeObject: (a: unknown) => a,
      getProperty: () => undefined,
      setProperty: () => {},
      getType: () => "",
    },
  };
}

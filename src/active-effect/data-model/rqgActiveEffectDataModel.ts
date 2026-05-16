const { BooleanField } = foundry.data.fields;

type ActiveEffectTypeDataModelConstructor = {
  new (
    ...args: unknown[]
  ): foundry.abstract.TypeDataModel<
    foundry.data.fields.DataSchema,
    ActiveEffect.Implementation,
    Record<string, never>,
    Record<string, never>
  >;
  defineSchema: () => foundry.data.fields.DataSchema;
};

const ActiveEffectTypeDataModelBase =
  ((foundry.data as Record<string, unknown>)["ActiveEffectTypeDataModel"] as
    | ActiveEffectTypeDataModelConstructor
    | undefined) ??
  (foundry.abstract.TypeDataModel as unknown as ActiveEffectTypeDataModelConstructor);

function rqgActiveEffectSchemaFields() {
  return {
    matchSuspensionToEquippedStatus: new BooleanField({ initial: false }),
  } as const;
}

type RqgActiveEffectSchemaFields = ReturnType<typeof rqgActiveEffectSchemaFields>;

export class RqgActiveEffectDataModel extends ActiveEffectTypeDataModelBase {
  static override defineSchema(): foundry.data.fields.DataSchema {
    return {
      ...super.defineSchema(),
      ...rqgActiveEffectSchemaFields(),
    };
  }

  // Declared for type-safe access on effect.system.
  declare matchSuspensionToEquippedStatus: foundry.data.fields.SchemaField.InnerAssignmentType<RqgActiveEffectSchemaFields>["matchSuspensionToEquippedStatus"];
}

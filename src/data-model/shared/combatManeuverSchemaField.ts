type StringFieldOptions = ConstructorParameters<typeof foundry.data.fields.StringField>[0];

export interface CombatManeuverSchemaOptions {
  name: StringFieldOptions;
  damageType: StringFieldOptions;
  description: StringFieldOptions;
}

export function combatManeuverSchemaField(options: CombatManeuverSchemaOptions) {
  const { SchemaField, StringField } = foundry.data.fields;

  return new SchemaField({
    name: new StringField(options.name),
    damageType: new StringField(options.damageType),
    description: new StringField(options.description),
  });
}

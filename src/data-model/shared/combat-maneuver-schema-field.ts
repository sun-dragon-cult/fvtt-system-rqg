type StringFieldOptions = ConstructorParameters<typeof foundry.data.fields.StringField>[0];

export interface CombatManeuverSchemaOptions {
  name: StringFieldOptions;
  damageType: StringFieldOptions;
  description: StringFieldOptions;
}

function combatManeuverSchemaField(options: CombatManeuverSchemaOptions) {
  const { SchemaField, StringField } = foundry.data.fields;

  return new SchemaField({
    name: new StringField(options.name),
    damageType: new StringField(options.damageType),
    description: new StringField(options.description),
  });
}

export function weaponCombatManeuverSchemaField(options: CombatManeuverSchemaOptions) {
  return combatManeuverSchemaField(options);
}

export function chatCombatManeuverSchemaField(options: CombatManeuverSchemaOptions) {
  return combatManeuverSchemaField(options);
}

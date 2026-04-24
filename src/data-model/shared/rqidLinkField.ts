const { NumberField, SchemaField, StringField } = foundry.data.fields;
import { isValidRqidString } from "../../system/api/rqidValidation";

/**
 * Returns a SchemaField representing a single RqidLink (rqid + name + optional bonus).
 * Use this for fields like `descriptionRqidLink`.
 */
export function rqidLinkSchemaField(
  options: { nullable: boolean; initial?: undefined } = { nullable: true },
) {
  return new SchemaField(
    {
      rqid: new StringField({
        blank: true,
        nullable: false,
        initial: "",
        validate: (value: string) => isValidRqidString(value, { allowEmpty: true }),
      }),
      name: new StringField({ blank: true, nullable: false, initial: "" }),
      bonus: new NumberField({ integer: true, nullable: true, initial: undefined }),
    },
    { nullable: options.nullable, initial: options.initial },
  );
}

/**
 * Returns an ArrayField of RqidLink SchemaFields.
 * Use this for fields like `runeRqidLinks`, `commonRuneMagicRqidLinks`, etc.
 */
export function rqidLinkArraySchemaField() {
  const { ArrayField } = foundry.data.fields;
  return new ArrayField(rqidLinkSchemaField({ nullable: false }));
}

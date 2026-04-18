import { RqgActorDataModel } from "./RqgActorDataModel";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqidLinkField";
import { resourceSchemaField } from "../shared/resourceSchemaField";
import { actorHealthStatuses, LocomotionEnum } from "./attributes";

const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

function characteristicSchemaField(formula: string) {
  return new SchemaField({
    value: new NumberField({ integer: true, nullable: true, initial: 0 }),
    formula: new StringField({ blank: true, nullable: true, initial: formula }),
    hasExperience: new BooleanField({ nullable: true, initial: undefined }),
  });
}

function locomotionSchemaField(
  initialValue: number | undefined,
  initialCarrying: number | undefined,
) {
  return new SchemaField({
    value: new NumberField({ nullable: true, initial: initialValue }),
    carryingFactor: new NumberField({ nullable: true, initial: initialCarrying }),
  });
}

type CharacterSchema = ReturnType<typeof CharacterDataModel.defineSchema>;

export class CharacterDataModel extends RqgActorDataModel<CharacterSchema> {
  static override defineSchema() {
    return {
      characteristics: new SchemaField({
        strength: characteristicSchemaField("3d6"),
        constitution: characteristicSchemaField("3d6"),
        size: characteristicSchemaField("2d6+6"),
        dexterity: characteristicSchemaField("3d6"),
        intelligence: characteristicSchemaField("2d6+6"),
        power: characteristicSchemaField("3d6"),
        charisma: characteristicSchemaField("3d6"),
      }),

      background: new SchemaField({
        species: new StringField({ blank: true, nullable: false, initial: "Human" }),
        speciesRqidLink: rqidLinkSchemaField({ nullable: true }),
        occupation: new StringField({ blank: true, nullable: false, initial: "" }),
        currentOccupationRqidLink: rqidLinkSchemaField({ nullable: true }),
        homeland: new StringField({ blank: true, nullable: true, initial: undefined }),
        town: new StringField({ blank: true, nullable: true, initial: undefined }),
        birthYear: new NumberField({ nullable: true, initial: undefined }),
        age: new NumberField({ nullable: true, initial: undefined }),
        gender: new StringField({ blank: true, nullable: true, initial: undefined }),
        tribe: new StringField({ blank: true, nullable: true, initial: undefined }),
        clan: new StringField({ blank: true, nullable: true, initial: undefined }),
        reputation: new NumberField({ nullable: true, initial: undefined }),
        standardOfLiving: new StringField({ blank: true, nullable: true, initial: undefined }),
        ransom: new NumberField({ nullable: true, initial: undefined }),
        ransomDetails: new StringField({ blank: true, nullable: true, initial: undefined }),
        baseIncome: new NumberField({ nullable: true, initial: undefined }),
        biography: new StringField({ blank: true, nullable: true, initial: undefined }),
        homelandJournalRqidLink: rqidLinkSchemaField({ nullable: true }),
        regionJournalRqidLink: rqidLinkSchemaField({ nullable: true }),
        cultureJournalRqidLinks: rqidLinkArraySchemaField(),
        tribeJournalRqidLinks: rqidLinkArraySchemaField(),
        clanJournalRqidLinks: rqidLinkArraySchemaField(),
      }),

      allies: new StringField({ blank: true, nullable: false, initial: "" }),
      editMode: new BooleanField({ nullable: false, initial: true }),
      extendedName: new StringField({ blank: true, nullable: false, initial: "" }),

      attributes: new SchemaField({
        magicPoints: resourceSchemaField(),
        hitPoints: resourceSchemaField(),
        move: new SchemaField({
          currentLocomotion: new StringField({
            blank: false,
            nullable: false,
            initial: LocomotionEnum.Walk,
            choices: Object.fromEntries(
              Object.values(LocomotionEnum).map((v) => [v, `RQG.Actor.Attributes.MoveMode.${v}`]),
            ),
          }),
          [LocomotionEnum.Walk]: locomotionSchemaField(8, 1),
          [LocomotionEnum.Swim]: locomotionSchemaField(2, 0.5),
          [LocomotionEnum.Fly]: locomotionSchemaField(undefined, undefined),
        }),
        heroPoints: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
        isCreature: new BooleanField({ nullable: false, initial: false }),
        health: new StringField({
          blank: false,
          nullable: false,
          initial: "healthy",
          choices: Object.fromEntries(
            [...actorHealthStatuses].map((v) => [v, `RQG.Actor.Attributes.Health.${v}`]),
          ),
        }),
      }),
    } as const;
  }
}

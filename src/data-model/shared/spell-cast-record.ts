import { spellEffectSettledReasons } from "../../active-effect/data-model/spell-effect.defs";
import {
  SpellResistedByEnum,
  SpellResistedWithEnum,
  SpellTargetKindEnum,
  isSpiritCombatGate,
} from "../item-data/spell";
import {
  spellTargetOutcomeResolvedBy,
  spellTargetOutcomeState,
  type SpellTargetOutcomeResolvedBy,
  type SpellTargetOutcomeState,
} from "./spell-cast-outcome.defs";

const { ArrayField, BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * Where a target of a cast has got to (#1224). `targeted`, `resistance` and `affected` can wait for
 * input; the others are passed through at once.
 */
export const spellCastStages = [
  "targeted",
  "crossing",
  "barriers",
  "resistance",
  "resisted",
  "affected",
  "applied",
  "settled",
] as const;
export type SpellCastStage = (typeof spellCastStages)[number];

/** One target of a cast: an actor, with the token it was targeted on if it has one. */
export type SpellCastEntry = {
  id: string;
  /** "" for an untargeted entry waiting for the GM to assign actors. */
  actorUuid: string;
  /** "" when the target has no token. */
  tokenUuid: string;
  isCaster: boolean;
  stage: SpellCastStage;
  state: SpellTargetOutcomeState;
  resolvedBy: SpellTargetOutcomeResolvedBy | null;
  /** The caster's success level on the roll that decided this target, as in SpellTargetOutcome. */
  casterSuccessLevel: number | null;
  effectUuids: string[];
  effectBlockedReason: string;
  /** The entry whose target sent the spell back at its caster; "" when not reflected. */
  reflectedFromId: string;
  /** The resistance request card this target answers on; "" while it has none. */
  requestMessageId: string;
};

/**
 * Everything about one cast and how far each target has got - on the `spellCast` card, or on the
 * combined card of an open single-target cast. One runner on the active GM's client advances it.
 */
export type SpellCastRecord = {
  spellUuid: string;
  casterActorUuid: string;
  casterTokenUuid: string;
  /** The caster's POW when they cast it, which a reflected spell attacks them with. */
  casterPower: number;
  castSuccessLevel: number | null;
  resistedBy: SpellResistedByEnum;
  resistedWith: SpellResistedWithEnum;
  /** The cast's roll mode; a hidden one's requests name neither the caster nor the spell. */
  castRollMode: string;
  castOptions: { levelUsed: number; magicPointBoost: number };
  /** The caster's one d100 for a spell resisted by area. */
  areaRoll: { roll: number; casterValue: number } | null;
  targets: SpellCastEntry[];
};

/** The record's fields, shared by the `spellCast` and `resistanceRequest` message models. */
export function spellCastRecordFields() {
  return {
    casterActorUuid: new StringField({ blank: true, nullable: false, initial: "" }),
    casterTokenUuid: new StringField({ blank: true, nullable: false, initial: "" }),
    casterPower: new NumberField({ nullable: false, initial: 0 }),
    castSuccessLevel: new NumberField({ integer: true, nullable: true, initial: null }),
    resistedBy: new StringField({
      blank: false,
      nullable: false,
      initial: SpellResistedByEnum.None,
      choices: Object.values(SpellResistedByEnum),
    }),
    resistedWith: new StringField({
      blank: false,
      nullable: false,
      initial: SpellResistedWithEnum.Power,
      choices: Object.values(SpellResistedWithEnum),
    }),
    castRollMode: new StringField({ blank: true, nullable: false, initial: "public" }),
    castOptions: new SchemaField({
      levelUsed: new NumberField({ nullable: false, initial: 0 }),
      magicPointBoost: new NumberField({ nullable: false, initial: 0 }),
    }),
    areaRoll: new SchemaField(
      {
        roll: new NumberField({ nullable: false, initial: 100 }),
        casterValue: new NumberField({ nullable: false, initial: 0 }),
      },
      { nullable: true, initial: null },
    ),
    targets: new ArrayField(
      new SchemaField({
        id: new StringField({ blank: false, nullable: false, required: true }),
        actorUuid: new StringField({ blank: true, nullable: false, initial: "" }),
        tokenUuid: new StringField({ blank: true, nullable: false, initial: "" }),
        isCaster: new BooleanField({ nullable: false, initial: false }),
        stage: new StringField({
          blank: false,
          nullable: false,
          initial: spellCastStages[0],
          choices: [...spellCastStages],
        }),
        state: new StringField({
          blank: false,
          nullable: false,
          initial: spellTargetOutcomeState[0],
          choices: [...spellTargetOutcomeState],
        }),
        resolvedBy: new StringField({
          blank: false,
          nullable: true,
          initial: null,
          choices: [...spellTargetOutcomeResolvedBy],
        }),
        casterSuccessLevel: new NumberField({ integer: true, nullable: true, initial: null }),
        effectUuids: new ArrayField(new StringField({ blank: false, nullable: false })),
        effectBlockedReason: new StringField({
          blank: true,
          nullable: false,
          initial: "",
          choices: ["", ...spellEffectSettledReasons],
        }),
        reflectedFromId: new StringField({ blank: true, nullable: false, initial: "" }),
        requestMessageId: new StringField({ blank: true, nullable: false, initial: "" }),
      }),
    ),
  };
}

/** The uuid to look the target up by: its token if it has one, else its actor. */
export function entryTargetUuid(entry: Pick<SpellCastEntry, "actorUuid" | "tokenUuid">): string {
  return entry.tokenUuid || entry.actorUuid;
}

export function newSpellCastEntry(
  id: string,
  target: Pick<SpellCastEntry, "actorUuid" | "tokenUuid" | "isCaster">,
): SpellCastEntry {
  return {
    id: id,
    actorUuid: target.actorUuid,
    tokenUuid: target.tokenUuid,
    isCaster: target.isCaster,
    stage: "targeted",
    state: "pending",
    resolvedBy: null,
    casterSuccessLevel: null,
    effectUuids: [],
    effectBlockedReason: "",
    reflectedFromId: "",
    requestMessageId: "",
  };
}

/** A token or actor the spell was cast at. */
export type SpellCastTarget = Pick<SpellCastEntry, "actorUuid" | "tokenUuid" | "isCaster">;

/** Spells cast with no target that can only mean the caster or the caster's weapon. */
const casterTargetKinds: readonly string[] = [SpellTargetKindEnum.Self, SpellTargetKindEnum.Weapon];

/**
 * The entries a cast starts with. With nothing targeted, an unresisted spell, or one that can only
 * go on its caster (`targetKind` self or weapon), goes on the caster; any other gets one untargeted
 * entry for the GM to assign actors to, or rule on. A failed cast settles them all.
 */
export function buildSpellCastEntries(params: {
  castSucceeded: boolean;
  resistedBy: SpellResistedByEnum;
  targetKind: string;
  targets: readonly SpellCastTarget[];
  caster: { actorUuid: string; tokenUuid: string };
  newId: () => string;
}): SpellCastEntry[] {
  const { castSucceeded, resistedBy, targetKind, caster, newId } = params;
  const untargeted: SpellCastTarget =
    (resistedBy === SpellResistedByEnum.None || casterTargetKinds.includes(targetKind)) &&
    !isSpiritCombatGate(resistedBy)
      ? { ...caster, isCaster: true }
      : { actorUuid: "", tokenUuid: "", isCaster: false };
  const targets = params.targets.length ? params.targets : [untargeted];
  return targets.map((target) => {
    const entry = newSpellCastEntry(newId(), target);
    return castSucceeded
      ? entry
      : { ...entry, stage: "settled", state: "unaffected", resolvedBy: "castFailed" };
  });
}

type RecordMessage = { id: string | null; type: string; system: any };

/** Whether a chat message holds a cast record: a `spellCast` card, or a combined cast card. */
export function isSpellCastRecordMessage(message: RecordMessage | undefined | null): boolean {
  if (!message) {
    return false;
  }
  return (
    message.type === "spellCast" ||
    (message.type === "resistanceRequest" && (message.system.targets?.length ?? 0) > 0)
  );
}

/** The message holding the record a card belongs to: itself, or the cast a request answers. */
export function spellCastRecordMessageOf<M extends RecordMessage>(
  message: M | undefined | null,
  messages: { get(id: string): M | undefined } | undefined = game.messages as any,
): M | undefined {
  if (!message) {
    return undefined;
  }
  if (isSpellCastRecordMessage(message)) {
    return message;
  }
  const recordId =
    message.type === "resistanceRequest" ? (message.system.spellCastMessageId as string) : "";
  return recordId ? messages?.get(recordId) : undefined;
}

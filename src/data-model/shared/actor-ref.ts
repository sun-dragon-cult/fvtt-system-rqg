const { SchemaField, StringField } = foundry.data.fields;

/**
 * An actor, and the token it acted from when it had one. Both are kept so it can still be found
 * after its token is gone (a linked actor), or with no token at all (theater of the mind).
 */
export type ActorRef = {
  /** The actor; a token's own actor when it is an unlinked token. "" when there is none. */
  actorUuid: string;
  /** "" when it has no token. */
  tokenUuid: string;
};

export function actorRefFields() {
  return {
    actorUuid: new StringField({ blank: true, nullable: false, initial: "" }),
    tokenUuid: new StringField({ blank: true, nullable: false, initial: "" }),
  };
}

export function actorRefField() {
  return new SchemaField(actorRefFields());
}

/** The uuid to look it up by: its token if it has one, else its actor; "" for neither. */
export function actorRefUuid(ref: ActorRef): string {
  return ref.tokenUuid || ref.actorUuid;
}

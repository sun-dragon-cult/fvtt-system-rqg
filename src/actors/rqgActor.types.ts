// Typeguard types
import type { RqgActor } from "@actors/rqgActor.ts";
import type { CharacterDataPropertiesData } from "../data-model/actor-data/rqgActorData.ts";

export type RqgCharacter = RqgActor & { system: CharacterDataPropertiesData };

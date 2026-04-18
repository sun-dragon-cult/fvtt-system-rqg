export const actorHealthStatuses = ["healthy", "wounded", "shock", "unconscious", "dead"] as const;
export type ActorHealthState = (typeof actorHealthStatuses)[number];

export const LocomotionEnum = {
  Walk: "walk",
  Swim: "swim",
  Fly: "fly",
} as const;
export type LocomotionEnum = (typeof LocomotionEnum)[keyof typeof LocomotionEnum];

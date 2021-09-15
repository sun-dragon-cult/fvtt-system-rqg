import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { ItemUpdate } from "../migrate";
import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";

export function migrateHitLocationName(itemData: ItemData): ItemUpdate {
  if (itemData.type === ItemTypeEnum.HitLocation) {
    const newName = newNames[itemData.name] ?? itemData.name;
    const newConnectedTo = newNames[itemData.data.connectedTo] ?? itemData.data.connectedTo;

    if (newName !== itemData.name || newConnectedTo !== itemData.data.connectedTo) {
      return {
        name: newName,
        data: {
          connectedTo: newConnectedTo,
        },
      };
    }
  }
  if (
    itemData.type === ItemTypeEnum.Armor &&
    Object.keys(newNames).some((oldHitLocationName: string) =>
      itemData.data.hitLocations.includes(oldHitLocationName)
    )
  ) {
    const newArmorCoverageArray = itemData.data.hitLocations.map(
      (coveredHitLocation) => newNames[coveredHitLocation] ?? coveredHitLocation
    );
    return {
      data: {
        hitLocations: newArmorCoverageArray,
      },
    };
  }

  return {};
}

const newNames: { [key: string]: string } = {
  head: "Head",
  leftArm: "Left Arm",
  rightArm: "Left Arm",
  chest: "Chest",
  abdomen: "Abdomen",
  leftLeg: "Left Leg",
  rightLeg: "Right Leg",
  leftWing: "Left Wing",
  rightWing: "Right Wing",
  tail: "Tail",
  leftHindLeg: "Left Hind Leg",
  rightHindLeg: "Right Hind Leg",
  hindquarter: "Hindquarter",
  forequarter: "Forequarter",
  leftForeLeg: "Left Fore Leg",
  rightForeLeg: "Right Fore Leg",
  leftMiddleLeg: "Left Middle Leg",
  rightMiddleLeg: "Right Middle Leg",
  leftCenterRearLeg: "Left Center Rear Leg",
  rightCenterRearLeg: "Right Center Rear Leg",
  leftCenterFrontLeg: "Left Center Front Leg",
  rightCenterFrontLeg: "Right Center Front Leg",
  hindBody: "Hind Body",
  midBody: "Mid Body",
  frontBody: "Front Body",
  thorax: "Thorax",
  shell: "Shell",
  leftHead: "Left Head",
  rightHead: "Right Head",
  body: "Body",
  trunk: "Trunk",
  tentacle1: "Tentacle 1",
  tentacle2: "Tentacle 2",
  tentacle3: "Tentacle 3",
  tentacle4: "Tentacle 4",
  tentacle5: "Tentacle 5",
  tentacle6: "Tentacle 6",
  tentacle7: "Tentacle 7",
  tentacle8: "Tentacle 8",
  leftClaw: "Left Claw",
  rightClaw: "Right Claw",
  leftHindFlipper: "Left Hind Flipper",
  rightHindFlipper: "Right Hind Flipper",
  leftForeFlipper: "Left Fore Flipper",
  rightForeFlipper: "Right Fore Flipper",
  leftPaw: "Left Paw",
  rightPaw: "Right Paw",
  leftPedipalp: "Left Pedipalp",
  rightPedipalp: "Right Pedipalp",
  neck: "Neck",
  lowerLeftArm: "Lower Left Arm",
  lowerRightArm: "Lower Right Arm",
};

import { CharacteristicCard } from "../../chat/characteristicCard";
import { RqgActor } from "../rqgActor";
import { Characteristic, Characteristics } from "../../data-model/actor-data/characteristics";
import { getDomDataset, logBug } from "../../system/util";

export const characteristicMenuOptions = (actor: RqgActor): ContextMenu.Item[] => [
  {
    name: "Roll (click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: async (el: JQuery) => {
      const [characteristicName, characteristic] = getCharacteristic(actor, el);
      if (characteristicName && characteristic) {
        await CharacteristicCard.show(actor, {
          name: characteristicName,
          data: characteristic,
        });
      }
    },
  },
  {
    name: "Direct Roll *5 (dbl click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: async (el: JQuery): Promise<void> => {
      const [characteristicName, characteristic] = getCharacteristic(actor, el);
      if (characteristicName && characteristic) {
        await CharacteristicCard.roll(actor, characteristicName, characteristic.value, 5, 0);
      }
    },
  },
  {
    name: "Toggle Experience",
    icon: '<i class="fas fa-lightbulb"></i>',
    condition: (el: JQuery) => {
      const [characteristicName, characteristic] = getCharacteristic(actor, el);
      return characteristicName === "power";
    },
    callback: async (): Promise<RqgActor> =>
      actor.update({
        "data.characteristics.power.hasExperience": !actor.data.data.characteristics.power
          .hasExperience,
      }),
  },
  {
    name: "Improve",
    icon: '<i class="fas fa-arrow-alt-circle-up"></i>',
    condition: (el: JQuery): boolean => {
      const [characteristicName, characteristic] = getCharacteristic(actor, el);
      return !!(characteristicName === "power" && characteristic?.hasExperience);
    },
    callback: (el: JQuery) => {
      ui.notifications?.info("TODO Improve");
    },
  },
];

function getCharacteristic(
  actor: RqgActor,
  el: JQuery
): [string | undefined, Characteristic | undefined] {
  const characteristicName = getDomDataset(el, "characteristic");
  const actorCharacteristics: Characteristics = actor.data.data.characteristics;
  if (characteristicName && characteristicName in actorCharacteristics) {
    return [
      characteristicName,
      actorCharacteristics[characteristicName as keyof typeof actorCharacteristics],
    ];
  } else {
    logBug(
      `Couldn't find characteristic name [${characteristicName}] on actor ${actor.name} to do an action from the characteristics context menu.`
    );
    return [undefined, undefined];
  }
}

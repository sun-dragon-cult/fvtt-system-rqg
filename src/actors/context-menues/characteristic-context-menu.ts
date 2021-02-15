import { Ability } from "../../data-model/shared/ability";
import { Chat } from "../../chat/chat";

export const characteristicMenuOptions = (actor) => [
  {
    name: "Roll (click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: async (el) => {
      const characteristic = (el[0].closest("[data-characteristic]") as HTMLElement).dataset
        .characteristic;
      await Chat.showCharacteristicChatCard({
        name: characteristic,
        data: actor.data.data.characteristics[characteristic],
      });
    },
  },
  {
    name: "Direct Roll *5 (dbl click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: (el) => {
      const characteristic = (el[0].closest("[data-characteristic]") as HTMLElement).dataset
        .characteristic;
      const result = Ability.roll(
        actor.data.data.characteristics[characteristic].value * 5,
        0,
        characteristic
      );
    },
  },
  {
    name: "Toggle Experience",
    icon: '<i class="fas fa-lightbulb"></i>',
    condition: (el) =>
      "power" === (el[0].closest("[data-characteristic]") as HTMLElement).dataset.characteristic,
    callback: async () => {
      await actor.update({
        "data.characteristics.power.hasExperience": !actor.data.data.characteristics.power
          .hasExperience,
      });
    },
  },
  {
    name: "Improve",
    icon: '<i class="fas fa-arrow-alt-circle-up"></i>',
    condition: (el) =>
      "power" === (el[0].closest("[data-characteristic]") as HTMLElement).dataset.characteristic &&
      actor.data.data.characteristics.power.hasExperience,
    callback: (el) => {
      ui.notifications.info("TODO Improve");
    },
  },
];

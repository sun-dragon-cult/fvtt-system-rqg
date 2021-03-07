import { CharacteristicCard } from "../../chat/characteristicCard";

export const characteristicMenuOptions = (actor) => [
  {
    name: "Roll (click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: async (el) => {
      const characteristic = (el[0].closest("[data-characteristic]") as HTMLElement).dataset
        .characteristic;
      await CharacteristicCard.show(actor, {
        name: characteristic,
        data: actor.data.data.characteristics[characteristic],
      });
    },
  },
  {
    name: "Direct Roll *5 (dbl click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: async (el) => {
      const characteristic = (el[0].closest("[data-characteristic]") as HTMLElement).dataset
        .characteristic;
      await CharacteristicCard.roll(
        actor,
        characteristic,
        actor.data.data.characteristics[characteristic].value,
        5,
        0
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

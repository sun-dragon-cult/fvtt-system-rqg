import { CharacteristicCard } from "../../chat/characteristicCard";
import { RqgActor } from "../rqgActor";
import { Characteristic, Characteristics } from "../../data-model/actor-data/characteristics";
import { getDomDataset, getGame, getGameUser, requireValue, RqgError } from "../../system/util";
import { ActorDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";
import { showImproveCharacteristicDialog } from "../../dialog/improveCharacteristicDialog";

export const characteristicMenuOptions = (
  actor: RqgActor,
  token: TokenDocument | null
): ContextMenu.Item[] => [
  {
    name: "Roll (click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: async (el: JQuery) => {
      const { name: characteristicName, value: characteristic } = getCharacteristic(actor, el);
      await CharacteristicCard.show(
        {
          name: characteristicName,
          data: characteristic,
        },
        actor,
        token
      );
    },
  },
  {
    name: "Direct Roll *5 (dbl click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: async (el: JQuery): Promise<void> => {
      const { name: characteristicName, value: characteristic } = getCharacteristic(actor, el);
      const speakerName = token?.name ?? actor.data.token.name ?? "";
      await CharacteristicCard.roll(
        characteristicName,
        characteristic.value,
        5,
        0,
        actor,
        speakerName
      );
    },
  },
  {
    name: "Toggle Experience",
    icon: '<i class="fas fa-lightbulb"></i>',
    condition: (el: JQuery) => {
      const { name: characteristicName } = getCharacteristic(actor, el);
      return characteristicName === "power";
    },
    callback: async (): Promise<RqgActor | undefined> =>
      await actor.update({
        "data.characteristics.power.hasExperience":
          !actor.data.data.characteristics.power.hasExperience,
      }),
  },
  {
    name: "Improve",
    icon: '<i class="fas fa-arrow-alt-circle-up"></i>',
    condition: (el: JQuery): boolean => {
      const { name: characteristicName, value: characteristic } = getCharacteristic(actor, el);
      // You can train STR, CON, DEX, POW, and CHA, and you can increase POW via experience
      // You cannot train INT or increase it via experience

      const trainable = ["strength", "constitution", "dexterity", "power", "charisma"];
      return !!trainable.includes(characteristicName);
    },
    callback: (el: JQuery) => {
      const charName = getDomDataset(el, "characteristic");
      requireValue(charName, "Couldn't find dataset for characteristic");

      const characteristic = (actor.data.data.characteristics as any)[charName];
      characteristic.name = charName;
      const speakerName = token?.name ?? actor.data.token.name ?? "";
      showImproveCharacteristicDialog(actor, "characteristic", characteristic, speakerName);
    },
  },
  {
    name: "Initialize Characteristic",
    icon: '<i class="fas fa-dice-three"></i>',
    condition: (): boolean => !!getGame().user?.isGM,
    callback: async (el: JQuery) => {
      const characteristic = getDomDataset(el, "characteristic");
      requireValue(characteristic, "Couldn't find dataset for characteristic");
      const confirmed = await confirmInitializeDialog(actor.name ?? "", characteristic);
      if (confirmed) {
        const updateData = await getCharacteristicUpdate(
          characteristic,
          (actor.data.data.characteristics as any)[characteristic].formula,
          actor.name ?? getGameUser().name ?? ""
        );
        await actor.update(updateData);
        await initializeCurrentDerivedAttributes(actor);
      }
    },
  },
  {
    name: "Initialize All Characteristics",
    icon: '<i class="fas fa-dice"></i>',
    condition: (): boolean => !!getGame().user?.isGM,
    callback: async () => {
      const confirmed = await confirmInitializeDialog(actor.name ?? "");
      if (confirmed) {
        await initializeAllCharacteristics(actor);
      }
    },
  },
];

async function getCharacteristicUpdate(
  characteristic: string,
  formula: string,
  speakerName?: string
): Promise<DeepPartial<ActorDataConstructorData>> {
  if (!formula) {
    return {
      data: { characteristics: { [characteristic]: { value: "" } } },
    };
  }

  const r = new Roll(formula, {});
  await r.evaluate({ async: true });
  if (speakerName) {
    await r.toMessage({
      speaker: { alias: speakerName },
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      flavor: `Initialize ${characteristic}`,
    });
  }
  return {
    data: { characteristics: { [characteristic]: { value: Number(r.total) } } },
  };
}

export async function initializeAllCharacteristics(
  actor: RqgActor,
  silent: boolean = false
): Promise<void> {
  let updateData = {};

  for (const characteristic of Object.keys(actor.data.data.characteristics)) {
    const update = await getCharacteristicUpdate(
      characteristic,
      (actor.data.data.characteristics as any)[characteristic].formula,
      silent ? undefined : actor.name ?? getGameUser().name ?? ""
    );
    mergeObject(updateData, update);
  }
  await actor.update(updateData);
  await initializeCurrentDerivedAttributes(actor);
}

/** Sets actor's current hitPoints.value to the hitPoints.max */
async function initializeCurrentDerivedAttributes(actor: RqgActor) {
  const hpUpdate = {
    "data.attributes.hitPoints.value": actor.data.data.attributes.hitPoints.max,
    "data.attributes.magicPoints.value": actor.data.data.attributes.magicPoints.max,
  };
  await actor.update(hpUpdate);
}

function getCharacteristic(actor: RqgActor, el: JQuery): { name: string; value: Characteristic } {
  const characteristicName = getDomDataset(el, "characteristic");
  const actorCharacteristics: Characteristics = actor.data.data.characteristics;
  if (characteristicName && characteristicName in actorCharacteristics) {
    return {
      name: characteristicName,
      value: actorCharacteristics[characteristicName as keyof typeof actorCharacteristics],
    };
  } else {
    throw new RqgError(
      `Couldn't find characteristic name [${characteristicName}] on actor ${actor.name} to do an action from the characteristics context menu.`
    );
  }
}

async function confirmInitializeDialog(
  actorName: string,
  characteristic: string = ""
): Promise<boolean> {
  return await new Promise(async (resolve) => {
    const title = !!characteristic
      ? `Overwrite ${getGame().i18n.localize(
          "RQG.characteristic." + characteristic
        )} on ${actorName}`
      : `Overwrite all characteristics on ${actorName}`;
    const content = !!characteristic
      ? `Do you want to overwrite the current value of ${getGame().i18n.localize(
          "RQG.characteristic." + characteristic
        )}? This may also set current Hit Points to the new maximum Hit Points and set current Magic Points to the new maximum Magic Points.`
      : `Do you want to overwrite the current value of all characteristics? This may also set current Hit Points to the new maximum Hit Points and set current Magic Points to the new maximum Magic Points.`;
    const dialog = new Dialog({
      title: title,
      content: content,
      default: "submit",
      buttons: {
        submit: {
          icon: '<i class="fas fa-check"></i>',
          label: "Confirm",

          callback: () => {
            resolve(true);
          },
        },
        cancel: {
          label: "Cancel",
          icon: '<i class="fas fa-times"></i>',
          callback: () => {
            resolve(false);
          },
        },
      },
    });
    await dialog.render(true);
  });
}

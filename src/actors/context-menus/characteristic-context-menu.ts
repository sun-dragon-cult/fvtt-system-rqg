import { CharacteristicChatHandler } from "../../chat/characteristicChatHandler";
import { RqgActor } from "../rqgActor";
import { Characteristic, Characteristics } from "../../data-model/actor-data/characteristics";
import {
  activateChatTab,
  getDomDataset,
  getGame,
  getGameUser,
  localize,
  localizeCharacteristic,
  requireValue,
  RqgError,
} from "../../system/util";
import { ActorDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";
import { showImproveCharacteristicDialog } from "../../applications/improveCharacteristicDialog";
import { ContextMenuRunes } from "./contextMenuRunes";

export const characteristicMenuOptions = (
  actor: RqgActor,
  token: TokenDocument | undefined
): ContextMenu.Item[] => [
  {
    name: localize("RQG.Game.RollChat"),
    icon: ContextMenuRunes.RollViaChat,
    condition: () => true,
    callback: async (el: JQuery) => {
      const { name: characteristicName, value: characteristic } = getCharacteristic(actor, el);
      await CharacteristicChatHandler.show(
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
    name: localize("RQG.Game.RollCharacteristicQuick"),
    icon: ContextMenuRunes.RollQuick,
    condition: () => true,
    callback: async (el: JQuery): Promise<void> => {
      const { name: characteristicName, value: characteristic } = getCharacteristic(actor, el);
      await CharacteristicChatHandler.roll(
        characteristicName,
        characteristic.value,
        5,
        0,
        actor,
        ChatMessage.getSpeaker({ actor: actor, token: token })
      );
    },
  },
  {
    name: localize("RQG.ContextMenu.ToggleExperience"),
    icon: ContextMenuRunes.ToggleExperience,
    condition: (el: JQuery) => {
      const { name: characteristicName } = getCharacteristic(actor, el);
      return characteristicName === "power";
    },
    callback: async (): Promise<RqgActor | undefined> =>
      await actor.update({
        "system.characteristics.power.hasExperience":
          !actor.system.characteristics.power.hasExperience,
      }),
  },
  {
    name: localize("RQG.ContextMenu.ImproveItem", {
      itemType: localize("RQG.Actor.Characteristics.Characteristic"),
    }),
    icon: ContextMenuRunes.Improve,
    condition: (el: JQuery): boolean => {
      const { name: characteristicName } = getCharacteristic(actor, el);
      // You can train STR, CON, DEX, POW, and CHA, and you can increase POW via experience
      // You cannot train INT or increase it via experience

      const trainable = ["strength", "constitution", "dexterity", "power", "charisma"];
      return trainable.includes(characteristicName);
    },
    callback: (el: JQuery) => {
      const charName = getDomDataset(el, "characteristic") as keyof Characteristics | undefined;
      requireValue(charName, localize("RQG.ContextMenu.Notification.DatasetNotFound"));

      const characteristic = actor.system.characteristics[charName];
      (characteristic as any).name = charName; // TODO adding extra properties that's not on type Characteristic
      const speakerName = token?.name ?? actor.prototypeToken.name ?? "";
      showImproveCharacteristicDialog(actor, "characteristic", characteristic, speakerName);
    },
  },
  {
    name: localize("RQG.ContextMenu.InitializeCharacteristic"),
    icon: ContextMenuRunes.InitializeCharacteristics,
    condition: (): boolean => !!getGame().user?.isGM,
    callback: async (el: JQuery) => {
      const characteristic = getDomDataset(el, "characteristic") as
        | keyof Characteristics
        | undefined;
      requireValue(characteristic, localize("RQG.ContextMenu.Notification.DatasetNotFound"));
      const confirmed = await confirmInitializeDialog(actor.name ?? "", characteristic);
      if (confirmed) {
        const updateData = await getCharacteristicUpdate(
          characteristic,
          actor.system.characteristics[characteristic].formula,
          actor.name ?? getGameUser().name ?? ""
        );
        await actor.update(updateData);
        await initializeCurrentDerivedAttributes(actor);
      }
    },
  },
  {
    name: localize("RQG.ContextMenu.InitializeAllCharacteristics"),
    icon: ContextMenuRunes.InitializeAllCharacteristics,
    condition: (): boolean => !!getGame().user?.isGM,
    callback: async () => {
      const confirmed = await confirmInitializeDialog(actor.name ?? "");
      if (confirmed) {
        await initializeAllCharacteristics(actor);
      }
    },
  },
  {
    name: localize("RQG.ContextMenu.SetAllCharacteristicsToAverage"),
    icon: ContextMenuRunes.SetAllCharacteristicsToAverage,
    condition: (): boolean => !!getGame().user?.isGM,
    callback: async () => {
      const confirmed = await confirmInitializeDialog(actor.name ?? "");
      if (confirmed) {
        await setAllCharacteristicsToAverage(actor);
      }
    },
  },
];

async function getCharacteristicUpdate(
  characteristic: string,
  formula: string | undefined,
  speakerName?: string
): Promise<DeepPartial<ActorDataConstructorData & { system: any }>> {
  if (!formula) {
    return {
      system: { characteristics: { [characteristic]: { value: "" } } },
    };
  }

  const r = new Roll(formula, {});
  await r.evaluate({ async: true });
  if (speakerName) {
    await r.toMessage({
      speaker: { alias: speakerName },
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      flavor: localize("RQG.ContextMenu.InitializeResultChat", {
        char: localizeCharacteristic(characteristic),
      }),
    });
    activateChatTab();
  }
  return {
    system: { characteristics: { [characteristic]: { value: Number(r.total) } } },
  };
}

export async function initializeAllCharacteristics(
  actor: RqgActor,
  silent: boolean = false
): Promise<void> {
  let updateData = {};

  if (!actor.isOwner) {
    return;
  }

  for (const characteristic of Object.keys(actor.system.characteristics)) {
    const update = await getCharacteristicUpdate(
      characteristic,
      actor.system.characteristics[characteristic as keyof Characteristics].formula,
      silent ? undefined : actor.name ?? getGameUser().name ?? ""
    );
    mergeObject(updateData, update);
  }
  await actor.update(updateData);
  await initializeCurrentDerivedAttributes(actor);
}

/** Sets actor's current hitPoints.value to the hitPoints.max */
async function initializeCurrentDerivedAttributes(actor: RqgActor) {
  if (actor.system.attributes.hitPoints.max != null) {
    const hpUpdate = {
      "system.attributes.hitPoints.value": actor.system.attributes.hitPoints.max,
      "system.attributes.magicPoints.value": actor.system.attributes.magicPoints.max,
    };
    await actor.update(hpUpdate);
  }
}

export async function setAllCharacteristicsToAverage(actor: RqgActor): Promise<void> {
  if (!actor.isOwner) {
    return;
  }

  const averages = {} as { [key: string]: number };

  let updateData = {};

  for (const characteristic of Object.keys(actor.system.characteristics)) {
    const char = actor.system.characteristics[characteristic as keyof Characteristics];

    if (!char) {
      continue;
    }

    const diceExpression = char.formula || "";

    if (!averages[diceExpression]) {
      const rolls = await Roll.simulate(diceExpression, 10000);
      let avg = rolls.reduce((a, b) => a + b) / rolls.length;
      const fraction = avg % 1;
      // Round generously because many dice expressions produce a mean right around X.5 or X.0
      if (fraction > 0.4 && fraction < 0.6) {
        avg = Math.ceil(avg);
      } else {
        avg = Math.round(avg);
      }

      averages[diceExpression] = avg;
    }

    const update = await getCharacteristicUpdate(
      characteristic,
      averages[char.formula || ""].toString(),
      ""
    );
    mergeObject(updateData, update);
  }
  await actor.update(updateData);
  await initializeCurrentDerivedAttributes(actor);
}

function getCharacteristic(actor: RqgActor, el: JQuery): { name: string; value: Characteristic } {
  const characteristicName = getDomDataset(el, "characteristic");
  const actorCharacteristics: Characteristics = actor.system.characteristics;
  if (characteristicName && characteristicName in actorCharacteristics) {
    return {
      name: characteristicName,
      value: actorCharacteristics[characteristicName as keyof typeof actorCharacteristics],
    };
  } else {
    throw new RqgError(
      localize("RQG.Contextmenu.Notification.CharacteristicNotFound", {
        characteristicName: characteristicName,
        actorName: actor.name,
      })
    );
  }
}

async function confirmInitializeDialog(
  actorName: string,
  characteristic: string = ""
): Promise<boolean> {
  return await new Promise(async (resolve) => {
    const title = !!characteristic
      ? localize("RQG.ContextMenu.OverwriteCharacteristicDialogTitle", {
          characteristicName: localizeCharacteristic(characteristic),
          actorName: actorName,
        })
      : localize("RQG.ContextMenu.OverwriteAllCharacteristicsDialogTitle", {
          actorName: actorName,
        });
    const content = !!characteristic
      ? localize("RQG.ContextMenu.OverwriteCharacteristicDialog", {
          characteristicName: localizeCharacteristic(characteristic),
        })
      : localize("RQG.ContextMenu.OverwriteAllCharacteristicsDialog");
    const dialog = new Dialog({
      title: title,
      content: content,
      default: "submit",
      buttons: {
        submit: {
          icon: '<i class="fas fa-check"></i>',
          label: localize("RQG.Dialog.Common.btnConfirm"),
          callback: () => {
            resolve(true);
          },
        },
        cancel: {
          label: localize("RQG.Dialog.Common.btnCancel"),
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

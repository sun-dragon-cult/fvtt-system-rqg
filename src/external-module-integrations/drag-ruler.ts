import { getGame } from "../system/util";
import { systemId } from "../system/config";

export const dragRulerModuleIntegrationInit = () =>
  Hooks.once("dragRuler.ready", (SpeedProvider: any) => {
    class RqgSpeedProvider extends SpeedProvider {
      get colors() {
        return [
          {
            id: "attack",
            default: 0x00ff00,
            name: `RQG.Integrations.DragRuler.Speeds.Attack`,
          },
          {
            id: "walk",
            default: 0xffff00,
            name: `RQG.Integrations.DragRuler.Speeds.Walk`,
          },
          {
            id: "sprint",
            default: 0xff8000,
            name: `RQG.Integrations.DragRuler.Speeds.Sprint`,
          },
        ];
      }

      getRanges(token: TokenDocument) {
        const baseSpeed = (token.actor?.system.attributes.move.equipped ?? 0) * 3; // movement in meters (1 MOV = 3 meters)
        const attackSpeed = baseSpeed / 2; // you can move and attack if you move MOV/2
        const sprintSpeed =
          baseSpeed *
          (getGame().settings.get(
            "drag-ruler",
            `speedProviders.system.${systemId}.setting.sprintMultiplier`,
          ) as number); // optional rule

        return [
          { range: attackSpeed, color: "attack" },
          { range: baseSpeed, color: "walk" },
          { range: sprintSpeed, color: "sprint" },
        ];
      }

      get settings() {
        return [
          {
            id: "sprintMultiplier",
            name: "RQG.Integrations.DragRuler.Settings.SprintMultiplier.Name",
            hint: "RQG.Integrations.DragRuler.Settings.SprintMultiplier.Hint",
            scope: "world",
            config: true,
            type: Number,
            default: 0.0,
          },
        ];
      }
    }

    // @ts-expect-error dragRuler
    dragRuler.registerSystem(systemId, RqgSpeedProvider);
  });

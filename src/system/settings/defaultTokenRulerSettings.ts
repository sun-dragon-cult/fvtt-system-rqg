import type { TokenRulerSettingsType } from "../../applications/settings/tokenRulerSettings.types";

export const defaultTokenRulerSettings: TokenRulerSettingsType = {
  lineWidth: 30,
  alpha: 0.45,
  sprintMultiplier: 0,
  rangeColors: {
    attack: "#00ff00",
    walk: "#ffff00",
    sprint: "#ff8000",
    unreachable: "#ff0000",
  },
};

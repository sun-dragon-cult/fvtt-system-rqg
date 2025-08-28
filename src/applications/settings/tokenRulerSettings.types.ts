export type TokenRulerSettingsType = {
  lineWidth: number;
  alpha: number;
  sprintMultiplier: number;
  rangeColors: {
    attack: string;
    walk: string;
    sprint: string;
    unreachable: string;
  };
};

export type TokenRulerSettingsContext = TokenRulerSettingsType & {
  sprintMeters: number;
  buttons: { type: string; icon: string; label: string }[];
};

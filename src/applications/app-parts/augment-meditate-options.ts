// Augment/Meditate modifier options shared by every roll dialog.
export const augmentOptions: SelectOptionData<number>[] = [
  { value: 0, label: "RQG.Dialog.Common.AugmentOptions.None" },
  { value: 50, label: "RQG.Dialog.Common.AugmentOptions.CriticalSuccess" },
  { value: 30, label: "RQG.Dialog.Common.AugmentOptions.SpecialSuccess" },
  { value: 20, label: "RQG.Dialog.Common.AugmentOptions.Success" },
  { value: -20, label: "RQG.Dialog.Common.AugmentOptions.Failure" },
  { value: -50, label: "RQG.Dialog.Common.AugmentOptions.Fumble" },
];

export const meditateOptions: SelectOptionData<number>[] = [
  { value: 0, label: "RQG.Dialog.Common.MeditateOptions.None" },
  { value: 5, label: "RQG.Dialog.Common.MeditateOptions.1mr" },
  { value: 10, label: "RQG.Dialog.Common.MeditateOptions.2mr" },
  { value: 15, label: "RQG.Dialog.Common.MeditateOptions.5mr" },
  { value: 20, label: "RQG.Dialog.Common.MeditateOptions.25mr" },
  { value: 25, label: "RQG.Dialog.Common.MeditateOptions.50mr" },
];

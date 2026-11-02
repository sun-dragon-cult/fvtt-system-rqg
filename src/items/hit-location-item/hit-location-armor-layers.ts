export type ArmorLayerDialogData = {
  name: string;
  absorbs: number;
};

/** The location's natural armor as the first layer, so the layers add up to its total AP. */
export function withNaturalArmorLayer(
  naturalAp: number,
  wornLayers: ArmorLayerDialogData[],
  naturalArmorName: string,
): ArmorLayerDialogData[] {
  return naturalAp > 0
    ? [{ name: naturalArmorName, absorbs: naturalAp }, ...wornLayers]
    : wornLayers;
}

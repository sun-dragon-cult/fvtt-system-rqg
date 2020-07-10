export class Modifiers {
  // TODO Define object to hold modifier tables

  // TODO Implement method to modify a value based on one or more inputs

  public static dexSR(dex: number): number {
    return dex > 18 ? 0 :
      dex > 15 ? 1 :
        dex > 12 ? 2 :
          dex > 8 ? 3 :
            dex > 5 ? 4 : 5;

  }


  static hitPoints(constitution: number, size: number, power: number): number {
    return constitution + 1; // TODO just a place holder until implemented a good lookup system
  }

  private static dexSRTable = Array([
    {18: 0},
    {}
    ]);
}

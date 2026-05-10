/**
 * A system specific Error that can encapsulate extra debugging information (in `debugData`)
 */
export class RqgError implements Error {
  public name: string = "RqgError";
  public debugData: any[];

  constructor(
    public message: string,
    ...debugData: any[]
  ) {
    // Maintains proper stack trace for where our error was thrown.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RqgError);
    }
    this.debugData = debugData;
  }
}

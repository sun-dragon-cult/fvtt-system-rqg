import chalk from "chalk";

export class PackError implements Error {
  public name: string = "PackError";

  constructor(public message: string) {
    console.error(chalk.red(`Pack Error: ${chalk.bold(message)}`));
    process.exit(1);
  }
}

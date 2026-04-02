/**
 * Start a local Foundry VTT server instance.
 *
 * Usage:
 *   pnpm foundry        — start the version matching FOUNDRY_PORT in .env.local
 *   pnpm foundry 13     — start Foundry v13
 *   pnpm foundry 14     — start Foundry v14
 *
 * Configuration (in .env.local, gitignored):
 *   FOUNDRY_V13_APP=/path/to/foundry-13/FoundryVTT   # directory containing main.js
 *   FOUNDRY_V13_DATA=/path/to/foundry-13/foundrydata  # user data directory
 *   FOUNDRY_V14_APP=/path/to/foundry-14/FoundryVTT
 *   FOUNDRY_V14_DATA=/path/to/foundry-14/foundrydata
 *   FOUNDRY_PORT=30013                               # determines the default version when no arg is given
 */

import { spawn } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";

async function loadEnvLocal(): Promise<Record<string, string>> {
  try {
    const envLocalPath = new URL("../.env.local", import.meta.url).pathname;
    const content = await fs.readFile(envLocalPath, "utf-8");
    return Object.fromEntries(
      content
        .split("\n")
        .map((line) => line.replace(/#.*$/, "").trim())
        .filter((line) => /^[A-Z_][A-Z0-9_]*=/.test(line))
        .map((line) => {
          const eq = line.indexOf("=");
          return [line.slice(0, eq), line.slice(eq + 1).trim()];
        }),
    );
  } catch {
    return {};
  }
}

async function main() {
  const env = await loadEnvLocal();

  // Determine version: from CLI arg or from FOUNDRY_PORT convention (3001X → vX)
  const versionArg = process.argv[2];
  let version: string;

  if (versionArg != null) {
    version = versionArg;
  } else {
    const port = process.env.FOUNDRY_PORT ?? env["FOUNDRY_PORT"];
    if (port == null) {
      console.error(
        "No version specified and FOUNDRY_PORT is not set in .env.local.\n" +
          "Usage: pnpm foundry <version>  (e.g. pnpm foundry 13)",
      );
      process.exit(1);
    }
    // Port 3001X → version X (e.g. 30013 → 13, 30014 → 14)
    version = String(Number(port) - 30000);
  }

  const appDir = process.env[`FOUNDRY_V${version}_APP`] ?? env[`FOUNDRY_V${version}_APP`];
  const dataPath = process.env[`FOUNDRY_V${version}_DATA`] ?? env[`FOUNDRY_V${version}_DATA`];

  if (appDir == null) {
    console.error(
      `FOUNDRY_V${version}_APP is not set. Add it to .env.local:\n` +
        `  FOUNDRY_V${version}_APP=/path/to/foundry-${version}/FoundryVTT`,
    );
    process.exit(1);
  }
  if (dataPath == null) {
    console.error(
      `FOUNDRY_V${version}_DATA is not set. Add it to .env.local:\n` +
        `  FOUNDRY_V${version}_DATA=/path/to/foundry-${version}/foundrydata`,
    );
    process.exit(1);
  }

  const mainJs = path.join(appDir, "main.js");
  const port = 30000 + Number(version);

  // Verify the app exists before trying to start
  try {
    await fs.access(mainJs, fs.constants.F_OK);
  } catch {
    console.error(
      `Could not find Foundry app at: ${mainJs}\nCheck FOUNDRY_V${version}_APP in .env.local`,
    );
    process.exit(1);
  }

  console.log(`Starting Foundry v${version} on port ${port}`);
  console.log(`  App:  ${mainJs}`);
  console.log(`  Data: ${dataPath}`);

  const child = spawn("node", [mainJs, `--dataPath=${dataPath}`, `--port=${port}`], {
    stdio: "inherit",
    cwd: appDir,
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

await main();

import * as fs from "fs/promises";

export async function loadEnvLocal(): Promise<Record<string, string>> {
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

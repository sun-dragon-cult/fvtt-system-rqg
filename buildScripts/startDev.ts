/**
 * Thin wrapper around `vite` that resolves the Foundry port before starting.
 *
 * Usage:
 *   pnpm dev        — use FOUNDRY_PORT from .env.local (or auto-detect)
 *   pnpm dev 13     — use Foundry v13 (port 30013)
 *   pnpm dev 30013  — same, explicit port
 */

import { spawn } from "child_process";
import { loadEnvLocal } from "./loadEnvLocal.ts";

const env = await loadEnvLocal();

const arg = process.argv[2];
let foundryPort: string | undefined;

if (arg != null) {
  // Version shorthand (e.g. 13) or explicit port (e.g. 30013)
  const n = Number(arg);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    console.error(
      `Invalid Foundry version/port argument: ${arg}\n` +
        "Usage:\n" +
        "  pnpm dev        Use FOUNDRY_PORT from .env.local (or auto-detect)\n" +
        "  pnpm dev 13     Use Foundry v13 (port 30013)\n" +
        "  pnpm dev 30013  Use explicit port",
    );
    process.exit(1);
  }
  foundryPort = String(n < 1000 ? 30000 + n : n);
} else {
  foundryPort = process.env["FOUNDRY_PORT"] ?? env["FOUNDRY_PORT"];
}

spawn("vite", {
  stdio: "inherit",
  env: { ...process.env, ...env, ...(foundryPort ? { FOUNDRY_PORT: foundryPort } : {}) },
}).on("exit", (code) => process.exit(code ?? 0));

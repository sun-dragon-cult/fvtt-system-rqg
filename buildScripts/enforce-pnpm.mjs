#!/usr/bin/env node

const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.includes("pnpm/")) {
  process.stderr.write("This project must be installed with pnpm.\n\n");
  process.stderr.write("First-time setup:\n");
  process.stderr.write("  1. Install Node.js 24.13.1+ (Foundry v14 Node runtime)\n");
  process.stderr.write("  2. Run: corepack enable\n");
  process.stderr.write("  3. Run: pnpm install\n\n");
  process.stderr.write("If 'corepack' is not found, upgrade Node or run: npm i -g corepack\n");
  process.exit(1);
}

#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { chmodSync, existsSync } from "node:fs";
import { join } from "node:path";

const hookPath = ".githooks";
const repoRoot = process.cwd();
const hookFiles = ["pre-commit", "pre-push", "commit-msg"];

function runGit(args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  }).trim();
}

function getCurrentHooksPath() {
  try {
    return runGit(["config", "--local", "--get", "core.hooksPath"]);
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && error.status === 1) {
      return "";
    }
    throw error;
  }
}

try {
  // Skip in environments that do not have a .git directory (e.g., published tarballs).
  if (!existsSync(join(repoRoot, ".git"))) {
    process.exit(0);
  }

  // Ensure hooks are executable in case mode bits were not preserved.
  for (const hookFile of hookFiles) {
    const hookFilePath = join(repoRoot, hookPath, hookFile);
    if (existsSync(hookFilePath)) {
      chmodSync(hookFilePath, 0o755);
    }
  }

  const currentHooksPath = getCurrentHooksPath();
  if (currentHooksPath !== hookPath) {
    runGit(["config", "--local", "core.hooksPath", hookPath]);
    process.stdout.write(`Configured git hooks path to ${hookPath}.\n`);
  }
} catch (error) {
  // Keep install resilient in minimal/CI environments.
  const errorMessage = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Skipping git hooks setup: ${errorMessage}\n`);
}

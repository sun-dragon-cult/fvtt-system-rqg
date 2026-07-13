import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

/**
 * Runs the real generator (in a subprocess, via `tsx`) against a scratch output
 * directory. A subprocess is used deliberately instead of importing the generator
 * in-process: the vitest test environment installs its own (different) foundry
 * mock via `test/setup/foundryMockFunctions.js`, and DataModel modules are cached
 * per-process by Node's ESM loader — so running the generator here exercises the
 * exact same code path used by `pnpm generate:schemas` / CI.
 */
function runGenerator(outDir: string): void {
  execFileSync("npx", ["tsx", "buildScripts/generate-schema.ts", `--out=${outDir}`], {
    cwd: repoRoot,
    stdio: "pipe",
  });
}

describe("generate-schema (integration)", () => {
  it("generates a JSON Schema for the skill item type with the expected shape", () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "rqg-generate-schema-"));
    try {
      runGenerator(outDir);

      const skillSchemaPath = path.join(outDir, "item", "skill.schema.json");
      expect(fs.existsSync(skillSchemaPath)).toBe(true);
      const schema = JSON.parse(fs.readFileSync(skillSchemaPath, "utf8"));

      expect(schema.type).toBe("object");
      expect(schema.required).toEqual(
        expect.arrayContaining([
          "canGetExperience",
          "hasExperience",
          "category",
          "skillName",
          "specialization",
          "baseChance",
          "gainedChance",
          "runeRqidLinks",
        ]),
      );

      expect(schema.properties.category.type).toBe("string");
      expect(schema.properties.category.enum).toEqual(
        expect.arrayContaining([
          "agility",
          "communication",
          "knowledge",
          "magic",
          "manipulation",
          "perception",
          "stealth",
          "meleeWeapons",
          "missileWeapons",
          "shields",
          "naturalWeapons",
          "otherSkills",
        ]),
      );

      expect(schema.properties.baseChance).toEqual({
        type: "integer",
        minimum: 0,
        default: 0,
      });
      expect(schema.properties.gainedChance).toEqual({
        type: "integer",
        minimum: 0,
        default: 0,
      });
      expect(schema.properties.skillName).toEqual({ type: "string", default: "" });
      expect(schema.properties.runeRqidLinks.type).toBe("array");
      expect(schema.properties.runeRqidLinks.items.type).toBe("object");
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  }, 30_000);

  it("writes a manifest listing every generated schema file", () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "rqg-generate-schema-"));
    try {
      runGenerator(outDir);

      const manifest = JSON.parse(fs.readFileSync(path.join(outDir, "manifest.json"), "utf8"));
      const types = manifest.schemas.map((entry: { type: string }) => entry.type);

      expect(types).toEqual(
        expect.arrayContaining([
          "armor",
          "cult",
          "gear",
          "hitLocation",
          "homeland",
          "occupation",
          "passion",
          "rune",
          "runeMagic",
          "skill",
          "spiritMagic",
          "weapon",
          "character",
        ]),
      );
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  }, 30_000);
});

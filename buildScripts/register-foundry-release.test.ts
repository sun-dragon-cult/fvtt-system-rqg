import { spawnSync } from "child_process";
import process from "process";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import {
  API_URL,
  compatibilityOf,
  registerRelease,
  RegisterError,
  type RegisterEnv,
} from "./register-foundry-release";

type Answer = [status: number, body: unknown, headers?: Record<string, string>];

type Release = { prerelease: boolean; assets?: { name: string; state: string }[] };

type Scenario = {
  release?: Release;
  releaseAfter?: Release[];
  githubStatus?: number;
  manifest?: unknown;
  notes?: number;
  foundry?: Answer[];
};

const manifest = {
  id: "rqg",
  version: "7.1.0",
  compatibility: { minimum: "14.361", verified: 14 },
};
const assets = [
  { name: "rqg.zip", state: "uploaded" },
  { name: "system.json", state: "uploaded" },
];
const published = { prerelease: false, assets };

const baseEnv: RegisterEnv = {
  TAG: "v7.1.0",
  DRY_RUN: "false",
  GITHUB_REPOSITORY: "sun-dragon-cult/fvtt-system-rqg",
  MANIFEST_FILE: "system.json",
  SYSTEM_NAME: "rqg",
  GITHUB_TOKEN: "gh",
  FOUNDRY_RELEASE_TOKEN: "fvttp_secret",
};

function respond(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers });
}

async function run(scenario: Scenario, env: RegisterEnv = {}) {
  const answers = [...(scenario.foundry ?? [[200, { status: "success" }]])];
  const posts: RequestInit[] = [];
  const logs: string[] = [];
  const later = [...(scenario.releaseAfter ?? [])];
  let githubReads = 0;
  const fetchStub = async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    if (url.startsWith("https://api.github.com/")) {
      if (scenario.githubStatus) {
        return respond(scenario.githubStatus, {});
      }
      const release = githubReads++ === 0 ? scenario.release : (later.shift() ?? scenario.release);
      return release ? respond(200, release) : respond(404, {});
    }
    if (url.includes("/releases/download/")) {
      return scenario.manifest ? respond(200, scenario.manifest) : respond(404, "");
    }
    if (url.startsWith("https://sun-dragon-cult.github.io/")) {
      return respond(scenario.notes ?? 200, "");
    }
    if (url === API_URL) {
      posts.push(init);
      const [status, body, headers] = (answers.length > 1 ? answers.shift() : answers[0])!;
      return respond(status, body, headers);
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  let error: unknown;
  try {
    await registerRelease(
      { ...baseEnv, ...env },
      { fetch: fetchStub as typeof fetch, sleep: async () => {}, log: (m) => logs.push(m) },
    );
  } catch (e) {
    error = e;
  }
  const payload = posts[0] ? JSON.parse(String(posts[0].body)) : undefined;
  return { error, payload, posts, log: logs.join("\n") };
}

describe("register-foundry-release", () => {
  it("registers the tag's manifest and notes with the raw token", async () => {
    const { error, payload, posts } = await run({ release: published, manifest });

    expect(error).toBeUndefined();
    expect(payload).toEqual({
      id: "rqg",
      release: {
        version: "7.1.0",
        manifest:
          "https://github.com/sun-dragon-cult/fvtt-system-rqg/releases/download/v7.1.0/system.json",
        notes: "https://sun-dragon-cult.github.io/release-notes/rqg-v7.1.0",
        compatibility: { minimum: "14.361", verified: "14", maximum: "" },
      },
    });
    expect((posts[0]!.headers as Record<string, string>)["Authorization"]).toBe("fvttp_secret");
  });

  it("always sends a maximum and leaves out the rest the manifest doesn't state", () => {
    expect(compatibilityOf({ compatibility: { minimum: "14", verified: "" } })).toEqual({
      minimum: "14",
      maximum: "",
    });
    expect(compatibilityOf({ compatibility: { maximum: 15 } })).toEqual({ maximum: "15" });
    expect(compatibilityOf({})).toEqual({ maximum: "" });
  });

  it("lets a dry run use a pre-release", async () => {
    const { error, payload } = await run(
      { release: { prerelease: true, assets }, manifest },
      { DRY_RUN: "true" },
    );
    expect(error).toBeUndefined();
    expect(payload["dry-run"]).toBe(true);
  });

  it("refuses to register a pre-release for real", async () => {
    const { error, posts } = await run({ release: { prerelease: true, assets }, manifest });
    expect((error as Error).message).toContain("is a pre-release");
    expect(posts).toHaveLength(0);
  });

  it("leaves a pre-release to its promotion after the build", async () => {
    const { error, log, posts } = await run(
      { release: { prerelease: true, assets }, manifest },
      { TRIGGER: "published" },
    );
    expect(error).toBeUndefined();
    expect(log).toContain("registered when it is promoted");
    expect(posts).toHaveLength(0);
  });

  it("leaves a release made a pre-release again after promotion", async () => {
    const { error, posts } = await run(
      { release: { prerelease: true, assets }, manifest },
      { TRIGGER: "released" },
    );
    expect(error).toBeUndefined();
    expect(posts).toHaveLength(0);
  });

  it("waits briefly after the build for the files to show as uploaded", async () => {
    const building = { prerelease: false, assets: [{ name: "rqg.zip", state: "uploaded" }] };
    const { error, posts } = await run(
      { release: building, releaseAfter: [published], manifest },
      { TRIGGER: "published" },
    );
    expect(error).toBeUndefined();
    expect(posts).toHaveLength(1);
  });

  it("fails after the build when the files never show as uploaded", async () => {
    const building = { prerelease: false, assets: [] };
    const { error, posts } = await run({ release: building, manifest }, { TRIGGER: "published" });
    expect((error as Error).message).toBe(
      "The release v7.1.0 has no system.json, rqg.zip attached.",
    );
    expect(posts).toHaveLength(0);
  });

  it("registers a release promoted while it was being built", async () => {
    const { error, posts } = await run({ release: published, manifest }, { TRIGGER: "published" });
    expect(error).toBeUndefined();
    expect(posts).toHaveLength(1);
  });

  it("leaves a promotion during the build to the build run", async () => {
    const building = { prerelease: false, assets: [{ name: "system.json", state: "uploaded" }] };
    const { error, log, posts } = await run(
      { release: building, manifest },
      { TRIGGER: "released" },
    );
    expect(error).toBeUndefined();
    expect(log).toContain("still being built (no rqg.zip)");
    expect(posts).toHaveLength(0);
  });

  it("fails a manual run when the files aren't attached", async () => {
    const uploading = {
      prerelease: false,
      assets: [
        { name: "rqg.zip", state: "open" },
        { name: "system.json", state: "uploaded" },
      ],
    };
    const { error, posts } = await run({ release: uploading, manifest });
    expect((error as Error).message).toBe("The release v7.1.0 has no rqg.zip attached.");
    expect(posts).toHaveLength(0);
  });

  it("fails when there is no published release, such as a draft", async () => {
    const { error } = await run({ manifest });
    expect(error).toBeInstanceOf(RegisterError);
    expect((error as Error).message).toContain("No published GitHub release for tag v7.1.0");
  });

  it("reports other GitHub failures as they are", async () => {
    const { error } = await run({ githubStatus: 502, manifest });
    expect((error as Error).message).toBe(
      "GitHub answered HTTP 502 when reading the release for tag v7.1.0.",
    );
  });

  it("fails when the manifest is missing", async () => {
    const { error } = await run({ release: published });
    expect((error as Error).message).toContain("is not available: HTTP 404");
  });

  it("fails when the manifest is another package's", async () => {
    const { error, posts } = await run({
      release: published,
      manifest: { ...manifest, id: "other" },
    });
    expect((error as Error).message).toContain("has id other, not rqg");
    expect(posts).toHaveLength(0);
  });

  it("fails when the manifest version isn't the tag's", async () => {
    const { error } = await run({
      release: published,
      manifest: { ...manifest, version: "7.0.9" },
    });
    expect((error as Error).message).toContain("has version 7.0.9, not 7.1.0");
  });

  it("warns when the release notes aren't live and still registers", async () => {
    const { error, log, posts } = await run({ release: published, manifest, notes: 404 });
    expect(error).toBeUndefined();
    expect(log).toContain("release notes are not live");
    expect(posts).toHaveLength(1);
  });

  it("treats an already registered version as a warning", async () => {
    const duplicate: Answer = [
      400,
      { status: "error", errors: { __all__: [{ code: "unique_together", message: "exists" }] } },
    ];
    const real = await run({ release: published, manifest, foundry: [duplicate] });
    expect(real.error).toBeUndefined();
    expect(real.log).toContain("already registered with Foundry.");

    const dry = await run(
      { release: published, manifest, foundry: [duplicate] },
      { DRY_RUN: "true" },
    );
    expect(dry.error).toBeUndefined();
    expect(dry.log).toContain("so the dry run stopped there");
  });

  it("fails when Foundry rejects the release", async () => {
    const { error } = await run({
      release: published,
      manifest,
      foundry: [[400, { status: "error", errors: { "release.manifest": [{ code: "invalid" }] } }]],
    });
    expect((error as Error).message).toBe("Foundry rejected the release (HTTP 400).");
  });

  it("tries again once after being rate limited", async () => {
    const { error, posts } = await run({
      release: published,
      manifest,
      foundry: [
        [429, "slow down", { "Retry-After": "5" }],
        [200, { status: "success" }],
      ],
    });
    expect(error).toBeUndefined();
    expect(posts).toHaveLength(2);
  });

  it("fails clearly on an answer that isn't JSON", async () => {
    const { error } = await run({
      release: published,
      manifest,
      foundry: [[502, "<html>Bad Gateway</html>"]],
    });
    expect((error as Error).message).toContain("with no JSON");
  });

  it("fails without a token or a version", async () => {
    expect((await run({}, { FOUNDRY_RELEASE_TOKEN: "" })).error).toBeInstanceOf(RegisterError);
    expect(((await run({}, { TAG: "" })).error as Error).message).toBe(
      '"" is not a release tag like v7.1.0.',
    );
  });

  it("refuses anything but a release tag", async () => {
    for (const TAG of ["7.1.0", " v7.1.0", "vv7.1.0", "v7.1"]) {
      expect(((await run({}, { TAG })).error as Error).message).toContain(
        "is not a release tag like",
      );
    }
  });

  it("runs under plain Node, which only strips types", () => {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(import.meta.resolve("./register-foundry-release.ts"))],
      {
        env: { PATH: process.env["PATH"] ?? "" },
        encoding: "utf8",
      },
    );
    expect(result.stdout).toContain('::error::"" is not a release tag like v7.1.0.');
    expect(result.status).toBe(1);
  });
});

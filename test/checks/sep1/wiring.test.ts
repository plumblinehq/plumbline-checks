import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { run } from "../../../src/runner.js";
import { all } from "../../../src/registry.js";
import { InMemoryArtifactCache } from "../../../src/probe/cache.js";
import { RateLimitedHttpClient } from "../../../src/probe/http.js";
import { makeEnv } from "../../helpers.js";

// Importing the checks index registers every check shipped so far.
import "../../../src/checks/index.js";

const fixture = (name: string): string =>
  readFileSync(`test/fixtures/sep1/${name}`, "utf8").replaceAll("\r\n", "\n");

describe("sep1 check wiring", () => {
  it("registers each shipped sep1 check exactly once", () => {
    const ids = all()
      .filter((c) => c.id.startsWith("sep1."))
      .map((c) => c.id);
    for (const id of [
      "sep1.toml-reachable",
      "sep1.toml-cors",
      "sep1.toml-content-type",
      "sep1.toml-size",
      "sep1.toml-parses",
      "sep1.network-passphrase-valid",
    ]) {
      expect(ids).toContain(id);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("runs the tranche through the runner with one shared fetch", async () => {
    let fetches = 0;
    const env = makeEnv(() => ({ status: 200, body: fixture("valid.toml") }));
    env.http = new RateLimitedHttpClient({
      fetchImpl: async () => {
        fetches += 1;
        return new Response(fixture("valid.toml"), {
          status: 200,
          headers: { "content-type": "text/plain", "access-control-allow-origin": "*" },
        });
      },
      minIntervalMs: 0,
      jitterMs: 0,
      cache: new InMemoryArtifactCache(),
    });

    const results = await run(env, { seps: [1] });
    // Prerequisites before dependents; order among equals is unspecified.
    expect(results[0]?.checkId).toBe("sep1.toml-reachable");
    expect(results[0]?.status).toBe("pass");
    const statuses = new Map(results.map((r) => [r.checkId, r.status]));
    expect(statuses.get("sep1.toml-content-type")).toBe("pass");
    expect(statuses.get("sep1.toml-cors")).toBe("pass");
    expect(statuses.get("sep1.toml-parses")).toBe("pass");
    expect(statuses.get("sep1.toml-size")).toBe("pass");
    expect(fetches).toBe(1);
    expect(env.toml?.VERSION).toBe("2.0.0");
  });

  it("skips the dependent checks when the file is unreachable", async () => {
    const env = makeEnv(() => ({ status: 404, body: "nope" }));
    env.http = new RateLimitedHttpClient({
      fetchImpl: async () => new Response("nope", { status: 404 }),
      minIntervalMs: 0,
      jitterMs: 0,
      cache: new InMemoryArtifactCache(),
    });

    const results = await run(env, { seps: [1] });
    const reachable = results.find((r) => r.checkId === "sep1.toml-reachable");
    expect(reachable?.status).toBe("fail");
    for (const result of results.filter((r) => r.checkId !== "sep1.toml-reachable")) {
      expect(result.status).toBe("skip");
      // Every skip names the prerequisite that caused it.
      expect(result.message).toMatch(/prerequisite "sep1\./);
    }
  });

  it("fails the CORS check while the parse still shares the result", async () => {
    // Note: undici synthesizes content-type from a string body, so an explicit
    // text/plain is set here and only the CORS header is left out.
    const env = makeEnv(() => ({ status: 200, body: fixture("valid.toml") }));
    env.http = new RateLimitedHttpClient({
      fetchImpl: async () =>
        new Response(fixture("valid.toml"), {
          status: 200,
          headers: { "content-type": "text/plain" },
        }),
      minIntervalMs: 0,
      jitterMs: 0,
      cache: new InMemoryArtifactCache(),
    });

    const results = await run(env, { seps: [1] });
    const byId = new Map(results.map((r) => [r.checkId, r]));
    expect(results[0]?.checkId).toBe("sep1.toml-reachable");
    expect(byId.get("sep1.toml-content-type")?.status).toBe("pass");
    expect(byId.get("sep1.toml-cors")?.status).toBe("fail");
    expect(byId.get("sep1.toml-parses")?.status).toBe("pass");
    expect(env.toml?.SIGNING_KEY).toBe(
      "GBBHQ7H4V6RRORKYLHTCAWP6MOHNORRFJSDPXDFYDGJB2LPZUFPXUEW3",
    );
  });
});

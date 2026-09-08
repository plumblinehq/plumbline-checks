import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tomlReachable } from "../../../src/checks/sep1/tomlReachable.js";
import { tomlParses } from "../../../src/checks/sep1/tomlParses.js";
import { InMemoryArtifactCache } from "../../../src/probe/cache.js";
import { RateLimitedHttpClient } from "../../../src/probe/http.js";
import { makeEnv } from "../../helpers.js";

const fixture = (name: string): string =>
  readFileSync(`test/fixtures/sep1/${name}`, "utf8").replaceAll("\r\n", "\n");

describe("sep1.toml-parses", () => {
  it("passes on the valid fixture and populates env.toml", async () => {
    const env = makeEnv(() => ({ status: 200, body: fixture("valid.toml") }));
    const outcome = await tomlParses.run(env);
    expect(outcome.status).toBe("pass");
    expect(env.toml?.VERSION).toBe("2.0.0");
    expect(env.toml?.SIGNING_KEY).toBe(
      "GBBHQ7H4V6RRORKYLHTCAWP6MOHNORRFJSDPXDFYDGJB2LPZUFPXUEW3",
    );
  });

  it("passes on an empty document (valid TOML, no fields)", async () => {
    const env = makeEnv(() => ({ status: 200, body: "" }));
    const outcome = await tomlParses.run(env);
    expect(outcome.status).toBe("pass");
    expect(env.toml).toEqual({});
  });

  it("fails on invalid TOML with the parser's location", async () => {
    const env = makeEnv(() => ({ status: 200, body: fixture("invalid.toml") }));
    const outcome = await tomlParses.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toMatch(/not valid TOML/);
    // smol-toml reports the offending line number and content.
    expect(outcome.message).toMatch(/\d+:/);
    expect(outcome.message).toContain("[DOCUMENTATION");
  });

  it("fails on a value without a closing quote", async () => {
    const env = makeEnv(() => ({ status: 200, body: 'VERSION="2.0.0\n' }));
    const outcome = await tomlParses.run(env);
    expect(outcome.status).toBe("fail");
  });

  it("does not populate env.toml on failure", async () => {
    const env = makeEnv(() => ({ status: 200, body: "not toml at all ][" }));
    await tomlParses.run(env);
    expect(env.toml).toBeUndefined();
  });

  it("skips when the toml was not reachable", async () => {
    const env = makeEnv(() => ({ status: 404, body: "nope" }));
    const outcome = await tomlParses.run(env);
    expect(outcome.status).toBe("skip");
    expect(outcome.message).toContain("404");
    expect(env.toml).toBeUndefined();
  });

  it("records the raw body as evidence on failure", async () => {
    const body = "not toml at all ][";
    const env = makeEnv(() => ({ status: 200, body }));
    const outcome = await tomlParses.run(env);
    expect(outcome.evidence[0]?.body).toBe(body);
  });

  it("shares one cached request between the fetch-level checks", async () => {
    let fetches = 0;
    const env = makeEnv(() => ({ status: 200, body: fixture("valid.toml") }));
    env.http = new RateLimitedHttpClient({
      fetchImpl: async () => {
        fetches += 1;
        return new Response(fixture("valid.toml"), { status: 200 });
      },
      minIntervalMs: 0,
      jitterMs: 0,
      cache: new InMemoryArtifactCache(),
    });

    await tomlReachable.run(env);
    await tomlParses.run(env);
    expect(fetches).toBe(1);
    expect(env.toml?.VERSION).toBe("2.0.0");
  });
});

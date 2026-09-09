import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { run } from "../../../src/runner.js";
import { all } from "../../../src/registry.js";
import { InMemoryArtifactCache } from "../../../src/probe/cache.js";
import { RateLimitedHttpClient } from "../../../src/probe/http.js";
import { makeEnv, type FakeResponse } from "../../helpers.js";

// Importing the checks index registers every check shipped so far.
import "../../../src/checks/index.js";

const TOML_URL = "https://example.com/.well-known/stellar.toml";

const fixture = (name: string): string =>
  readFileSync(`test/fixtures/sep1/${name}`, "utf8").replaceAll("\r\n", "\n");

const TOML_HEADERS = { "content-type": "text/plain", "access-control-allow-origin": "*" };

/**
 * Build an Env whose HTTP client serves one canned response per URL, with a
 * per-run artifact cache so repeated fetches of the same URL count once.
 */
function envFor(handler: (url: string) => FakeResponse): ReturnType<typeof makeEnv> {
  const env = makeEnv(() => ({ status: 404, body: "no route" }));
  env.http = new RateLimitedHttpClient({
    fetchImpl: async (input: string | URL | Request) => {
      const url = String(input);
      const fake = await handler(url);
      return new Response(fake.body ?? "", {
        status: fake.status ?? 200,
        headers: fake.headers ?? {},
      });
    },
    minIntervalMs: 0,
    jitterMs: 0,
    cache: new InMemoryArtifactCache(),
  });
  return env;
}

/** Every check id in the SEP-1 catalogue, in alphabetical order. */
const SEP1_CATALOGUE = [
  "sep1.accounts-valid",
  "sep1.currencies-present",
  "sep1.currency-anchor-asset-type-valid",
  "sep1.currency-code-length",
  "sep1.currency-display-decimals-range",
  "sep1.currency-image-reachable",
  "sep1.currency-issuance-policy-exclusive",
  "sep1.currency-issuer-or-contract",
  "sep1.currency-name-length",
  "sep1.currency-regulated-has-approval-server",
  "sep1.currency-status-valid",
  "sep1.currency-toml-link-resolves",
  "sep1.documentation-present",
  "sep1.endpoints-https",
  "sep1.network-passphrase-valid",
  "sep1.org-logo-reachable",
  "sep1.org-official-email-domain",
  "sep1.org-phone-e164",
  "sep1.org-url-https",
  "sep1.org-url-same-domain",
  "sep1.signing-key-valid",
  "sep1.toml-content-type",
  "sep1.toml-cors",
  "sep1.toml-parses",
  "sep1.toml-reachable",
  "sep1.toml-size",
  "sep1.validator-alias-format",
  "sep1.validator-fields-present",
  "sep1.version-present",
  "sep1.web-auth-contract-id-valid",
];

describe("sep1 check wiring", () => {
  it("registers every check in the SEP-1 catalogue exactly once", () => {
    const ids = all()
      .filter((c) => c.id.startsWith("sep1."))
      .map((c) => c.id)
      .sort();
    expect(ids).toEqual(SEP1_CATALOGUE);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("runs the tranche through the runner with one shared fetch", async () => {
    let fetches = 0;
    const env = envFor((url) => {
      expect(url).toBe(TOML_URL);
      fetches += 1;
      return { status: 200, body: fixture("valid.toml"), headers: TOML_HEADERS };
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

  it("passes every applicable check against the valid fixture", async () => {
    const env = envFor((url) => {
      expect(url).toBe(TOML_URL);
      return { status: 200, body: fixture("valid.toml"), headers: TOML_HEADERS };
    });

    const results = await run(env, { seps: [1] });
    const statuses = new Map(results.map((r) => [r.checkId, r.status]));
    // Optional fields the fixture does not declare are skipped, never failed.
    const skips = new Set([
      "sep1.accounts-valid",
      "sep1.web-auth-contract-id-valid",
      "sep1.org-logo-reachable",
      "sep1.currency-issuance-policy-exclusive",
      "sep1.currency-anchor-asset-type-valid",
      "sep1.currency-regulated-has-approval-server",
      "sep1.currency-toml-link-resolves",
      "sep1.currency-image-reachable",
    ]);
    for (const id of SEP1_CATALOGUE) {
      expect(statuses.get(id), id).toBe(skips.has(id) ? "skip" : "pass");
    }
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

  it("fails every field-level check on the strkey-failures fixture", async () => {
    const env = envFor((url) => {
      expect(url).toBe(TOML_URL);
      return { status: 200, body: fixture("strkey-failures.toml"), headers: TOML_HEADERS };
    });

    const results = await run(env, { seps: [1] });
    const statuses = new Map(results.map((r) => [r.checkId, r.status]));
    expect(statuses.get("sep1.toml-reachable")).toBe("pass");
    expect(statuses.get("sep1.toml-parses")).toBe("pass");
    expect(statuses.get("sep1.network-passphrase-valid")).toBe("fail");
    expect(statuses.get("sep1.signing-key-valid")).toBe("fail");
    expect(statuses.get("sep1.endpoints-https")).toBe("fail");
    expect(statuses.get("sep1.accounts-valid")).toBe("fail");
    expect(statuses.get("sep1.web-auth-contract-id-valid")).toBe("fail");
  });

  it("skips optional strkey fields that the valid fixture does not declare", async () => {
    const env = envFor((url) => {
      expect(url).toBe(TOML_URL);
      return { status: 200, body: fixture("valid.toml"), headers: TOML_HEADERS };
    });

    const results = await run(env, { seps: [1] });
    const statuses = new Map(results.map((r) => [r.checkId, r.status]));
    expect(statuses.get("sep1.network-passphrase-valid")).toBe("pass");
    expect(statuses.get("sep1.signing-key-valid")).toBe("pass");
    expect(statuses.get("sep1.endpoints-https")).toBe("pass");
    expect(statuses.get("sep1.accounts-valid")).toBe("skip");
    expect(statuses.get("sep1.web-auth-contract-id-valid")).toBe("skip");
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

  it("fails the organization checks on the org-failures fixture", async () => {
    const env = envFor((url) => {
      if (url === TOML_URL) {
        return { status: 200, body: fixture("org-failures.toml"), headers: TOML_HEADERS };
      }
      if (url === "https://www.example.com/logo.png") {
        return { status: 404, body: "" };
      }
      return { status: 404, body: "no route" };
    });

    const results = await run(env, { seps: [1] });
    const statuses = new Map(results.map((r) => [r.checkId, r.status]));
    expect(statuses.get("sep1.org-url-https")).toBe("fail");
    expect(statuses.get("sep1.org-url-same-domain")).toBe("fail");
    expect(statuses.get("sep1.org-official-email-domain")).toBe("fail");
    expect(statuses.get("sep1.org-phone-e164")).toBe("fail");
    expect(statuses.get("sep1.org-logo-reachable")).toBe("fail");
  });

  it("fails the currency checks on the currency-failures fixture", async () => {
    const env = envFor((url) => {
      expect(url).toBe(TOML_URL);
      return { status: 200, body: fixture("currency-failures.toml"), headers: TOML_HEADERS };
    });

    const results = await run(env, { seps: [1] });
    const statuses = new Map(results.map((r) => [r.checkId, r.status]));
    expect(statuses.get("sep1.currencies-present")).toBe("pass");
    expect(statuses.get("sep1.currency-code-length")).toBe("fail");
    expect(statuses.get("sep1.currency-issuer-or-contract")).toBe("fail");
    expect(statuses.get("sep1.currency-status-valid")).toBe("fail");
    expect(statuses.get("sep1.currency-display-decimals-range")).toBe("fail");
    expect(statuses.get("sep1.currency-name-length")).toBe("fail");
    expect(statuses.get("sep1.currency-issuance-policy-exclusive")).toBe("fail");
    expect(statuses.get("sep1.currency-anchor-asset-type-valid")).toBe("fail");
    expect(statuses.get("sep1.currency-regulated-has-approval-server")).toBe("fail");
    expect(statuses.get("sep1.currency-image-reachable")).toBe("skip");
    expect(statuses.get("sep1.currency-toml-link-resolves")).toBe("skip");
  });

  it("passes the currency checks on the currency-valid fixture and resolves its toml= link", async () => {
    let fetches = 0;
    const env = envFor((url) => {
      fetches += 1;
      if (url === TOML_URL) {
        return { status: 200, body: fixture("currency-valid.toml"), headers: TOML_HEADERS };
      }
      if (url === "https://example.com/.well-known/CURRENCY.toml") {
        return { status: 200, body: fixture("currency-linked.toml") };
      }
      return { status: 404, body: "no route" };
    });

    const results = await run(env, { seps: [1] });
    const statuses = new Map(results.map((r) => [r.checkId, r.status]));
    expect(statuses.get("sep1.currency-toml-link-resolves")).toBe("pass");
    expect(statuses.get("sep1.currency-code-length")).toBe("pass");
    expect(statuses.get("sep1.currency-issuer-or-contract")).toBe("pass");
    expect(statuses.get("sep1.currency-status-valid")).toBe("pass");
    expect(statuses.get("sep1.currency-display-decimals-range")).toBe("pass");
    expect(statuses.get("sep1.currency-issuance-policy-exclusive")).toBe("pass");
    expect(statuses.get("sep1.currency-anchor-asset-type-valid")).toBe("pass");
    expect(statuses.get("sep1.currency-regulated-has-approval-server")).toBe("skip");
    expect(fetches).toBe(2);
  });

  it("fails the validator checks on the validator-failures fixture", async () => {
    const env = envFor((url) => {
      expect(url).toBe(TOML_URL);
      return { status: 200, body: fixture("validator-failures.toml"), headers: TOML_HEADERS };
    });

    const results = await run(env, { seps: [1] });
    const statuses = new Map(results.map((r) => [r.checkId, r.status]));
    expect(statuses.get("sep1.validator-alias-format")).toBe("fail");
    expect(statuses.get("sep1.validator-fields-present")).toBe("fail");
  });
});
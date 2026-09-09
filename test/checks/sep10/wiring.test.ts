import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { run } from "../../../src/runner.js";
import { InMemoryArtifactCache } from "../../../src/probe/cache.js";
import { RateLimitedHttpClient } from "../../../src/probe/http.js";
import { makeEnv } from "../../helpers.js";
import {
  NETWORK_PASSPHRASE,
  authOperation,
  buildChallenge,
  clientDomainOperation,
  webAuthDomainOperation,
} from "../../fixtures/sep10/challenge.js";

// Importing the checks index registers every check shipped so far.
import "../../../src/checks/index.js";

const TOML_URL = "https://example.com/.well-known/stellar.toml";
const AUTH_URL = "https://example.com/auth";
const TOML_HEADERS = { "content-type": "text/plain", "access-control-allow-origin": "*" };
const CORS = { "access-control-allow-origin": "*" };

const fixture = (name: string): string =>
  readFileSync(`test/fixtures/sep10/${name}`, "utf8").replaceAll("\r\n", "\n");

/** Every SEP-10 check id in the catalogue. */
const SEP10_CATALOGUE = [
  "sep10.challenge-decodes",
  "sep10.challenge-first-op-key",
  "sep10.challenge-first-op-manage-data",
  "sep10.challenge-first-op-source",
  "sep10.challenge-has-operations",
  "sep10.challenge-has-timebounds",
  "sep10.challenge-json-shape",
  "sep10.challenge-nonce-shape",
  "sep10.challenge-other-ops-source",
  "sep10.challenge-returns-200",
  "sep10.challenge-sequence-zero",
  "sep10.challenge-server-signature",
  "sep10.challenge-source-is-server-account",
  "sep10.challenge-timebound-window",
  "sep10.challenge-web-auth-domain-op",
  "sep10.cors-headers",
  "sep10.endpoint-declared",
  "sep10.error-response-shape",
  "sep10.network-passphrase-consistent",
  "sep10.network-passphrase-returned",
  "sep10.options-preflight",
  "sep10.rejects-missing-account",
];

interface ChallengeServerOptions {
  toml?: string;
  /** Extra operations appended after the auth operation. */
  extraOperations?: ReturnType<typeof authOperation | typeof webAuthDomainOperation | typeof clientDomainOperation>[];
  signedBy?: Parameters<typeof buildChallenge>[0]["signedBy"];
  /** Overrides for the served challenge response body. */
  responseOverrides?: {
    network_passphrase?: string;
    transaction?: string;
  };
  missingAccountStatus?: number;
}

/**
 * A fake auth server: serves the toml, builds a fresh challenge for
 * whichever ephemeral account the runner supplies, implements the OPTIONS
 * preflight, and answers the missing-account request with an error.
 */
function envFor(options: ChallengeServerOptions = {}) {
  const env = makeEnv(() => ({ status: 404, body: "no route" }));
  let fetches = 0;
  env.http = new RateLimitedHttpClient({
    fetchImpl: async (input: string | URL | Request, init?: RequestInit) => {
      fetches += 1;
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url === TOML_URL) {
        return new Response(fixture(options.toml ?? "valid.toml"), {
          status: 200,
          headers: TOML_HEADERS,
        });
      }
      if (url.startsWith(AUTH_URL)) {
        if (method === "OPTIONS") {
          return new Response("", { status: 200, headers: CORS });
        }
        const account = new URL(url).searchParams.get("account");
        if (account === null) {
          return new Response(JSON.stringify({ error: "account parameter is required" }), {
            status: options.missingAccountStatus ?? 400,
            headers: CORS,
          });
        }
        const operations = [authOperation(account), ...(options.extraOperations ?? [])];
        const transaction =
          options.responseOverrides?.transaction ??
          buildChallenge({ clientAccount: account, operations, signedBy: options.signedBy });
        const body = JSON.stringify({
          transaction,
          network_passphrase:
            options.responseOverrides?.network_passphrase ?? NETWORK_PASSPHRASE,
        });
        return new Response(body, { status: 200, headers: CORS });
      }
      return new Response("no route", { status: 404 });
    },
    minIntervalMs: 0,
    jitterMs: 0,
    cache: new InMemoryArtifactCache(),
  });
  return { env, fetches: () => fetches };
}

describe("sep10 check wiring", () => {
  it("registers every check in the SEP-10 catalogue exactly once", async () => {
    const { all } = await import("../../../src/registry.js");
    const ids = all()
      .filter((c) => c.sep === 10)
      .map((c) => c.id)
      .sort();
    expect(ids).toEqual(SEP10_CATALOGUE);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("passes every applicable check on the valid fixture", async () => {
    const { env, fetches } = envFor({
      extraOperations: [webAuthDomainOperation(), clientDomainOperation()],
    });
    const results = await run(env, { seps: [10] });
    const statuses = new Map(results.filter((r) => r.sep === 10).map((r) => [r.checkId, r.status]));
    for (const id of SEP10_CATALOGUE) {
      expect(statuses.get(id), id).toBe("pass");
    }
    // One toml fetch, one challenge fetch, one preflight, one missing-account
    // request — the response-level checks share the challenge via the cache.
    expect(fetches()).toBe(4);
  });

  it("skips every SEP-10 check when web auth is not declared", async () => {
    const { env } = envFor({ toml: "missing-signing-key.toml" });
    const results = await run(env, { seps: [10] });
    const byId = new Map(results.map((r) => [r.checkId, r]));
    expect(byId.get("sep10.endpoint-declared")?.status).toBe("fail");
    for (const id of SEP10_CATALOGUE) {
      if (id !== "sep10.endpoint-declared") {
        expect(byId.get(id)?.status, id).toBe("skip");
      }
    }
  });

  it("fails the signature check on an unsigned challenge", async () => {
    const { env } = envFor({ signedBy: [] });
    const results = await run(env, { seps: [10] });
    const statuses = new Map(results.map((r) => [r.checkId, r.status]));
    expect(statuses.get("sep10.challenge-server-signature")).toBe("fail");
    expect(statuses.get("sep10.challenge-source-is-server-account")).toBe("pass");
  });

  it("fails the passphrase consistency check when the response disagrees with the toml", async () => {
    const { env } = envFor({
      responseOverrides: { network_passphrase: "Public Global Stellar Network ; September 2015" },
    });
    const results = await run(env, { seps: [10] });
    const statuses = new Map(results.map((r) => [r.checkId, r.status]));
    expect(statuses.get("sep10.network-passphrase-consistent")).toBe("fail");
    expect(statuses.get("sep10.network-passphrase-returned")).toBe("pass");
    // The signature check follows the toml passphrase (testnet), which the
    // challenge was actually signed over, so it still verifies — the mismatch
    // is the server's declaration, caught by the consistency check alone.
    expect(statuses.get("sep10.challenge-server-signature")).toBe("pass");
  });

  it("fails rejects-missing-account when the endpoint answers 500", async () => {
    const { env } = envFor({ missingAccountStatus: 500 });
    const results = await run(env, { seps: [10] });
    const statuses = new Map(results.map((r) => [r.checkId, r.status]));
    expect(statuses.get("sep10.error-response-shape")).toBe("pass");
    expect(statuses.get("sep10.rejects-missing-account")).toBe("fail");
  });
});
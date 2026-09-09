import { describe, expect, it } from "vitest";
import { challengeReturns200 } from "../../../src/checks/sep10/challengeReturns200.js";
import { RateLimitedHttpClient } from "../../../src/probe/http.js";
import { makeEnv } from "../../helpers.js";
import { AUTH_ENDPOINT, envWithSep10 } from "./helpers.js";

describe("sep10.challenge-returns-200", () => {
  it("passes on 200 and stores the shared context", async () => {
    const env = envWithSep10();
    let requested: string | undefined;
    env.http = makeEnv((url) => {
      requested = url;
      return { status: 200, body: '{"transaction":"AAAA"}' };
    }).http;
    const outcome = await challengeReturns200.run(env);
    expect(outcome.status).toBe("pass");
    expect(requested).toContain(`${AUTH_ENDPOINT}?account=`);
    expect(env.sep10?.account).toMatch(/^G/);
    expect(env.sep10?.endpointUrl).toBe(AUTH_ENDPOINT);
    expect(env.sep10?.response.status).toBe(200);
  });

  it("fails on a non-200 response", async () => {
    const env = envWithSep10();
    env.http = makeEnv(() => ({ status: 500, body: "boom" })).http;
    const outcome = await challengeReturns200.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("HTTP 500");
  });

  it("skips when the endpoint requires authorization", async () => {
    const env = envWithSep10();
    env.http = makeEnv(() => ({ status: 401, body: '{"error":"Missing authorization header"}' })).http;
    const outcome = await challengeReturns200.run(env);
    expect(outcome.status).toBe("skip");
    expect(outcome.message).toContain("authorization");
  });

  it("records the response as evidence", async () => {
    const env = envWithSep10();
    env.http = makeEnv(() => ({ status: 200, body: '{"transaction":"AAAA"}' })).http;
    const outcome = await challengeReturns200.run(env);
    expect(outcome.evidence[0]?.method).toBe("GET");
    expect(outcome.evidence[0]?.statusCode).toBe(200);
  });

  it("sends a browser-like Origin header", async () => {
    // SEP-10 §Cross-Origin Headers exists for browser wallets from other
    // sites, which always send Origin; the fetch must simulate that so
    // conditional-CORS servers (vary: Origin) emit their headers.
    const env = envWithSep10();
    let origin: string | null = null;
    env.http = new RateLimitedHttpClient({
      fetchImpl: async (_input: string | URL | Request, init?: RequestInit) => {
        origin = new Headers(init?.headers).get("origin");
        return new Response('{"transaction":"AAAA"}', { status: 200 });
      },
      minIntervalMs: 0,
      jitterMs: 0,
    });
    const outcome = await challengeReturns200.run(env);
    expect(outcome.status).toBe("pass");
    expect(origin).toBeTruthy();
  });
});
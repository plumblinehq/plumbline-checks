import { describe, expect, it } from "vitest";
import { optionsPreflight } from "../../../src/checks/sep10/optionsPreflight.js";
import { RateLimitedHttpClient } from "../../../src/probe/http.js";
import { envWithSep10 } from "./helpers.js";

/** An Env whose client observes each request's method and headers. */
function envWithOptionsClient(
  handler: (method: string, headers: Headers) => { status: number; headers?: Record<string, string>; body?: string },
) {
  const env = envWithSep10();
  env.http = new RateLimitedHttpClient({
    fetchImpl: async (_input: string | URL | Request, init?: RequestInit) => {
      const fake = handler(init?.method ?? "GET", new Headers(init?.headers));
      return new Response(fake.body ?? "", {
        status: fake.status,
        headers: fake.headers ?? {},
      });
    },
    minIntervalMs: 0,
    jitterMs: 0,
  });
  return env;
}

describe("sep10.options-preflight", () => {
  it("passes when the preflight returns 2xx with the wildcard CORS header", async () => {
    const env = envWithOptionsClient((method) => {
      expect(method).toBe("OPTIONS");
      return { status: 200, headers: { "access-control-allow-origin": "*" } };
    });
    const outcome = await optionsPreflight.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-10 §Cross-Origin Headers");
  });

  it("fails when the preflight is not implemented", async () => {
    const env = envWithOptionsClient(() => ({ status: 405, body: "" }));
    const outcome = await optionsPreflight.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("HTTP 405");
  });

  it("fails when the preflight response has no CORS header", async () => {
    const env = envWithOptionsClient(() => ({ status: 200, body: "" }));
    const outcome = await optionsPreflight.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("Access-Control-Allow-Origin");
  });

  it("sends origin and access-control-request-method headers", async () => {
    const env = envWithOptionsClient((_method, headers) => {
      expect(headers.get("origin")).toBeTruthy();
      expect(headers.get("access-control-request-method")).toBe("GET");
      return { status: 200, headers: { "access-control-allow-origin": "*" } };
    });
    const outcome = await optionsPreflight.run(env);
    expect(outcome.status).toBe("pass");
  });
});
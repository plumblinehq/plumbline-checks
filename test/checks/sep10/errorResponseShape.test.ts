import { describe, expect, it } from "vitest";
import { errorResponseShape } from "../../../src/checks/sep10/errorResponseShape.js";
import { RateLimitedHttpClient } from "../../../src/probe/http.js";
import { envWithSep10 } from "./helpers.js";

function envWithClient(
  handler: (url: string) => { status: number; body?: string; headers?: Record<string, string> },
) {
  const env = envWithSep10();
  env.http = new RateLimitedHttpClient({
    fetchImpl: async (input: string | URL | Request) => {
      const fake = handler(String(input));
      return new Response(fake.body ?? "", { status: fake.status, headers: fake.headers ?? {} });
    },
    minIntervalMs: 0,
    jitterMs: 0,
  });
  return env;
}

describe("sep10.error-response-shape", () => {
  it("passes when a malformed request returns JSON with an error field", async () => {
    const env = envWithClient(() => ({
      status: 400,
      body: JSON.stringify({ error: "account parameter is required" }),
    }));
    const outcome = await errorResponseShape.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-10 §Response (Error)");
    expect(env.sep10MissingAccountResponse?.status).toBe(400);
  });

  it("fails when the endpoint accepts the malformed request", async () => {
    const env = envWithClient(() => ({ status: 200, body: '{"transaction":"AAAA"}' }));
    const outcome = await errorResponseShape.run(env);
    expect(outcome.status).toBe("fail");
    expect(errorResponseShape.severity).toBe("warning");
  });

  it("fails when the error body is not JSON", async () => {
    const env = envWithClient(() => ({ status: 400, body: "plain text" }));
    const outcome = await errorResponseShape.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("not JSON");
  });

  it("fails when the error body has no error field", async () => {
    const env = envWithClient(() => ({ status: 400, body: JSON.stringify({ detail: "nope" }) }));
    const outcome = await errorResponseShape.run(env);
    expect(outcome.status).toBe("fail");
  });
});
import { consoleLogger, type Env } from "../src/core.js";
import { RateLimitedHttpClient } from "../src/probe/http.js";

/** A canned response a test's fake fetch serves. */
export interface FakeResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: string;
}

/**
 * Build an Env whose HTTP client serves canned responses. The client runs with
 * no rate limiting or jitter so tests stay fast; nothing here touches the
 * network.
 */
export function makeEnv(
  handler: (url: string) => FakeResponse | Promise<FakeResponse>,
  overrides: Partial<Env> = {},
): Env {
  const fetchImpl = async (input: string | URL | Request): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    const fake = await handler(url);
    return new Response(fake.body ?? "", {
      status: fake.status ?? 200,
      statusText: fake.statusText ?? "OK",
      headers: fake.headers ?? {},
    });
  };
  return {
    homeDomain: "example.com",
    network: "pubnet",
    http: new RateLimitedHttpClient({
      fetchImpl,
      minIntervalMs: 0,
      jitterMs: 0,
    }),
    now: () => new Date("2026-01-01T00:00:00Z"),
    logger: consoleLogger,
    ...overrides,
  };
}

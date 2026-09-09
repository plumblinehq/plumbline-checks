import { describe, expect, it } from "vitest";
import {
  DEFAULT_USER_AGENT,
  RateLimitedHttpClient,
} from "../../src/probe/http.js";
import { InMemoryArtifactCache } from "../../src/probe/cache.js";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface FakeCall {
  url: string;
  init: RequestInit;
}

describe("RateLimitedHttpClient", () => {
  it("returns status, headers, body and url", async () => {
    const calls: FakeCall[] = [];
    const fetchImpl = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response("hello", {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "text/plain" },
      });
    };
    const client = new RateLimitedHttpClient({ fetchImpl, minIntervalMs: 0, jitterMs: 0 });

    const response = await client.get("https://example.com/.well-known/stellar.toml");

    expect(response.status).toBe(200);
    expect(response.body).toBe("hello");
    expect(response.headers.get("content-type")).toBe("text/plain");
    expect(response.url).toBe("https://example.com/.well-known/stellar.toml");
    expect(calls[0]?.init.method).toBe("GET");
  });

  it("sends a User-Agent carrying a contact URL", async () => {
    const seen: string[] = [];
    const fetchImpl = async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      seen.push(new Headers(init?.headers).get("user-agent") ?? "");
      return new Response("ok", { status: 200 });
    };
    const client = new RateLimitedHttpClient({ fetchImpl, minIntervalMs: 0, jitterMs: 0 });
    await client.get("https://example.com/");
    expect(seen[0]).toBe(DEFAULT_USER_AGENT);
    expect(DEFAULT_USER_AGENT).toContain("https://github.com/plumblinehq/plumbline-checks");
  });

  it("allows the User-Agent to be overridden", async () => {
    const seen: string[] = [];
    const fetchImpl = async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      seen.push(new Headers(init?.headers).get("user-agent") ?? "");
      return new Response("ok", { status: 200 });
    };
    const client = new RateLimitedHttpClient({
      fetchImpl,
      minIntervalMs: 0,
      jitterMs: 0,
      userAgent: "plumbline-server/0.1.0 (+https://plumbline.dev)",
    });
    await client.get("https://example.com/");
    expect(seen[0]).toBe("plumbline-server/0.1.0 (+https://plumbline.dev)");
  });

  it("keeps at most one request in flight per host", async () => {
    let inflight = 0;
    let maxInflight = 0;
    const fetchImpl = async (_url: string | URL | Request, _init?: RequestInit): Promise<Response> => {
      inflight += 1;
      maxInflight = Math.max(maxInflight, inflight);
      await sleep(25);
      inflight -= 1;
      return new Response("ok", { status: 200 });
    };
    const client = new RateLimitedHttpClient({ fetchImpl, minIntervalMs: 0, jitterMs: 0 });

    await Promise.all([
      client.get("https://example.com/a"),
      client.get("https://example.com/b"),
      client.get("https://example.com/c"),
    ]);

    expect(maxInflight).toBe(1);
  });

  it("allows different hosts to be fetched concurrently", async () => {
    let inflight = 0;
    let maxInflight = 0;
    const fetchImpl = async (_url: string | URL | Request, _init?: RequestInit): Promise<Response> => {
      inflight += 1;
      maxInflight = Math.max(maxInflight, inflight);
      await sleep(25);
      inflight -= 1;
      return new Response("ok", { status: 200 });
    };
    const client = new RateLimitedHttpClient({ fetchImpl, minIntervalMs: 0, jitterMs: 0 });

    await Promise.all([
      client.get("https://a.example.com/x"),
      client.get("https://b.example.com/x"),
    ]);

    expect(maxInflight).toBe(2);
  });

  it("spaces requests to the same host by the minimum interval", async () => {
    const starts: number[] = [];
    const fetchImpl = async (_url: string | URL | Request, _init?: RequestInit): Promise<Response> => {
      starts.push(performance.now());
      return new Response("ok", { status: 200 });
    };
    const client = new RateLimitedHttpClient({ fetchImpl, minIntervalMs: 40, jitterMs: 0 });

    await client.get("https://example.com/one");
    await client.get("https://example.com/two");

    expect(starts).toHaveLength(2);
    // The gate re-checks the elapsed time after each wake and sleeps the
    // remainder, so the interval holds against the monotonic clock; the
    // observed gap is the interval plus microtask slop. The epsilon guards
    // against nothing but timer resolution at the loop exit.
    expect(starts[1]! - starts[0]!).toBeGreaterThanOrEqual(40 - 1);
  });

  it("serves repeated requests from the per-run cache", async () => {
    let fetches = 0;
    const fetchImpl = async (_url: string | URL | Request, _init?: RequestInit): Promise<Response> => {
      fetches += 1;
      return new Response("cached-body", { status: 200 });
    };
    const client = new RateLimitedHttpClient({
      fetchImpl,
      minIntervalMs: 0,
      jitterMs: 0,
      cache: new InMemoryArtifactCache(),
    });

    const first = await client.get("https://example.com/same");
    const second = await client.get("https://example.com/same");

    expect(fetches).toBe(1);
    expect(second).toBe(first);
    expect(second.body).toBe("cached-body");
  });

  it("rejects when the request times out", async () => {
    const fetchImpl = async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(init.signal?.reason ?? new Error("aborted")),
        );
      });
    };
    const client = new RateLimitedHttpClient({
      fetchImpl,
      minIntervalMs: 0,
      jitterMs: 0,
      timeoutMs: 30,
    });

    await expect(client.get("https://example.com/slow")).rejects.toThrow(/timed out/);
  });

  it("caps oversized response bodies", async () => {
    const fetchImpl = async (_url: string | URL | Request, _init?: RequestInit): Promise<Response> => {
      return new Response("abcdefghijklmnopqrstuvwxyz", { status: 200 });
    };
    const client = new RateLimitedHttpClient({
      fetchImpl,
      minIntervalMs: 0,
      jitterMs: 0,
      maxBodyBytes: 10,
    });

    const response = await client.get("https://example.com/big");
    expect(response.body).toBe("abcdefghij");
  });

});
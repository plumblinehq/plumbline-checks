import { consoleLogger, type HttpClient, type HttpResponse, type Logger } from "../core.js";
import type { ArtifactCache } from "./cache.js";

/** Minimum gap between requests to the same host, ms. */
export const DEFAULT_MIN_INTERVAL_MS = 2_000;
/** Random jitter added to the per-host gap, ms (0–20% of the interval by default). */
export const DEFAULT_JITTER_MS = 400;
/** Per-request timeout, ms. */
export const DEFAULT_TIMEOUT_MS = 15_000;
/** Cap on response bodies kept by the client, bytes. Evidence truncates further. */
export const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
/** User-Agent carrying a contact URL; may be overridden per deployment. */
export const DEFAULT_USER_AGENT =
  "plumbline-checks (+https://github.com/plumblinehq/plumbline-checks)";

export interface HttpClientOptions {
  /** Minimum gap between requests to the same host, ms. Default 2000. */
  minIntervalMs?: number;
  /** Random jitter added to the per-host gap, ms. Default 400. */
  jitterMs?: number;
  /** Per-request timeout, ms. Default 15000. */
  timeoutMs?: number;
  /** Cap on response bodies kept by the client, bytes. Default 1 MiB. */
  maxBodyBytes?: number;
  /** User-Agent to send; must carry a contact URL. */
  userAgent?: string;
  /** Per-run artifact cache; responses are keyed by "METHOD url". */
  cache?: ArtifactCache;
  /** Fetch implementation; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  logger?: Logger;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Serializes requests to a single host: at most one request in flight and at
 * least `minIntervalMs` between them, plus a random jitter so concurrent runs
 * do not stampede the same anchor.
 */
class HostGate {
  private lastRequestAt = 0;
  private tail: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly minIntervalMs: number,
    private readonly jitterMs: number,
  ) {}

  schedule<T>(task: () => Promise<T>): Promise<T> {
    const run = this.tail.then(async () => {
      // performance.now() is monotonic and sub-millisecond, so the interval
      // is measured against it — Date.now() at 1ms granularity could shave
      // the gap below the politeness guarantee this scheduler exists to
      // enforce. A single sleep can still fire "early" relative to the
      // monotonic clock (on Windows setTimeout and performance.now() are
      // backed by different clocks), so the remainder is re-checked after
      // each wake and the sleep repeated until the interval has really
      // passed.
      for (;;) {
        const remaining = this.minIntervalMs - (performance.now() - this.lastRequestAt);
        if (remaining <= 0) {
          break;
        }
        await sleep(remaining);
      }
      // Jitter is added on top, never as a substitute for the interval.
      if (this.jitterMs > 0) {
        await sleep(Math.random() * this.jitterMs);
      }
      this.lastRequestAt = performance.now();
      return task();
    });
    // Keep the chain alive regardless of a failed task.
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

/**
 * The probe's HTTP client. Implements the {@link HttpClient} contract from
 * core with the politeness guarantees the project is built on: read-only
 * methods, one request in flight per host, a minimum gap plus jitter, a
 * User-Agent carrying a contact URL, and an optional per-run artifact cache.
 */
export class RateLimitedHttpClient implements HttpClient {
  private readonly gates = new Map<string, HostGate>();
  private readonly minIntervalMs: number;
  private readonly jitterMs: number;
  private readonly timeoutMs: number;
  private readonly maxBodyBytes: number;
  private readonly userAgent: string;
  private readonly cache: ArtifactCache | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly logger: Logger;

  constructor(options: HttpClientOptions = {}) {
    this.minIntervalMs = options.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
    this.jitterMs = options.jitterMs ?? DEFAULT_JITTER_MS;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.cache = options.cache;
    this.logger = options.logger ?? consoleLogger;
    const fetchImpl = options.fetchImpl ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new Error(
        "no fetch implementation available; pass fetchImpl or run on Node 18+ which provides a global fetch",
      );
    }
    this.fetchImpl = fetchImpl;
  }

  async request(method: string, url: string, init: RequestInit = {}): Promise<HttpResponse> {
    const key = `${method} ${url}`;
    const cached = this.cache?.get(key);
    if (cached) {
      this.logger.info(`probe: cache hit for ${key}`);
      return cached;
    }
    const host = new URL(url).host;
    const gate = this.gateFor(host);
    const response = await gate.schedule(() => this.perform(method, url, init));
    this.cache?.set(key, response);
    return response;
  }

  get(url: string, init?: RequestInit): Promise<HttpResponse> {
    return this.request("GET", url, init);
  }

  head(url: string, init?: RequestInit): Promise<HttpResponse> {
    return this.request("HEAD", url, init);
  }

  options(url: string, init?: RequestInit): Promise<HttpResponse> {
    return this.request("OPTIONS", url, init);
  }

  private gateFor(host: string): HostGate {
    let gate = this.gates.get(host);
    if (!gate) {
      gate = new HostGate(this.minIntervalMs, this.jitterMs);
      this.gates.set(host, gate);
    }
    return gate;
  }

  private async perform(method: string, url: string, init: RequestInit): Promise<HttpResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(new Error(`request to ${url} timed out after ${this.timeoutMs}ms`));
    }, this.timeoutMs);
    try {
      const headers = new Headers(init.headers);
      if (!headers.has("user-agent")) {
        headers.set("user-agent", this.userAgent);
      }
      const response = await this.fetchImpl(url, {
        ...init,
        method,
        headers,
        signal: controller.signal,
      });
      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: await readBodyCapped(response, this.maxBodyBytes),
        url: response.url || url,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Reads a response body, stopping once `maxBytes` have been accumulated. */
async function readBodyCapped(response: Response, maxBytes: number): Promise<string> {
  if (response.body === null) {
    return "";
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    const remaining = maxBytes - total;
    if (remaining <= 0) {
      await reader.cancel().catch(() => undefined);
      break;
    }
    if (value.byteLength <= remaining) {
      chunks.push(value);
      total += value.byteLength;
    } else {
      chunks.push(value.subarray(0, remaining));
      total += remaining;
      await reader.cancel().catch(() => undefined);
      break;
    }
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}
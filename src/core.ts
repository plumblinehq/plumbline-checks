import type { StellarToml, Transaction } from "@stellar/stellar-sdk";

/**
 * The outcome of a single check against an anchor.
 *
 * - `pass`: the check ran and the anchor conforms
 * - `fail`: the check ran and the anchor does not conform
 * - `skip`: not applicable, or a prerequisite did not pass
 * - `error`: Plumbline itself failed (timeout, DNS, a bug in a check)
 */
export type Status = "pass" | "fail" | "skip" | "error";

/**
 * Severity maps mechanically to spec language:
 *
 * - the spec says MUST → `error`
 * - the spec says SHOULD or RECOMMENDED → `warning`
 * - the spec says neither → `info`
 *
 * When the spec is ambiguous, use `warning`, never `error`: a check must never
 * fail an anchor on our own interpretation of the spec.
 */
export type Severity = "error" | "warning" | "info";

/** The Stellar network an anchor is being checked against. */
export type Network = "pubnet" | "testnet";

/**
 * A single HTTP observation recorded by a check.
 *
 * `headers` is limited to the headers the check actually inspected, and `body`
 * is truncated to 2 KB and passed through a redactor before it is persisted.
 */
export interface Evidence {
  method: string;
  url: string;
  statusCode?: number;
  headers?: Record<string, string>;
  body?: string;
}

/** The outcome of a single check run. */
export interface Result {
  /** Stable, dotted check id, e.g. "sep1.toml-cors". */
  checkId: string;
  /** The SEP this check enforces. */
  sep: number;
  title: string;
  status: Status;
  severity: Severity;
  /** One sentence, human readable, citing the spec clause. */
  message: string;
  /** The spec clause this check enforces, e.g. "SEP-1 §Specification, max file size". */
  specRef: string;
  evidence: Evidence[];
  durationMs: number;
}

/** A normalized HTTP response returned by {@link HttpClient}. */
export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Headers;
  /** The full response body as text, capped by the client. */
  body: string;
  /** The final URL after redirects. */
  url: string;
}

/**
 * The contract checks use for HTTP. The probe's rate-limited client implements
 * it; defining it here keeps checks decoupled from the probe implementation.
 */
export interface HttpClient {
  request(method: string, url: string, init?: RequestInit): Promise<HttpResponse>;
  get(url: string, init?: RequestInit): Promise<HttpResponse>;
  head(url: string, init?: RequestInit): Promise<HttpResponse>;
  options(url: string, init?: RequestInit): Promise<HttpResponse>;
}

/** Minimal logger surface; defaults to the console. */
export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export const consoleLogger: Logger = {
  info(message: string, ...args: unknown[]): void {
    console.log(message, ...args);
  },
  warn(message: string, ...args: unknown[]): void {
    console.warn(message, ...args);
  },
  error(message: string, ...args: unknown[]): void {
    console.error(message, ...args);
  },
};

/**
 * Shared state a check reads. It is populated progressively: SEP-1 checks fill
 * in `toml` as a side effect of passing, and later checks depend on it.
 */
export interface Env {
  homeDomain: string;
  network: Network;
  /** Optional; empty means "not asset-specific". */
  assetCode?: string;
  /** The rate-limited HTTP client for this run. */
  http: HttpClient;
  /** Populated once `sep1.toml-parses` has passed; absent otherwise. */
  toml?: StellarToml.Api.StellarToml;
  /**
   * Shared SEP-10 state, populated progressively by the fetch-level SEP-10
   * checks: the ephemeral account, the challenge response, its parsed JSON,
   * and the decoded transaction. Absent until `sep10.challenge-returns-200`
   * runs.
   */
  sep10?: Sep10Context;
  /**
   * The GET <endpoint> without an account, fetched by
   * `sep10.error-response-shape` and read by `sep10.rejects-missing-account`.
   * Kept separate from `sep10` so the two error checks do not depend on the
   * challenge fetch having run.
   */
  sep10MissingAccountResponse?: HttpResponse;
  /**
   * The clock. Checks must take time from here, never `Date.now()` directly,
   * so tests can freeze it. This keeps a check deterministic: given the same
   * HTTP responses it must return the same result.
   */
  now: () => Date;
  logger: Logger;
}

/**
 * The shared SEP-10 state one check populates and the next reads. Mirrors
 * how `sep1.toml-parses` publishes `env.toml`: the fetch-level checks fill
 * it in as side effects of passing, and every dependent check reads it
 * through the runner's `requires` ordering.
 */
export interface Sep10Context {
  /** The ephemeral account supplied as the `account` query parameter. */
  account: string;
  /** The web auth endpoint the challenge was requested from. */
  endpointUrl: string;
  /** The GET <endpoint>?account=<account> response. */
  response: HttpResponse;
  /** The parsed response body, once `sep10.challenge-json-shape` passes. */
  json?: Record<string, unknown>;
  /** The decoded challenge transaction, once `sep10.challenge-decodes` passes. */
  transaction?: Transaction;
}

/**
 * What a check's `run` returns, before the runner stamps the check's own
 * metadata (id, sep, title, severity) and measures the duration. Keeping these
 * out of the check body guarantees a `Result` never disagrees with the `Check`
 * it came from.
 */
export type CheckOutcome = Omit<Result, "checkId" | "sep" | "title" | "severity" | "durationMs">;

/** A single conformance check. */
export interface Check {
  /** Stable, dotted id, e.g. "sep1.toml-cors". */
  id: string;
  sep: number;
  title: string;
  description: string;
  severity: Severity;
  /** Check ids that must have passed for this check to run. */
  requires: string[];
  run(env: Env): Promise<CheckOutcome>;
}
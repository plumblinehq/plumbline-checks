import { StellarToml } from "@stellar/stellar-sdk";

/** Options passed through to the SDK's StellarToml resolver. */
export interface TomlResolveOptions {
  /** Allow connecting over http. Must be false in production. */
  allowHttp?: boolean;
  /** Per-request timeout, ms. */
  timeout?: number;
}

/**
 * Injectable resolver seam. The default delegates to the SDK's
 * `StellarToml.Resolver`, which is the canonical fetch + parse + size-limit
 * path for stellar.toml and must not be reimplemented. Tests inject a fake so
 * they never touch the network.
 */
export type TomlResolver = (
  domain: string,
  options: TomlResolveOptions,
) => Promise<StellarToml.Api.StellarToml>;

const defaultResolver: TomlResolver = (domain, options) =>
  StellarToml.Resolver.resolve(domain, options);

export const DEFAULT_TOML_TIMEOUT_MS = 15_000;

/** Why a stellar.toml could not be resolved, for checks to map to pass/fail. */
export type TomlFailureReason = "too-large" | "invalid-toml" | "timeout" | "unreachable";

export class TomlResolutionError extends Error {
  readonly reason: TomlFailureReason;
  readonly domain: string;
  readonly statusCode: number | undefined;

  constructor(
    reason: TomlFailureReason,
    domain: string,
    message: string,
    options: { cause?: unknown; statusCode?: number } = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "TomlResolutionError";
    this.reason = reason;
    this.domain = domain;
    this.statusCode = options.statusCode;
  }
}

export interface TomlResolution {
  toml: StellarToml.Api.StellarToml;
  /** The URL that was fetched. */
  url: string;
  durationMs: number;
}

export interface ResolveTomlOptions {
  allowHttp?: boolean;
  timeoutMs?: number;
  /** Injectable resolver; defaults to the SDK's StellarToml.Resolver. */
  resolver?: TomlResolver;
}

/**
 * Resolve and parse the stellar.toml for a home domain. The SDK enforces the
 * SEP-1 100 KB size limit and validates TOML; failures are classified into
 * {@link TomlResolutionError} reasons for checks to act on.
 *
 * Note: the SDK resolver performs its own fetch, so the single stellar.toml
 * request per run bypasses the rate-limited client. That is deliberate — it is
 * exactly one request per run per anchor, and it is the first request to the
 * host.
 */
export async function resolveToml(
  homeDomain: string,
  options: ResolveTomlOptions = {},
): Promise<TomlResolution> {
  const resolver = options.resolver ?? defaultResolver;
  const url = `https://${homeDomain}/.well-known/stellar.toml`;
  const startedAt = Date.now();
  try {
    const toml = await resolver(homeDomain, {
      allowHttp: options.allowHttp ?? false,
      timeout: options.timeoutMs ?? DEFAULT_TOML_TIMEOUT_MS,
    });
    return { toml, url, durationMs: Date.now() - startedAt };
  } catch (error) {
    throw classify(error, homeDomain);
  }
}

function classify(error: unknown, domain: string): TomlResolutionError {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("exceeds allowed size")) {
    return new TomlResolutionError("too-large", domain, message, { cause: error });
  }
  if (message.includes("Parsing error")) {
    return new TomlResolutionError("invalid-toml", domain, message, { cause: error });
  }
  if (/timeout/i.test(message)) {
    return new TomlResolutionError("timeout", domain, message, { cause: error });
  }
  return new TomlResolutionError("unreachable", domain, message, {
    cause: error,
    statusCode: extractStatusCode(error),
  });
}

function extractStatusCode(error: unknown): number | undefined {
  const candidate = (error as { response?: { status?: unknown } }).response;
  return candidate && typeof candidate.status === "number" ? candidate.status : undefined;
}
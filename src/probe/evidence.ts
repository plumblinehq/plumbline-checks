import type { Evidence, HttpResponse } from "../core.js";

/** Response bodies stored as evidence are truncated to 2 KB. */
export const EVIDENCE_BODY_LIMIT = 2048;

/**
 * Header names that are never recorded verbatim. These would only ever be
 * credentials or session state, so their values are replaced with a marker.
 */
const SENSITIVE_HEADER_NAMES = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "proxy-authorization",
  "x-api-key",
]);

const SENSITIVE_PARAM_NAME =
  /^(?:token|secret|password|passwd|api[_-]?key|authorization|signature|auth)$/i;

const SENSITIVE_FIELD =
  /("(?:token|secret|password|passwd|api[_-]?key|authorization|signature|auth)"\s*:\s*")([^"]+)/gi;

/**
 * Redact credential-shaped values from a response body. Best-effort: it covers
 * the common JSON `"name": "value"` shape; the guarantee the project makes is
 * that secrets are never *knowingly* persisted, and the 2 KB truncation
 * bounds the blast radius of anything missed.
 */
export function redactText(text: string): string {
  return text.replace(SENSITIVE_FIELD, (_match, prefix: string) => `${prefix}[redacted]`);
}

/** Redact sensitive query parameters from a URL string. */
export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const key of parsed.searchParams.keys()) {
      if (SENSITIVE_PARAM_NAME.test(key)) {
        parsed.searchParams.set(key, "[redacted]");
      }
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Truncate a string to at most `limit` bytes without splitting a UTF-8 code
 * point: a truncated multi-byte sequence would otherwise decode as a
 * replacement character.
 */
export function truncateToBytes(text: string, limit: number): string {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length <= limit) {
    return text;
  }
  let end = limit;
  while (end > 0) {
    const byte = bytes[end];
    if (byte === undefined || (byte & 0b1100_0000) !== 0b1000_0000) {
      break;
    }
    end -= 1;
  }
  return new TextDecoder().decode(bytes.subarray(0, end));
}

export interface RecordEvidenceOptions {
  /** Header names the check actually inspected; only these are recorded. */
  inspectedHeaders?: string[];
}

/**
 * Build evidence from a response: record only the inspected headers, redact
 * credentials from the URL and body, and truncate the body to
 * {@link EVIDENCE_BODY_LIMIT} bytes.
 */
export function recordEvidence(
  method: string,
  response: HttpResponse,
  options: RecordEvidenceOptions = {},
): Evidence {
  const headers: Record<string, string> = {};
  for (const name of options.inspectedHeaders ?? []) {
    const value = response.headers.get(name);
    if (value === null) {
      continue;
    }
    headers[name] = SENSITIVE_HEADER_NAMES.has(name.toLowerCase()) ? "[redacted]" : value;
  }
  const body =
    response.body.length > 0 ? truncateToBytes(redactText(response.body), EVIDENCE_BODY_LIMIT) : undefined;
  return {
    method,
    url: redactUrl(response.url),
    statusCode: response.status,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body,
  };
}
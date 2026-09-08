import { describe, expect, it } from "vitest";
import type { HttpResponse } from "../../src/core.js";
import {
  EVIDENCE_BODY_LIMIT,
  recordEvidence,
  redactText,
  redactUrl,
  truncateToBytes,
} from "../../src/probe/evidence.js";

function response(overrides: Partial<HttpResponse> = {}): HttpResponse {
  return {
    status: 200,
    statusText: "OK",
    headers: new Headers(),
    body: "",
    url: "https://example.com/",
    ...overrides,
  };
}

describe("truncateToBytes", () => {
  it("leaves short text untouched", () => {
    expect(truncateToBytes("hello", 2048)).toBe("hello");
  });

  it("truncates ASCII text to the byte limit", () => {
    expect(truncateToBytes("abcdefghij", 5)).toBe("abcde");
  });

  it("never splits a multi-byte code point", () => {
    // "héllo": h(1) é(2) l l o — cutting at 3 bytes must keep the whole é.
    expect(truncateToBytes("héllo", 3)).toBe("hé");
    // "xé": cutting at 2 bytes lands inside é; drop it entirely.
    expect(truncateToBytes("xé", 2)).toBe("x");
  });

  it("produces output within the byte budget", () => {
    const text = "é".repeat(5000);
    const cut = truncateToBytes(text, 2048);
    expect(new TextEncoder().encode(cut).byteLength).toBeLessThanOrEqual(2048);
  });
});

describe("redactText", () => {
  it("redacts credential-shaped fields and leaves the rest", () => {
    const body = '{"token":"s3cr3t","name":"bob","password":"hunter2","status":"live"}';
    expect(redactText(body)).toBe(
      '{"token":"[redacted]","name":"bob","password":"[redacted]","status":"live"}',
    );
  });
});

describe("redactUrl", () => {
  it("redacts sensitive query parameters", () => {
    const url = "https://example.com/auth?token=abc123&home_domain=example.com";
    expect(redactUrl(url)).toBe(
      "https://example.com/auth?token=%5Bredacted%5D&home_domain=example.com",
    );
  });

  it("returns invalid URLs untouched", () => {
    expect(redactUrl("not a url")).toBe("not a url");
  });
});

describe("recordEvidence", () => {
  it("records only the inspected headers", () => {
    const res = response({
      headers: new Headers({ "content-type": "text/plain", "x-extra": "nope" }),
    });
    const evidence = recordEvidence("GET", res, { inspectedHeaders: ["content-type"] });
    expect(evidence.headers).toEqual({ "content-type": "text/plain" });
  });

  it("redacts sensitive headers even when inspected", () => {
    const res = response({
      headers: new Headers({ authorization: "Bearer secret" }),
    });
    const evidence = recordEvidence("GET", res, { inspectedHeaders: ["authorization"] });
    expect(evidence.headers).toEqual({ authorization: "[redacted]" });
  });

  it("records method, status and url", () => {
    const evidence = recordEvidence("HEAD", response({ status: 404 }));
    expect(evidence.method).toBe("HEAD");
    expect(evidence.statusCode).toBe(404);
    expect(evidence.url).toBe("https://example.com/");
  });

  it("truncates bodies to the 2 KB evidence limit", () => {
    const res = response({ body: "x".repeat(5000) });
    const evidence = recordEvidence("GET", res);
    expect(evidence.body?.length).toBe(EVIDENCE_BODY_LIMIT);
  });

  it("redacts credentials before truncating", () => {
    const res = response({ body: '{"token":"s3cr3t"}' });
    const evidence = recordEvidence("GET", res);
    expect(evidence.body).toBe('{"token":"[redacted]"}');
  });

  it("omits body and headers when there is nothing to record", () => {
    const evidence = recordEvidence("GET", response());
    expect(evidence.body).toBeUndefined();
    expect(evidence.headers).toBeUndefined();
  });
});
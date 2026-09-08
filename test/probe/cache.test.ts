import { describe, expect, it } from "vitest";
import type { HttpResponse } from "../../src/core.js";
import { InMemoryArtifactCache } from "../../src/probe/cache.js";

function response(body: string): HttpResponse {
  return {
    status: 200,
    statusText: "OK",
    headers: new Headers(),
    body,
    url: "https://example.com/",
  };
}

describe("InMemoryArtifactCache", () => {
  it("returns undefined for a missing key", () => {
    const cache = new InMemoryArtifactCache();
    expect(cache.get("GET https://example.com/")).toBeUndefined();
  });

  it("stores and returns the same instance", () => {
    const cache = new InMemoryArtifactCache();
    const value = response("hello");
    cache.set("GET https://example.com/", value);
    expect(cache.get("GET https://example.com/")).toBe(value);
  });

  it("tracks the number of entries", () => {
    const cache = new InMemoryArtifactCache();
    expect(cache.size()).toBe(0);
    cache.set("GET https://example.com/a", response("a"));
    cache.set("GET https://example.com/b", response("b"));
    expect(cache.size()).toBe(2);
  });

  it("distinguishes keys by method and url", () => {
    const cache = new InMemoryArtifactCache();
    cache.set("GET https://example.com/x", response("get"));
    cache.set("HEAD https://example.com/x", response("head"));
    expect(cache.get("GET https://example.com/x")?.body).toBe("get");
    expect(cache.get("HEAD https://example.com/x")?.body).toBe("head");
    expect(cache.get("GET https://example.com/y")).toBeUndefined();
  });
});
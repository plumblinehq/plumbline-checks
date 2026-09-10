import { describe, expect, it } from "vitest";
import type { Check } from "../src/core.js";
import { all, forSEPs, get, register } from "../src/registry.js";

function check(id: string, sep: number): Check {
  return {
    id,
    sep,
    title: id,
    description: `Test check ${id}`,
    severity: "error",
    specRef: "spec",
    requires: [],
    async run() {
      return { status: "pass", message: "ok", specRef: "spec", evidence: [] };
    },
  };
}

describe("registry", () => {
  it("returns registered checks sorted by id", () => {
    register(check("sep10.b", 10));
    register(check("sep1.a", 1));
    expect(all().map((c) => c.id)).toEqual(["sep1.a", "sep10.b"]);
  });

  it("rejects duplicate ids", () => {
    expect(() => register(check("sep1.a", 1))).toThrow(/already registered/);
  });

  it("looks up a single check", () => {
    expect(get("sep1.a")?.sep).toBe(1);
    expect(get("sep1.ghost")).toBeUndefined();
  });

  it("filters by SEP", () => {
    register(check("sep10.c", 10));
    expect(forSEPs([10]).map((c) => c.id)).toEqual(["sep10.b", "sep10.c"]);
    expect(forSEPs([1]).map((c) => c.id)).toEqual(["sep1.a"]);
    expect(forSEPs([24])).toEqual([]);
  });
});
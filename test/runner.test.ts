import { beforeEach, describe, expect, it, vi } from "vitest";
import { consoleLogger, type Check, type CheckOutcome, type Env } from "../src/core.js";
import { RateLimitedHttpClient } from "../src/probe/http.js";
import type { register as RegisterFn } from "../src/registry.js";
import type { run as RunFn } from "../src/runner.js";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// The registry is module-global, so each test gets a fresh module instance;
// otherwise a hanging check registered by one test poisons every later test.
let register: typeof RegisterFn;
let run: typeof RunFn;

beforeEach(async () => {
  vi.resetModules();
  const registry = await import("../src/registry.js");
  const runner = await import("../src/runner.js");
  register = registry.register;
  run = runner.run;
});

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    homeDomain: "example.com",
    network: "pubnet",
    http: new RateLimitedHttpClient({
      minIntervalMs: 0,
      jitterMs: 0,
      fetchImpl: async () => new Response("", { status: 200 }),
    }),
    now: () => new Date("2026-01-01T00:00:00Z"),
    logger: consoleLogger,
    ...overrides,
  };
}

function check(
  id: string,
  overrides: Partial<Check> & { run?: (env: Env) => Promise<CheckOutcome> } = {},
): Check {
  return {
    id,
    sep: overrides.sep ?? 1,
    title: overrides.title ?? id,
    description: `Test check ${id}`,
    severity: overrides.severity ?? "error",
    specRef: "spec",
    requires: overrides.requires ?? [],
    run: overrides.run ?? (async () => ({ status: "pass", message: "ok", specRef: "spec", evidence: [] })),
  };
}

describe("run", () => {
  it("runs checks in dependency order", async () => {
    const order: string[] = [];
    register(
      check("sep1.b", {
        requires: ["sep1.a"],
        run: async () => {
          order.push("sep1.b");
          return { status: "pass", message: "ok", specRef: "spec", evidence: [] };
        },
      }),
    );
    register(
      check("sep1.a", {
        run: async () => {
          order.push("sep1.a");
          return { status: "pass", message: "ok", specRef: "spec", evidence: [] };
        },
      }),
    );

    const results = await run(makeEnv());
    expect(order).toEqual(["sep1.a", "sep1.b"]);
    expect(results.map((r) => r.checkId)).toEqual(["sep1.a", "sep1.b"]);
  });

  it("closes over prerequisites outside the requested SEPs", async () => {
    register(
      check("sep10.auth", {
        sep: 10,
        requires: ["sep1.toml-parses"],
        run: async () => ({ status: "pass", message: "ok", specRef: "spec", evidence: [] }),
      }),
    );
    register(
      check("sep1.toml-parses", {
        sep: 1,
        run: async () => ({ status: "pass", message: "ok", specRef: "spec", evidence: [] }),
      }),
    );

    const results = await run(makeEnv(), { seps: [10] });
    expect(results.map((r) => r.checkId)).toEqual(["sep1.toml-parses", "sep10.auth"]);
  });

  it("skips dependents whose prerequisite did not pass", async () => {
    register(
      check("sep1.base", {
        run: async () => ({ status: "fail", message: "nope", specRef: "spec", evidence: [] }),
      }),
    );
    register(check("sep1.dependent", { requires: ["sep1.base"] }));

    const results = await run(makeEnv());
    const dependent = results.find((r) => r.checkId === "sep1.dependent");
    expect(dependent?.status).toBe("skip");
    expect(dependent?.message).toContain('prerequisite "sep1.base" did not pass');
  });

  it("skips dependents of a check that errored", async () => {
    register(
      check("sep1.exploding", {
        run: async () => {
          throw new Error("boom");
        },
      }),
    );
    register(check("sep1.after", { requires: ["sep1.exploding"] }));

    const results = await run(makeEnv());
    expect(results.find((r) => r.checkId === "sep1.exploding")?.status).toBe("error");
    expect(results.find((r) => r.checkId === "sep1.after")?.status).toBe("skip");
  });

  it("skips dependents of an unknown prerequisite", async () => {
    register(check("sep1.orphan", { requires: ["sep1.ghost"] }));
    const results = await run(makeEnv());
    expect(results.find((r) => r.checkId === "sep1.orphan")?.status).toBe("skip");
    expect(results.find((r) => r.checkId === "sep1.orphan")?.message).toContain("sep1.ghost");
  });

  it("reports a hanging check as an error after the per-check timeout", async () => {
    register(
      check("sep1.slow", {
        run: () => new Promise<CheckOutcome>(() => undefined),
      }),
    );
    const results = await run(makeEnv(), { checkTimeoutMs: 20 });
    const slow = results.find((r) => r.checkId === "sep1.slow");
    expect(slow?.status).toBe("error");
    expect(slow?.message).toContain("exceeded");
  });

  it("reports a throwing check as an error, not an anchor failure", async () => {
    register(
      check("sep1.buggy", {
        run: async () => {
          throw new Error("internal bug");
        },
      }),
    );
    const results = await run(makeEnv());
    const buggy = results.find((r) => r.checkId === "sep1.buggy");
    expect(buggy?.status).toBe("error");
    expect(buggy?.message).toContain("internal bug");
  });

  it("stamps the check's own metadata onto the result", async () => {
    register(check("sep10.thing", { sep: 10, severity: "warning" }));
    const results = await run(makeEnv(), { seps: [10] });
    const result = results.find((r) => r.checkId === "sep10.thing");
    expect(result?.sep).toBe(10);
    expect(result?.severity).toBe("warning");
    expect(result?.title).toBe("sep10.thing");
    expect(result?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("aborts remaining checks when the run deadline passes", async () => {
    register(
      check("sep1.first", {
        run: async () => {
          await sleep(60);
          return { status: "pass", message: "ok", specRef: "spec", evidence: [] };
        },
      }),
    );
    register(check("sep1.second"));

    const results = await run(makeEnv(), { timeoutMs: 30 });
    expect(results.find((r) => r.checkId === "sep1.first")?.status).toBe("pass");
    const second = results.find((r) => r.checkId === "sep1.second");
    expect(second?.status).toBe("error");
    expect(second?.message).toContain("timeout");
  });

  it("restricts the run to the requested SEPs", async () => {
    register(check("sep1.only", { sep: 1 }));
    register(check("sep24.only", { sep: 24 }));
    const results = await run(makeEnv(), { seps: [1] });
    expect(results.map((r) => r.checkId)).toEqual(["sep1.only"]);
  });

  it("throws on a cycle in check requirements", async () => {
    register(check("sep1.cycle-a", { requires: ["sep1.cycle-b"] }));
    register(check("sep1.cycle-b", { requires: ["sep1.cycle-a"] }));
    await expect(run(makeEnv())).rejects.toThrow(/cycle/);
  });
});
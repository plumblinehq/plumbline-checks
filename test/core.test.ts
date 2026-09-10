import { describe, expect, it } from "vitest";
import { consoleLogger, type Check, type Result, type Severity, type Status } from "../src/core.js";

const STATUSES: Status[] = ["pass", "fail", "skip", "error"];
const SEVERITIES: Severity[] = ["error", "warning", "info"];

describe("core vocabulary", () => {
  it("exposes the four statuses", () => {
    expect(STATUSES).toHaveLength(4);
    expect(STATUSES).toContain("pass");
    expect(STATUSES).toContain("fail");
    expect(STATUSES).toContain("skip");
    expect(STATUSES).toContain("error");
  });

  it("exposes the three severities", () => {
    expect(SEVERITIES).toHaveLength(3);
    expect(SEVERITIES).toContain("error");
    expect(SEVERITIES).toContain("warning");
    expect(SEVERITIES).toContain("info");
  });

  it("defaults logging to the console", () => {
    expect(consoleLogger.info).toBeTypeOf("function");
    expect(consoleLogger.warn).toBeTypeOf("function");
    expect(consoleLogger.error).toBeTypeOf("function");
  });
});

describe("Check shape", () => {
  it("accepts a check whose run returns an outcome without duplicated metadata", async () => {
    const check: Check = {
      id: "sep1.example",
      sep: 1,
      title: "Example",
      description: "Proves the Check type accepts a minimal implementation.",
      severity: "info",
      specRef: "SEP-1 §Example",
      requires: [],
      async run() {
        return { status: "pass", message: "ok", specRef: "SEP-1 §Example", evidence: [] };
      },
    };

    const outcome = await check.run({} as never);
    const result: Result = {
      checkId: check.id,
      sep: check.sep,
      title: check.title,
      severity: check.severity,
      durationMs: 1,
      ...outcome,
    };

    expect(result.checkId).toBe("sep1.example");
    expect(result.status).toBe("pass");
    expect(result.specRef).toBe("SEP-1 §Example");
  });
});
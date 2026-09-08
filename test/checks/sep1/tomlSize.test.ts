import { describe, expect, it } from "vitest";
import { TOML_MAX_BYTES, tomlSize } from "../../../src/checks/sep1/tomlSize.js";
import { makeEnv } from "../../helpers.js";

describe("sep1.toml-size", () => {
  it("passes for a small file", async () => {
    const env = makeEnv(() => ({ status: 200, body: "VERSION=\"2.0.0\"\n" }));
    const outcome = await tomlSize.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.message).toContain("within the 100KB maximum");
  });

  it("passes for a file of exactly the limit", async () => {
    const env = makeEnv(() => ({ status: 200, body: "x".repeat(TOML_MAX_BYTES) }));
    const outcome = await tomlSize.run(env);
    expect(outcome.status).toBe("pass");
  });

  it("fails for a file one byte over the limit", async () => {
    const env = makeEnv(() => ({ status: 200, body: "x".repeat(TOML_MAX_BYTES + 1) }));
    const outcome = await tomlSize.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain(String(TOML_MAX_BYTES + 1));
    expect(outcome.specRef).toBe("SEP-1 §Specification, max file size");
  });

  it("counts bytes, not characters", async () => {
    // "é" is 2 bytes in UTF-8; 60_000 such characters are 120_000 bytes.
    const env = makeEnv(() => ({ status: 200, body: "é".repeat(60_000) }));
    const outcome = await tomlSize.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("120000 bytes");
  });

  it("truncates the evidence body for an oversized file", async () => {
    const env = makeEnv(() => ({ status: 200, body: "x".repeat(TOML_MAX_BYTES + 1) }));
    const outcome = await tomlSize.run(env);
    const evidenceBody = outcome.evidence[0]?.body ?? "";
    expect(new TextEncoder().encode(evidenceBody).byteLength).toBeLessThanOrEqual(2048);
  });
});

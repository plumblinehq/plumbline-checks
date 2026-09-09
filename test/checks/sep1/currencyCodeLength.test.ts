import { describe, expect, it } from "vitest";
import { currencyCodeLength } from "../../../src/checks/sep1/currencyCodeLength.js";
import { makeEnv } from "../../helpers.js";

function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.currency-code-length", () => {
  it("passes when every inline entry has a short-enough code", async () => {
    const outcome = await currencyCodeLength.run(envWithToml({ CURRENCIES: [{ code: "USD" }] }));
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-1 §Currency Documentation, code");
  });

  it("passes for a code of exactly 12 characters", async () => {
    const outcome = await currencyCodeLength.run(
      envWithToml({ CURRENCIES: [{ code: "ABCDEFGHIJKL" }] }),
    );
    expect(outcome.status).toBe("pass");
  });

  it("fails when a code is longer than 12 characters", async () => {
    const outcome = await currencyCodeLength.run(
      envWithToml({ CURRENCIES: [{ code: "ABCDEFGHIJKLM" }] }),
    );
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("13 characters");
  });

  it("fails when an entry declares no code", async () => {
    const outcome = await currencyCodeLength.run(envWithToml({ CURRENCIES: [{ issuer: "G" }] }));
    expect(outcome.status).toBe("fail");
  });

  it("skips entries that link out via toml=", async () => {
    const outcome = await currencyCodeLength.run(
      envWithToml({ CURRENCIES: [{ toml: "https://example.com/.well-known/CURRENCY.toml" }] }),
    );
    expect(outcome.status).toBe("skip");
    expect(outcome.message).toContain("links out");
  });

  it("skips when no [[CURRENCIES]] entries are declared", async () => {
    const outcome = await currencyCodeLength.run(envWithToml({}));
    expect(outcome.status).toBe("skip");
  });
});
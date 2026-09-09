import { describe, expect, it } from "vitest";
import { currencyStatusValid } from "../../../src/checks/sep1/currencyStatusValid.js";
import { makeEnv } from "../../helpers.js";

function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.currency-status-valid", () => {
  it("passes for each of the four enumerated statuses", async () => {
    for (const status of ["live", "dead", "test", "private"]) {
      const outcome = await currencyStatusValid.run(envWithToml({ CURRENCIES: [{ status }] }));
      expect(outcome.status).toBe("pass");
    }
  });

  it("fails for a status outside the enumerated set", async () => {
    const outcome = await currencyStatusValid.run(envWithToml({ CURRENCIES: [{ status: "pending" }] }));
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("live, dead, test, private");
  });

  it("skips when no entry declares a status", async () => {
    const outcome = await currencyStatusValid.run(envWithToml({ CURRENCIES: [{ code: "USD" }] }));
    expect(outcome.status).toBe("skip");
  });
});
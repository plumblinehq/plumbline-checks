import { describe, expect, it } from "vitest";
import { currenciesPresent } from "../../../src/checks/sep1/currenciesPresent.js";
import { makeEnv } from "../../helpers.js";

function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.currencies-present", () => {
  it("passes when at least one [[CURRENCIES]] entry is declared", async () => {
    const outcome = await currenciesPresent.run(envWithToml({ CURRENCIES: [{ code: "USD" }] }));
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-1 §Specification, Currency Documentation");
  });

  it("fails when the list is absent", async () => {
    const outcome = await currenciesPresent.run(envWithToml({}));
    expect(outcome.status).toBe("fail");
    expect(currenciesPresent.severity).toBe("warning");
  });

  it("fails when the list is empty", async () => {
    const outcome = await currenciesPresent.run(envWithToml({ CURRENCIES: [] }));
    expect(outcome.status).toBe("fail");
  });
});
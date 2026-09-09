import { describe, expect, it } from "vitest";
import { currencyIssuancePolicyExclusive } from "../../../src/checks/sep1/currencyIssuancePolicyExclusive.js";
import { makeEnv } from "../../helpers.js";

function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.currency-issuance-policy-exclusive", () => {
  it("passes when exactly one issuance policy is declared", async () => {
    for (const policy of [{ fixed_number: 1000 }, { max_number: 1000 }, { is_unlimited: true }]) {
      const outcome = await currencyIssuancePolicyExclusive.run(envWithToml({ CURRENCIES: [policy] }));
      expect(outcome.status).toBe("pass");
    }
  });

  it("fails when more than one issuance policy is declared", async () => {
    const outcome = await currencyIssuancePolicyExclusive.run(
      envWithToml({ CURRENCIES: [{ fixed_number: 1000, max_number: 2000 }] }),
    );
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("exactly one");
  });

  it("fails when is_unlimited is combined with another policy", async () => {
    const outcome = await currencyIssuancePolicyExclusive.run(
      envWithToml({ CURRENCIES: [{ fixed_number: 1000, is_unlimited: true }] }),
    );
    expect(outcome.status).toBe("fail");
  });

  it("skips when no entry declares an issuance policy", async () => {
    const outcome = await currencyIssuancePolicyExclusive.run(envWithToml({ CURRENCIES: [{ code: "USD" }] }));
    expect(outcome.status).toBe("skip");
  });
});
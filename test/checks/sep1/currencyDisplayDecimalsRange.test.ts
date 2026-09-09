import { describe, expect, it } from "vitest";
import { currencyDisplayDecimalsRange } from "../../../src/checks/sep1/currencyDisplayDecimalsRange.js";
import { makeEnv } from "../../helpers.js";

function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.currency-display-decimals-range", () => {
  it("passes for decimals within 0..7", async () => {
    for (const decimals of [0, 2, 7]) {
      const outcome = await currencyDisplayDecimalsRange.run(envWithToml({ CURRENCIES: [{ display_decimals: decimals }] }));
      expect(outcome.status).toBe("pass");
    }
  });

  it("fails for decimals above 7", async () => {
    const outcome = await currencyDisplayDecimalsRange.run(envWithToml({ CURRENCIES: [{ display_decimals: 8 }] }));
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("0 to 7");
  });

  it("fails for a negative value", async () => {
    const outcome = await currencyDisplayDecimalsRange.run(envWithToml({ CURRENCIES: [{ display_decimals: -1 }] }));
    expect(outcome.status).toBe("fail");
  });

  it("fails for a non-integer value", async () => {
    const outcome = await currencyDisplayDecimalsRange.run(envWithToml({ CURRENCIES: [{ display_decimals: 2.5 }] }));
    expect(outcome.status).toBe("fail");
  });

  it("skips when no entry declares display_decimals", async () => {
    const outcome = await currencyDisplayDecimalsRange.run(envWithToml({ CURRENCIES: [{ code: "USD" }] }));
    expect(outcome.status).toBe("skip");
  });
});
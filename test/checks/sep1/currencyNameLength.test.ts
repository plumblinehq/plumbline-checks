import { describe, expect, it } from "vitest";
import { currencyNameLength } from "../../../src/checks/sep1/currencyNameLength.js";
import { makeEnv } from "../../helpers.js";

function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.currency-name-length", () => {
  it("passes for a name of at most 20 characters", async () => {
    const outcome = await currencyNameLength.run(envWithToml({ CURRENCIES: [{ name: "A short name" }] }));
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-1 §Currency Documentation, name");
  });

  it("fails for a name longer than 20 characters", async () => {
    const outcome = await currencyNameLength.run(
      envWithToml({ CURRENCIES: [{ name: "This name is definitely too long" }] }),
    );
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("20 characters");
  });

  it("skips when no entry declares a name", async () => {
    const outcome = await currencyNameLength.run(envWithToml({ CURRENCIES: [{ code: "USD" }] }));
    expect(outcome.status).toBe("skip");
  });
});
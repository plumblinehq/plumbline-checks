import { describe, expect, it } from "vitest";
import { accountsValid } from "../../../src/checks/sep1/accountsValid.js";
import { makeEnv } from "../../helpers.js";

const VALID_A = "GBBHQ7H4V6RRORKYLHTCAWP6MOHNORRFJSDPXDFYDGJB2LPZUFPXUEW3";
const VALID_B = "GD5DJQDDBKGAYNEAXU562HYGOOSYAEOO6AS53PZXBOZGCP5M2OPGMZV3";

// A record, not the SDK type: these tests deliberately feed invalid values.
function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.accounts-valid", () => {
  it("passes when every entry is a valid G... strkey", async () => {
    const outcome = await accountsValid.run(envWithToml({ ACCOUNTS: [VALID_A, VALID_B] }));
    expect(outcome.status).toBe("pass");
    expect(outcome.message).toContain("All 2");
  });

  it("fails naming the index of a malformed entry", async () => {
    const outcome = await accountsValid.run(envWithToml({ ACCOUNTS: [VALID_A, "GABC"] }));
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("entry 1");
  });

  it("fails when an entry is not a string", async () => {
    const outcome = await accountsValid.run(envWithToml({ ACCOUNTS: [VALID_A, 42] }));
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("entry 1 is not a string");
  });

  it("fails for an empty list", async () => {
    const outcome = await accountsValid.run(envWithToml({ ACCOUNTS: [] }));
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("non-empty list");
  });

  it("fails when ACCOUNTS is not a list", async () => {
    const outcome = await accountsValid.run(envWithToml({ ACCOUNTS: VALID_A }));
    expect(outcome.status).toBe("fail");
  });

  it("skips when ACCOUNTS is absent", async () => {
    const outcome = await accountsValid.run(envWithToml({}));
    expect(outcome.status).toBe("skip");
    expect(outcome.message).toContain("not declared");
  });
});

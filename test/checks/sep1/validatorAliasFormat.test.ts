import { describe, expect, it } from "vitest";
import { validatorAliasFormat } from "../../../src/checks/sep1/validatorAliasFormat.js";
import { makeEnv } from "../../helpers.js";

function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.validator-alias-format", () => {
  it("passes when every declared ALIAS matches the pattern", async () => {
    const outcome = await validatorAliasFormat.run(
      envWithToml({ VALIDATORS: [{ ALIAS: "domain-au" }, { ALIAS: "core-01" }] }),
    );
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-1 §Validator Information, ALIAS");
  });

  it("fails when an ALIAS has invalid characters", async () => {
    const outcome = await validatorAliasFormat.run(
      envWithToml({ VALIDATORS: [{ ALIAS: "Domain_AU" }] }),
    );
    expect(outcome.status).toBe("fail");
    expect(validatorAliasFormat.severity).toBe("warning");
  });

  it("fails when an ALIAS is too short", async () => {
    const outcome = await validatorAliasFormat.run(envWithToml({ VALIDATORS: [{ ALIAS: "a" }] }));
    expect(outcome.status).toBe("fail");
  });

  it("skips entries that declare no ALIAS", async () => {
    const outcome = await validatorAliasFormat.run(
      envWithToml({ VALIDATORS: [{ PUBLIC_KEY: "G", HOST: "x:11625" }] }),
    );
    expect(outcome.status).toBe("skip");
  });

  it("skips when no [[VALIDATORS]] entries are declared", async () => {
    const outcome = await validatorAliasFormat.run(envWithToml({}));
    expect(outcome.status).toBe("skip");
  });
});
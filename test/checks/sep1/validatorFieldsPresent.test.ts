import { describe, expect, it } from "vitest";
import { validatorFieldsPresent } from "../../../src/checks/sep1/validatorFieldsPresent.js";
import { makeEnv } from "../../helpers.js";

function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.validator-fields-present", () => {
  it("passes when every entry declares PUBLIC_KEY and HOST", async () => {
    const outcome = await validatorFieldsPresent.run(
      envWithToml({
        VALIDATORS: [{ PUBLIC_KEY: "G...", HOST: "core-au.example.com:11625" }],
      }),
    );
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-1 §Validator Information, PUBLIC_KEY / HOST");
  });

  it("fails when an entry is missing PUBLIC_KEY", async () => {
    const outcome = await validatorFieldsPresent.run(
      envWithToml({ VALIDATORS: [{ HOST: "core-au.example.com:11625" }] }),
    );
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("PUBLIC_KEY");
  });

  it("fails when an entry is missing HOST", async () => {
    const outcome = await validatorFieldsPresent.run(
      envWithToml({ VALIDATORS: [{ PUBLIC_KEY: "G..." }] }),
    );
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("HOST");
  });

  it("reports at info severity", async () => {
    expect(validatorFieldsPresent.severity).toBe("info");
  });

  it("skips when no [[VALIDATORS]] entries are declared", async () => {
    const outcome = await validatorFieldsPresent.run(envWithToml({}));
    expect(outcome.status).toBe("skip");
  });
});
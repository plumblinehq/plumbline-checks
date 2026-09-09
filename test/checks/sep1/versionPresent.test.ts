import { describe, expect, it } from "vitest";
import { versionPresent } from "../../../src/checks/sep1/versionPresent.js";
import { makeEnv } from "../../helpers.js";

function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.version-present", () => {
  it("passes when VERSION is declared", async () => {
    const outcome = await versionPresent.run(envWithToml({ VERSION: "2.0.0" }));
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-1 §General Information, VERSION");
  });

  it("fails when VERSION is absent", async () => {
    const outcome = await versionPresent.run(envWithToml({}));
    expect(outcome.status).toBe("fail");
    expect(versionPresent.severity).toBe("warning");
    expect(outcome.message).toContain("VERSION is not declared");
  });
});
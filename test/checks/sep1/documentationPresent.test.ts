import { describe, expect, it } from "vitest";
import { documentationPresent } from "../../../src/checks/sep1/documentationPresent.js";
import { makeEnv } from "../../helpers.js";

function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.documentation-present", () => {
  it("passes when a [DOCUMENTATION] table is declared", async () => {
    const outcome = await documentationPresent.run(
      envWithToml({ DOCUMENTATION: { ORG_NAME: "Org" } }),
    );
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-1 §Specification, Organization Documentation");
  });

  it("fails when the table is absent", async () => {
    const outcome = await documentationPresent.run(envWithToml({}));
    expect(outcome.status).toBe("fail");
    expect(documentationPresent.severity).toBe("warning");
  });
});
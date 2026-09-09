import { describe, expect, it } from "vitest";
import { orgPhoneE164 } from "../../../src/checks/sep1/orgPhoneE164.js";
import { makeEnv } from "../../helpers.js";

function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.org-phone-e164", () => {
  it("passes for an E.164 number", async () => {
    const outcome = await orgPhoneE164.run(
      envWithToml({ DOCUMENTATION: { ORG_PHONE_NUMBER: "+14155552671" } }),
    );
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-1 §Organization Documentation, ORG_PHONE_NUMBER");
  });

  it("fails when the number has no country code prefix", async () => {
    const outcome = await orgPhoneE164.run(
      envWithToml({ DOCUMENTATION: { ORG_PHONE_NUMBER: "14155552671" } }),
    );
    expect(outcome.status).toBe("fail");
    expect(orgPhoneE164.severity).toBe("warning");
  });

  it("fails when the number has spaces", async () => {
    const outcome = await orgPhoneE164.run(
      envWithToml({ DOCUMENTATION: { ORG_PHONE_NUMBER: "+1 415 555 2671" } }),
    );
    expect(outcome.status).toBe("fail");
  });

  it("fails when the number starts with +0", async () => {
    const outcome = await orgPhoneE164.run(
      envWithToml({ DOCUMENTATION: { ORG_PHONE_NUMBER: "+01415552671" } }),
    );
    expect(outcome.status).toBe("fail");
  });

  it("skips when ORG_PHONE_NUMBER is absent", async () => {
    const outcome = await orgPhoneE164.run(envWithToml({ DOCUMENTATION: {} }));
    expect(outcome.status).toBe("skip");
  });
});
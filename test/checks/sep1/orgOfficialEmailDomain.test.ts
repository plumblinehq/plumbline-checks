import { describe, expect, it } from "vitest";
import { orgOfficialEmailDomain } from "../../../src/checks/sep1/orgOfficialEmailDomain.js";
import { makeEnv } from "../../helpers.js";

// makeEnv sets homeDomain to "example.com"; the checks compare the email
// domain against ORG_URL's domain, not the home domain.
function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.org-official-email-domain", () => {
  it("passes when the email domain matches ORG_URL", async () => {
    const outcome = await orgOfficialEmailDomain.run(
      envWithToml({
        DOCUMENTATION: { ORG_URL: "https://www.example.com", ORG_OFFICIAL_EMAIL: "support@example.com" },
      }),
    );
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-1 §Organization Documentation, ORG_OFFICIAL_EMAIL");
  });

  it("fails when the email domain differs from ORG_URL", async () => {
    const outcome = await orgOfficialEmailDomain.run(
      envWithToml({
        DOCUMENTATION: { ORG_URL: "https://www.example.com", ORG_OFFICIAL_EMAIL: "support@other.com" },
      }),
    );
    expect(outcome.status).toBe("fail");
    expect(orgOfficialEmailDomain.severity).toBe("error");
  });

  it("fails when the email has no domain", async () => {
    const outcome = await orgOfficialEmailDomain.run(
      envWithToml({ DOCUMENTATION: { ORG_URL: "https://www.example.com", ORG_OFFICIAL_EMAIL: "support@" } }),
    );
    expect(outcome.status).toBe("fail");
  });

  it("skips when ORG_OFFICIAL_EMAIL is absent", async () => {
    const outcome = await orgOfficialEmailDomain.run(
      envWithToml({ DOCUMENTATION: { ORG_URL: "https://www.example.com" } }),
    );
    expect(outcome.status).toBe("skip");
  });

  it("skips when ORG_URL is absent", async () => {
    const outcome = await orgOfficialEmailDomain.run(
      envWithToml({ DOCUMENTATION: { ORG_OFFICIAL_EMAIL: "support@example.com" } }),
    );
    expect(outcome.status).toBe("skip");
  });
});
import { describe, expect, it } from "vitest";
import { orgUrlSameDomain } from "../../../src/checks/sep1/orgUrlSameDomain.js";
import { makeEnv } from "../../helpers.js";

// makeEnv sets homeDomain to "example.com".
function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.org-url-same-domain", () => {
  it("passes when ORG_URL is on the home domain", async () => {
    const outcome = await orgUrlSameDomain.run(
      envWithToml({ DOCUMENTATION: { ORG_URL: "https://www.example.com" } }),
    );
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-1 §Organization Documentation, ORG_URL");
  });

  it("passes when ORG_URL is the bare home domain", async () => {
    const outcome = await orgUrlSameDomain.run(
      envWithToml({ DOCUMENTATION: { ORG_URL: "https://example.com" } }),
    );
    expect(outcome.status).toBe("pass");
  });

  it("fails when ORG_URL is on a different domain", async () => {
    const outcome = await orgUrlSameDomain.run(
      envWithToml({ DOCUMENTATION: { ORG_URL: "https://www.other.com" } }),
    );
    expect(outcome.status).toBe("fail");
    expect(orgUrlSameDomain.severity).toBe("error");
  });

  it("fails when ORG_URL is not a valid URL", async () => {
    const outcome = await orgUrlSameDomain.run(
      envWithToml({ DOCUMENTATION: { ORG_URL: "not a url" } }),
    );
    expect(outcome.status).toBe("fail");
  });

  it("skips when ORG_URL is absent", async () => {
    const outcome = await orgUrlSameDomain.run(envWithToml({ DOCUMENTATION: { ORG_NAME: "Org" } }));
    expect(outcome.status).toBe("skip");
  });
});
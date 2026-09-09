import { describe, expect, it } from "vitest";
import { orgUrlHttps } from "../../../src/checks/sep1/orgUrlHttps.js";
import { makeEnv } from "../../helpers.js";

function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.org-url-https", () => {
  it("passes for an https ORG_URL", async () => {
    const outcome = await orgUrlHttps.run(
      envWithToml({ DOCUMENTATION: { ORG_URL: "https://www.example.com" } }),
    );
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-1 §Organization Documentation, ORG_URL");
  });

  it("fails for an http ORG_URL", async () => {
    const outcome = await orgUrlHttps.run(
      envWithToml({ DOCUMENTATION: { ORG_URL: "http://www.example.com" } }),
    );
    expect(outcome.status).toBe("fail");
    expect(orgUrlHttps.severity).toBe("error");
    expect(outcome.message).toContain("https");
  });

  it("fails for a value that is not a URL", async () => {
    const outcome = await orgUrlHttps.run(envWithToml({ DOCUMENTATION: { ORG_URL: "example.com" } }));
    expect(outcome.status).toBe("fail");
  });

  it("fails when ORG_URL is not a string", async () => {
    const outcome = await orgUrlHttps.run(envWithToml({ DOCUMENTATION: { ORG_URL: 42 } }));
    expect(outcome.status).toBe("fail");
  });

  it("skips when ORG_URL is absent", async () => {
    const outcome = await orgUrlHttps.run(envWithToml({ DOCUMENTATION: { ORG_NAME: "Org" } }));
    expect(outcome.status).toBe("skip");
  });

  it("skips when the DOCUMENTATION table is absent", async () => {
    const outcome = await orgUrlHttps.run(envWithToml({}));
    expect(outcome.status).toBe("skip");
  });
});
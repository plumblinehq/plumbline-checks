import { describe, expect, it } from "vitest";
import { orgLogoReachable } from "../../../src/checks/sep1/orgLogoReachable.js";
import { makeEnv } from "../../helpers.js";

const LOGO = "https://www.example.com/logo.png";

function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.org-logo-reachable", () => {
  it("passes when the logo resolves as a PNG", async () => {
    const env = envWithToml({ DOCUMENTATION: { ORG_LOGO: LOGO } });
    env.http = makeEnv((url) => {
      expect(url).toBe(LOGO);
      return { status: 200, headers: { "content-type": "image/png" }, body: "png" };
    }).http;
    const outcome = await orgLogoReachable.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-1 §Organization Documentation, ORG_LOGO");
  });

  it("fails when the logo does not resolve", async () => {
    const env = envWithToml({ DOCUMENTATION: { ORG_LOGO: LOGO } });
    env.http = makeEnv(() => ({ status: 404, body: "" })).http;
    const outcome = await orgLogoReachable.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("HTTP 404");
  });

  it("fails when the logo is not a PNG", async () => {
    const env = envWithToml({ DOCUMENTATION: { ORG_LOGO: LOGO } });
    env.http = makeEnv(() => ({ status: 200, headers: { "content-type": "text/html" }, body: "<html>" })).http;
    const outcome = await orgLogoReachable.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("not a PNG");
  });

  it("records the content-type header it inspected", async () => {
    const env = envWithToml({ DOCUMENTATION: { ORG_LOGO: LOGO } });
    env.http = makeEnv(() => ({
      status: 200,
      headers: { "content-type": "image/png", "x-other": "x" },
      body: "png",
    })).http;
    const outcome = await orgLogoReachable.run(env);
    expect(outcome.evidence[0]?.headers).toEqual({ "content-type": "image/png" });
  });

  it("fails for a value that is not a URL", async () => {
    const outcome = await orgLogoReachable.run(envWithToml({ DOCUMENTATION: { ORG_LOGO: "logo.png" } }));
    expect(outcome.status).toBe("fail");
  });

  it("skips when ORG_LOGO is absent", async () => {
    const outcome = await orgLogoReachable.run(envWithToml({ DOCUMENTATION: {} }));
    expect(outcome.status).toBe("skip");
  });
});
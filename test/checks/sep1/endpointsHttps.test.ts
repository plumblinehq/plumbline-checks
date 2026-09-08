import { describe, expect, it } from "vitest";
import { endpointsHttps } from "../../../src/checks/sep1/endpointsHttps.js";
import { makeEnv } from "../../helpers.js";

// A record, not the SDK type: these tests deliberately feed invalid values.
function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.endpoints-https", () => {
  it("passes when every declared endpoint is https", async () => {
    const outcome = await endpointsHttps.run(
      envWithToml({
        FEDERATION_SERVER: "https://api.domain.com/federation",
        WEB_AUTH_ENDPOINT: "https://api.domain.com/auth",
        HORIZON_URL: "https://horizon.domain.com",
      }),
    );
    expect(outcome.status).toBe("pass");
    expect(outcome.message).toContain("All 3 declared");
  });

  it("passes when no endpoint fields are declared", async () => {
    const outcome = await endpointsHttps.run(envWithToml({ SIGNING_KEY: "whatever" }));
    expect(outcome.status).toBe("pass");
    expect(outcome.message).toContain("No server endpoint fields are declared");
  });

  it("fails naming a plain-http endpoint", async () => {
    const outcome = await endpointsHttps.run(
      envWithToml({ TRANSFER_SERVER: "http://api.domain.com" }),
    );
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain('TRANSFER_SERVER="http://api.domain.com"');
  });

  it("fails on a value that is not a URL at all", async () => {
    const outcome = await endpointsHttps.run(envWithToml({ KYC_SERVER: "not a url" }));
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("not a valid URL");
  });

  it("treats the scheme case-insensitively", async () => {
    const outcome = await endpointsHttps.run(
      envWithToml({ FEDERATION_SERVER: "HTTPS://api.domain.com/federation" }),
    );
    expect(outcome.status).toBe("pass");
  });

  it("ignores absent fields while checking declared ones", async () => {
    const outcome = await endpointsHttps.run(
      envWithToml({ WEB_AUTH_ENDPOINT: "https://auth.domain.com" }),
    );
    expect(outcome.status).toBe("pass");
    expect(outcome.message).toContain("All 1 declared");
  });

  it("collects every offender in one failure", async () => {
    const outcome = await endpointsHttps.run(
      envWithToml({
        TRANSFER_SERVER: "http://a.example",
        ANCHOR_QUOTE_SERVER: "http://b.example",
      }),
    );
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain('TRANSFER_SERVER="http://a.example"');
    expect(outcome.message).toContain('ANCHOR_QUOTE_SERVER="http://b.example"');
  });
});

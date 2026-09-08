import { describe, expect, it } from "vitest";
import { tomlContentType } from "../../../src/checks/sep1/tomlContentType.js";
import { makeEnv } from "../../helpers.js";

describe("sep1.toml-content-type", () => {
  it("passes for text/plain", async () => {
    const env = makeEnv(() => ({
      status: 200,
      headers: { "content-type": "text/plain" },
      body: "VERSION=\"2.0.0\"\n",
    }));
    const outcome = await tomlContentType.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-1 §Specification, content type");
  });

  it("passes for text/plain with a charset parameter", async () => {
    const env = makeEnv(() => ({
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
      body: "VERSION=\"2.0.0\"\n",
    }));
    const outcome = await tomlContentType.run(env);
    expect(outcome.status).toBe("pass");
  });

  it("fails for other media types", async () => {
    const env = makeEnv(() => ({
      status: 200,
      headers: { "content-type": "application/octet-stream" },
      body: "VERSION=\"2.0.0\"\n",
    }));
    const outcome = await tomlContentType.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("application/octet-stream");
  });

  it("fails when the header is missing", async () => {
    // A Response with a string body always synthesizes a content-type, so the
    // missing-header case is exercised with an explicitly empty value.
    const env = makeEnv(() => ({
      status: 200,
      headers: { "content-type": "" },
      body: "VERSION=\"2.0.0\"\n",
    }));
    const outcome = await tomlContentType.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("missing");
  });
});

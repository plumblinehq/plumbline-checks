import { describe, expect, it } from "vitest";
import { tomlCors } from "../../../src/checks/sep1/tomlCors.js";
import { makeEnv } from "../../helpers.js";

describe("sep1.toml-cors", () => {
  it("passes when Access-Control-Allow-Origin is *", async () => {
    const env = makeEnv(() => ({
      status: 200,
      headers: { "access-control-allow-origin": "*" },
      body: "VERSION=\"2.0.0\"\n",
    }));
    const outcome = await tomlCors.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-1 §Specification, CORS");
  });

  it("fails when the header is missing", async () => {
    const env = makeEnv(() => ({ status: 200, body: "VERSION=\"2.0.0\"\n" }));
    const outcome = await tomlCors.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("missing");
  });

  it("fails when the header is not the wildcard", async () => {
    const env = makeEnv(() => ({
      status: 200,
      headers: { "access-control-allow-origin": "https://wallet.example" },
      body: "VERSION=\"2.0.0\"\n",
    }));
    const outcome = await tomlCors.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain('is "https://wallet.example"');
  });

  it("records only the inspected header", async () => {
    const env = makeEnv(() => ({
      status: 200,
      headers: { "access-control-allow-origin": "*", "x-other": "value" },
      body: "",
    }));
    const outcome = await tomlCors.run(env);
    expect(outcome.evidence[0]?.headers).toEqual({ "access-control-allow-origin": "*" });
  });
});

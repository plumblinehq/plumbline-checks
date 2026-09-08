import { describe, expect, it } from "vitest";
import { tomlReachable } from "../../../src/checks/sep1/tomlReachable.js";
import { makeEnv, type FakeResponse } from "../../helpers.js";

describe("sep1.toml-reachable", () => {
  it("passes when the toml is served with a 2xx status", async () => {
    const env = makeEnv(() => ({ status: 200, body: 'VERSION="2.0.0"\n' }));
    const outcome = await tomlReachable.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.message).toContain("HTTP 200");
    expect(outcome.specRef).toBe("SEP-1 §Specification");
  });

  it("fails when the toml is missing", async () => {
    const env = makeEnv(() => ({ status: 404, statusText: "Not Found", body: "nope" }));
    const outcome = await tomlReachable.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("404");
    expect(outcome.message).toContain(".well-known/stellar.toml");
  });

  it("fails on a server error", async () => {
    const env = makeEnv(() => ({ status: 500, statusText: "Internal Server Error" }));
    const outcome = await tomlReachable.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("500");
  });

  it("records the request as evidence", async () => {
    const env = makeEnv(() => ({ status: 200, body: "VERSION=\"2.0.0\"\n" }) as FakeResponse);
    const outcome = await tomlReachable.run(env);
    expect(outcome.evidence).toHaveLength(1);
    expect(outcome.evidence[0]?.method).toBe("GET");
    expect(outcome.evidence[0]?.url).toBe("https://example.com/.well-known/stellar.toml");
    expect(outcome.evidence[0]?.statusCode).toBe(200);
  });

  it("fetches the SEP-1 defined path for the env's home domain", async () => {
    const urls: string[] = [];
    const env = makeEnv((url) => {
      urls.push(url);
      return { status: 200, body: "" };
    });
    env.homeDomain = "anchor.example.org";
    await tomlReachable.run(env);
    expect(urls).toEqual(["https://anchor.example.org/.well-known/stellar.toml"]);
  });
});

import { describe, expect, it } from "vitest";
import { currencyTomlLinkResolves } from "../../../src/checks/sep1/currencyTomlLinkResolves.js";
import { makeEnv } from "../../helpers.js";

const LINK = "https://example.com/.well-known/CURRENCY.toml";

function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.currency-toml-link-resolves", () => {
  it("passes when every toml= link resolves and parses", async () => {
    const env = envWithToml({ CURRENCIES: [{ toml: LINK }, { code: "USD" }] });
    env.http = makeEnv((url) => {
      expect(url).toBe(LINK);
      return { status: 200, body: 'code="USD"\nissuer="G"\n' };
    }).http;
    const outcome = await currencyTomlLinkResolves.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-1 §Currency Documentation, toml link");
  });

  it("fails when a linked file does not resolve", async () => {
    const env = envWithToml({ CURRENCIES: [{ toml: LINK }] });
    env.http = makeEnv(() => ({ status: 404, body: "nope" })).http;
    const outcome = await currencyTomlLinkResolves.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("HTTP 404");
  });

  it("fails when a linked file is not valid TOML", async () => {
    const env = envWithToml({ CURRENCIES: [{ toml: LINK }] });
    env.http = makeEnv(() => ({ status: 200, body: "code = [unclosed" })).http;
    const outcome = await currencyTomlLinkResolves.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("not valid TOML");
  });

  it("fails when the link is not a valid URL", async () => {
    const outcome = await currencyTomlLinkResolves.run(
      envWithToml({ CURRENCIES: [{ toml: "not a url" }] }),
    );
    expect(outcome.status).toBe("fail");
  });

  it("skips when no entry links out via toml=", async () => {
    const outcome = await currencyTomlLinkResolves.run(envWithToml({ CURRENCIES: [{ code: "USD" }] }));
    expect(outcome.status).toBe("skip");
  });
});
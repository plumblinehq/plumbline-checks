import { describe, expect, it } from "vitest";
import { currencyImageReachable } from "../../../src/checks/sep1/currencyImageReachable.js";
import { makeEnv } from "../../helpers.js";

const IMAGE = "https://example.com/token.png";

function envWithToml(toml: Record<string, unknown>) {
  const env = makeEnv(() => ({ status: 200, body: "" }));
  env.toml = toml as never;
  return env;
}

describe("sep1.currency-image-reachable", () => {
  it("passes when every declared image resolves", async () => {
    const env = envWithToml({ CURRENCIES: [{ image: IMAGE }, { code: "USD" }] });
    env.http = makeEnv((url) => {
      expect(url).toBe(IMAGE);
      return { status: 200, body: "png" };
    }).http;
    const outcome = await currencyImageReachable.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-1 §Currency Documentation, image");
  });

  it("fails when an image does not resolve", async () => {
    const env = envWithToml({ CURRENCIES: [{ image: IMAGE }] });
    env.http = makeEnv(() => ({ status: 404, body: "" })).http;
    const outcome = await currencyImageReachable.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("HTTP 404");
  });

  it("fails when the image is not a valid URL", async () => {
    const outcome = await currencyImageReachable.run(envWithToml({ CURRENCIES: [{ image: "token.png" }] }));
    expect(outcome.status).toBe("fail");
  });

  it("skips when no entry declares an image", async () => {
    const outcome = await currencyImageReachable.run(envWithToml({ CURRENCIES: [{ code: "USD" }] }));
    expect(outcome.status).toBe("skip");
  });
});
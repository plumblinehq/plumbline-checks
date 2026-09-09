import { describe, expect, it } from "vitest";
import { corsHeaders } from "../../../src/checks/sep10/corsHeaders.js";
import { envWithSep10, responseOf } from "./helpers.js";

describe("sep10.cors-headers", () => {
  it("passes when Access-Control-Allow-Origin is *", async () => {
    const env = envWithSep10({
      response: responseOf({ headers: new Headers({ "access-control-allow-origin": "*" }) }),
    });
    const outcome = await corsHeaders.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-10 §Cross-Origin Headers");
  });

  it("fails when the header is missing", async () => {
    const env = envWithSep10({ response: responseOf() });
    const outcome = await corsHeaders.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("no Access-Control-Allow-Origin");
  });

  it("fails when the header is a specific origin", async () => {
    const env = envWithSep10({
      response: responseOf({ headers: new Headers({ "access-control-allow-origin": "https://wallet.example" }) }),
    });
    const outcome = await corsHeaders.run(env);
    expect(outcome.status).toBe("fail");
  });

  it("records only the inspected header", async () => {
    const env = envWithSep10({
      response: responseOf({
        headers: new Headers({ "access-control-allow-origin": "*", "x-other": "x" }),
      }),
    });
    const outcome = await corsHeaders.run(env);
    expect(outcome.evidence[0]?.headers).toEqual({ "access-control-allow-origin": "*" });
  });
});
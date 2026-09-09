import { describe, expect, it } from "vitest";
import { challengeJsonShape } from "../../../src/checks/sep10/challengeJsonShape.js";
import { envWithSep10, responseOf } from "./helpers.js";

describe("sep10.challenge-json-shape", () => {
  it("passes for a JSON object with a transaction field and stores it", async () => {
    const env = envWithSep10({
      response: responseOf({ body: '{"transaction":"AAAA","network_passphrase":"Test"}' }),
    });
    const outcome = await challengeJsonShape.run(env);
    expect(outcome.status).toBe("pass");
    expect(env.sep10?.json?.transaction).toBe("AAAA");
  });

  it("fails when the body is not JSON", async () => {
    const env = envWithSep10({ response: responseOf({ body: "not json" }) });
    const outcome = await challengeJsonShape.run(env);
    expect(outcome.status).toBe("fail");
  });

  it("fails when the body is a JSON array", async () => {
    const env = envWithSep10({ response: responseOf({ body: '["AAAA"]' }) });
    const outcome = await challengeJsonShape.run(env);
    expect(outcome.status).toBe("fail");
  });

  it("fails when the transaction field is missing", async () => {
    const env = envWithSep10({ response: responseOf({ body: '{"other":1}' }) });
    const outcome = await challengeJsonShape.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("transaction");
  });

  it("fails when the transaction field is not a string", async () => {
    const env = envWithSep10({ response: responseOf({ body: '{"transaction":123}' }) });
    const outcome = await challengeJsonShape.run(env);
    expect(outcome.status).toBe("fail");
  });
});
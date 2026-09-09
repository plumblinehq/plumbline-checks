import { describe, expect, it } from "vitest";
import { rejectsMissingAccount } from "../../../src/checks/sep10/rejectsMissingAccount.js";
import { envWithSep10, responseOf } from "./helpers.js";

describe("sep10.rejects-missing-account", () => {
  it("passes when the endpoint answers 4xx", async () => {
    const env = envWithSep10();
    env.sep10MissingAccountResponse = responseOf({ status: 400, body: '{"error":"x"}' });
    const outcome = await rejectsMissingAccount.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-10 §Request Parameters");
  });

  it("fails when the endpoint answers 5xx", async () => {
    const env = envWithSep10();
    env.sep10MissingAccountResponse = responseOf({ status: 500, body: '{"error":"boom"}' });
    const outcome = await rejectsMissingAccount.run(env);
    expect(outcome.status).toBe("fail");
    expect(rejectsMissingAccount.severity).toBe("warning");
    expect(outcome.message).toContain("500");
  });

  it("fails when the endpoint accepts the request", async () => {
    const env = envWithSep10();
    env.sep10MissingAccountResponse = responseOf({ status: 200, body: '{"transaction":"AAAA"}' });
    const outcome = await rejectsMissingAccount.run(env);
    expect(outcome.status).toBe("fail");
  });

  it("skips when no missing-account response was recorded", async () => {
    const env = envWithSep10();
    const outcome = await rejectsMissingAccount.run(env);
    expect(outcome.status).toBe("skip");
  });
});
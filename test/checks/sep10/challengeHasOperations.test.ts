import { describe, expect, it } from "vitest";
import { challengeHasOperations } from "../../../src/checks/sep10/challengeHasOperations.js";
import { decodedChallenge, envWithSep10 } from "./helpers.js";

describe("sep10.challenge-has-operations", () => {
  it("passes when the challenge has operations", async () => {
    const env = envWithSep10({ transaction: decodedChallenge() });
    const outcome = await challengeHasOperations.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-10 §Token");
  });

  it("fails when the challenge has no operations", async () => {
    const env = envWithSep10({
      transaction: decodedChallenge({ operations: [] }),
    });
    const outcome = await challengeHasOperations.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("no operations");
  });
});
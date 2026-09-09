import { describe, expect, it } from "vitest";
import { challengeSequenceZero } from "../../../src/checks/sep10/challengeSequenceZero.js";
import { decodedChallenge, envWithSep10 } from "./helpers.js";

describe("sep10.challenge-sequence-zero", () => {
  it("passes when the sequence number is 0", async () => {
    const env = envWithSep10({ transaction: decodedChallenge() });
    const outcome = await challengeSequenceZero.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-10 §Authentication flow");
  });

  it("fails when the sequence number is not 0", async () => {
    const env = envWithSep10({
      transaction: decodedChallenge({ startingSequence: "0" }),
    });
    const outcome = await challengeSequenceZero.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("not 0");
    expect(outcome.message).toContain("is 1");
  });
});
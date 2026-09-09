import { describe, expect, it } from "vitest";
import { challengeHasTimebounds } from "../../../src/checks/sep10/challengeHasTimebounds.js";
import { NOW_SECONDS } from "../../fixtures/sep10/challenge.js";
import { decodedChallenge, envWithSep10 } from "./helpers.js";

describe("sep10.challenge-has-timebounds", () => {
  it("passes when now is inside the bounds", async () => {
    const env = envWithSep10({ transaction: decodedChallenge() });
    const outcome = await challengeHasTimebounds.run(env);
    expect(outcome.status).toBe("pass");
  });

  it("fails when the challenge has no time bounds", async () => {
    const env = envWithSep10({
      transaction: decodedChallenge({ timebounds: null }),
    });
    const outcome = await challengeHasTimebounds.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("no time bounds");
  });

  it("fails when now is outside the bounds", async () => {
    const env = envWithSep10({
      transaction: decodedChallenge({
        timebounds: { minTime: NOW_SECONDS + 1000, maxTime: NOW_SECONDS + 2000 },
      }),
    });
    const outcome = await challengeHasTimebounds.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("outside");
  });
});
import { describe, expect, it } from "vitest";
import { challengeTimeboundWindow } from "../../../src/checks/sep10/challengeTimeboundWindow.js";
import { NOW_SECONDS } from "../../fixtures/sep10/challenge.js";
import { decodedChallenge, envWithSep10 } from "./helpers.js";

describe("sep10.challenge-timebound-window", () => {
  it("passes for the recommended 15-minute window", async () => {
    const env = envWithSep10({ transaction: decodedChallenge() });
    const outcome = await challengeTimeboundWindow.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-10 §Response (Success)");
  });

  it("fails for a window far from 900 seconds", async () => {
    const env = envWithSep10({
      transaction: decodedChallenge({
        timebounds: { minTime: NOW_SECONDS, maxTime: NOW_SECONDS + 300 },
      }),
    });
    const outcome = await challengeTimeboundWindow.run(env);
    expect(outcome.status).toBe("fail");
    expect(challengeTimeboundWindow.severity).toBe("warning");
    expect(outcome.message).toContain("300s");
  });

  it("skips when no time bounds are available", async () => {
    const env = envWithSep10({
      transaction: decodedChallenge({ timebounds: null }),
    });
    const outcome = await challengeTimeboundWindow.run(env);
    expect(outcome.status).toBe("skip");
  });
});
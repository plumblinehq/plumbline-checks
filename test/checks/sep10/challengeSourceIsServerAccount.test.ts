import { describe, expect, it } from "vitest";
import { challengeSourceIsServerAccount } from "../../../src/checks/sep10/challengeSourceIsServerAccount.js";
import { OTHER_KEYPAIR, SIGNING_KEY } from "../../fixtures/sep10/challenge.js";
import { decodedChallenge, envWithSep10 } from "./helpers.js";

describe("sep10.challenge-source-is-server-account", () => {
  it("passes when the source is the SIGNING_KEY", async () => {
    const env = envWithSep10({ transaction: decodedChallenge() });
    const outcome = await challengeSourceIsServerAccount.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-10 §Response (Success)");
  });

  it("fails when the source is another account", async () => {
    const env = envWithSep10({
      transaction: decodedChallenge({ source: OTHER_KEYPAIR.publicKey() }),
    });
    const outcome = await challengeSourceIsServerAccount.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain(SIGNING_KEY);
  });
});
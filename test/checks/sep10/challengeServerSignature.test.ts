import { describe, expect, it } from "vitest";
import { challengeServerSignature } from "../../../src/checks/sep10/challengeServerSignature.js";
import { OTHER_KEYPAIR } from "../../fixtures/sep10/challenge.js";
import { decodedChallenge, envWithSep10 } from "./helpers.js";

describe("sep10.challenge-server-signature", () => {
  it("passes when a signature verifies against the SIGNING_KEY", async () => {
    const env = envWithSep10({ transaction: decodedChallenge() });
    const outcome = await challengeServerSignature.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-10 §Authentication flow");
  });

  it("fails when the challenge is unsigned", async () => {
    const env = envWithSep10({
      transaction: decodedChallenge({ signedBy: [] }),
    });
    const outcome = await challengeServerSignature.run(env);
    expect(outcome.status).toBe("fail");
  });

  it("fails when signed only by another key", async () => {
    const env = envWithSep10({
      transaction: decodedChallenge({ signedBy: [OTHER_KEYPAIR] }),
    });
    const outcome = await challengeServerSignature.run(env);
    expect(outcome.status).toBe("fail");
  });
});
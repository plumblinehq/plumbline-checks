import { Operation } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { challengeFirstOpSource } from "../../../src/checks/sep10/challengeFirstOpSource.js";
import { OTHER_KEYPAIR } from "../../fixtures/sep10/challenge.js";
import { CLIENT_ACCOUNT, decodedChallenge, envWithSep10 } from "./helpers.js";

describe("sep10.challenge-first-op-source", () => {
  it("passes when the first operation's source is the requested account", async () => {
    const env = envWithSep10({ transaction: decodedChallenge() });
    const outcome = await challengeFirstOpSource.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-10 §Authentication flow");
  });

  it("fails when the source is a different account", async () => {
    const other = OTHER_KEYPAIR.publicKey();
    const env = envWithSep10({
      account: CLIENT_ACCOUNT,
      transaction: decodedChallenge({
        operations: [Operation.manageData({ name: "example.com auth", value: "value", source: other })],
      }),
    });
    const outcome = await challengeFirstOpSource.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain(other);
  });
});
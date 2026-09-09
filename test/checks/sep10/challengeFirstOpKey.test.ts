import { Operation, type Transaction } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { challengeFirstOpKey } from "../../../src/checks/sep10/challengeFirstOpKey.js";
import { validNonce } from "../../fixtures/sep10/challenge.js";
import { CLIENT_ACCOUNT, decodedChallenge, envWithSep10 } from "./helpers.js";

describe("sep10.challenge-first-op-key", () => {
  it("passes when the key is \"<home domain> auth\"", async () => {
    const env = envWithSep10({ transaction: decodedChallenge() });
    const outcome = await challengeFirstOpKey.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-10 §Response (Success)");
  });

  it("fails when the key names a different home domain", async () => {
    const env = envWithSep10({
      transaction: decodedChallenge({
        operations: [
          Operation.manageData({
            name: "other.example.com auth",
            value: validNonce(),
            source: CLIENT_ACCOUNT,
          }),
        ],
      }),
    });
    const outcome = await challengeFirstOpKey.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("other.example.com auth");
  });

  it("fails when the key exceeds 64 characters", async () => {
    // The XDR Manage Data name field is capped at 64 bytes, so no decoded
    // challenge can carry an oversized key — the check's length branch can
    // only be exercised with a hand-built transaction.
    const longDomain = "a-very-long-subdomain-name-that-pushes-the-key-over-the-limit.example.com";
    const env = envWithSep10({
      transaction: {
        operations: [{ type: "manageData", name: `${longDomain} auth` }],
      } as unknown as Transaction,
    });
    env.homeDomain = longDomain;
    const outcome = await challengeFirstOpKey.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("64");
  });
});
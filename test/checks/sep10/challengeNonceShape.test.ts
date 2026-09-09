import { Operation } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { challengeNonceShape } from "../../../src/checks/sep10/challengeNonceShape.js";
import { CLIENT_ACCOUNT, decodedChallenge, envWithSep10 } from "./helpers.js";

describe("sep10.challenge-nonce-shape", () => {
  it("passes for a 64-byte value decoding to 48 bytes", async () => {
    const env = envWithSep10({ transaction: decodedChallenge() });
    const outcome = await challengeNonceShape.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-10 §Response (Success)");
  });

  it("fails when the value is not 64 bytes", async () => {
    const env = envWithSep10({
      transaction: decodedChallenge({
        operations: [
          Operation.manageData({
            name: "example.com auth",
            value: new Uint8Array(32),
            source: CLIENT_ACCOUNT,
          }),
        ],
      }),
    });
    const outcome = await challengeNonceShape.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("32 bytes");
  });

  it("fails when the value does not decode to 48 bytes", async () => {
    // 64 bytes of a character outside the base64 alphabet decode to nothing.
    const env = envWithSep10({
      transaction: decodedChallenge({
        operations: [
          Operation.manageData({
            name: "example.com auth",
            value: new TextEncoder().encode("@".repeat(64)),
            source: CLIENT_ACCOUNT,
          }),
        ],
      }),
    });
    const outcome = await challengeNonceShape.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("48");
  });

  it("fails when the value is null", async () => {
    const env = envWithSep10({
      transaction: decodedChallenge({
        operations: [Operation.manageData({ name: "example.com auth", value: null, source: CLIENT_ACCOUNT })],
      }),
    });
    const outcome = await challengeNonceShape.run(env);
    expect(outcome.status).toBe("fail");
  });
});
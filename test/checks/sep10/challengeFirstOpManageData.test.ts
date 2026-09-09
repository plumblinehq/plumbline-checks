import { Asset, Operation } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { challengeFirstOpManageData } from "../../../src/checks/sep10/challengeFirstOpManageData.js";
import { CLIENT_ACCOUNT, decodedChallenge, envWithSep10 } from "./helpers.js";

describe("sep10.challenge-first-op-manage-data", () => {
  it("passes when the first operation is Manage Data with a source", async () => {
    const env = envWithSep10({ transaction: decodedChallenge() });
    const outcome = await challengeFirstOpManageData.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-10 §Authentication flow");
  });

  it("fails when the first operation is not Manage Data", async () => {
    const env = envWithSep10({
      transaction: decodedChallenge({
        operations: [
          Operation.payment({
            destination: CLIENT_ACCOUNT,
            asset: Asset.native(),
            amount: "1",
            source: CLIENT_ACCOUNT,
          }),
        ],
      }),
    });
    const outcome = await challengeFirstOpManageData.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("payment");
  });

  it("fails when the first Manage Data operation has no source", async () => {
    const env = envWithSep10({
      transaction: decodedChallenge({
        operations: [Operation.manageData({ name: "example.com auth", value: "value" })],
      }),
    });
    const outcome = await challengeFirstOpManageData.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("no source account");
  });
});
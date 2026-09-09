import { Asset, Operation } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { challengeOtherOpsSource } from "../../../src/checks/sep10/challengeOtherOpsSource.js";
import {
  OTHER_KEYPAIR,
  authOperation,
  clientDomainOperation,
  webAuthDomainOperation,
} from "../../fixtures/sep10/challenge.js";
import { CLIENT_ACCOUNT, decodedChallenge, envWithSep10 } from "./helpers.js";

describe("sep10.challenge-other-ops-source", () => {
  it("passes when additional operations are sourced from the server (or are client_domain)", async () => {
    const env = envWithSep10({
      transaction: decodedChallenge({
        operations: [authOperation(CLIENT_ACCOUNT), webAuthDomainOperation(), clientDomainOperation()],
      }),
    });
    const outcome = await challengeOtherOpsSource.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-10 §Authentication flow");
  });

  it("fails when an additional operation is not Manage Data", async () => {
    const env = envWithSep10({
      transaction: decodedChallenge({
        operations: [
          authOperation(CLIENT_ACCOUNT),
          Operation.payment({ destination: CLIENT_ACCOUNT, asset: Asset.native(), amount: "1" }),
        ],
      }),
    });
    const outcome = await challengeOtherOpsSource.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("not Manage Data");
  });

  it("fails when an additional operation is sourced from another account", async () => {
    const env = envWithSep10({
      transaction: decodedChallenge({
        operations: [
          authOperation(CLIENT_ACCOUNT),
          Operation.manageData({
            name: "reserved",
            value: new TextEncoder().encode("x"),
            source: OTHER_KEYPAIR.publicKey(),
          }),
        ],
      }),
    });
    const outcome = await challengeOtherOpsSource.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("reserved");
  });

  it("passes when there are no additional operations", async () => {
    const env = envWithSep10({ transaction: decodedChallenge() });
    const outcome = await challengeOtherOpsSource.run(env);
    expect(outcome.status).toBe("pass");
  });
});
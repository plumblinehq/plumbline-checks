import { Operation } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { challengeWebAuthDomainOp } from "../../../src/checks/sep10/challengeWebAuthDomainOp.js";
import {
  OTHER_KEYPAIR,
  SIGNING_KEY,
  authOperation,
  webAuthDomainOperation,
} from "../../fixtures/sep10/challenge.js";
import { CLIENT_ACCOUNT, decodedChallenge, envWithSep10 } from "./helpers.js";

describe("sep10.challenge-web-auth-domain-op", () => {
  it("passes when the operation is sourced from the server with the called domain", async () => {
    const env = envWithSep10({
      transaction: decodedChallenge({
        operations: [authOperation(CLIENT_ACCOUNT), webAuthDomainOperation("example.com")],
      }),
    });
    const outcome = await challengeWebAuthDomainOp.run(env);
    expect(outcome.status).toBe("pass");
    expect(outcome.specRef).toBe("SEP-10 §Authentication flow");
  });

  it("fails when the operation is sourced from another account", async () => {
    const env = envWithSep10({
      transaction: decodedChallenge({
        operations: [
          authOperation(CLIENT_ACCOUNT),
          Operation.manageData({
            name: "web_auth_domain",
            value: new TextEncoder().encode("example.com"),
            source: OTHER_KEYPAIR.publicKey(),
          }),
        ],
      }),
    });
    const outcome = await challengeWebAuthDomainOp.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain(SIGNING_KEY);
  });

  it("fails when the value is not the domain we called", async () => {
    const env = envWithSep10({
      transaction: decodedChallenge({
        operations: [authOperation(CLIENT_ACCOUNT), webAuthDomainOperation("other.example.com")],
      }),
    });
    const outcome = await challengeWebAuthDomainOp.run(env);
    expect(outcome.status).toBe("fail");
    expect(outcome.message).toContain("other.example.com");
  });

  it("skips when the challenge has no web_auth_domain operation", async () => {
    const env = envWithSep10({ transaction: decodedChallenge() });
    const outcome = await challengeWebAuthDomainOp.run(env);
    expect(outcome.status).toBe("skip");
  });
});
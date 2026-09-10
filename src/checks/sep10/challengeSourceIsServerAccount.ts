import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { sep10Context, signingKey } from "./common.js";

/**
 * SEP-10 §Response (Success): the challenge transaction has its "source
 * account set to the Server Account" — the SIGNING_KEY from the toml. A
 * challenge sourced from any other account cannot be trusted.
 */
export const challengeSourceIsServerAccount: Check = {
  id: "sep10.challenge-source-is-server-account",
  sep: 10,
  title: "the challenge source account is the SIGNING_KEY",
  description:
    "Requires the decoded challenge transaction's source account to equal the toml's SIGNING_KEY, per SEP-10 §Response (Success).",
  severity: "error",
  specRef: "SEP-10 §Response (Success)",
  requires: ["sep10.challenge-decodes"],
  async run(env: Env): Promise<CheckOutcome> {
    const serverAccount = signingKey(env);
    if (serverAccount === undefined) {
      return {
        status: "skip",
        message: "SIGNING_KEY is not declared; nothing to validate.",
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    const transaction = sep10Context(env).transaction;
    if (transaction === undefined) {
      return {
        status: "skip",
        message: "No decoded challenge transaction is available.",
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    if (transaction.source === serverAccount) {
      return {
        status: "pass",
        message: "The challenge source account is the SIGNING_KEY.",
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    return {
      status: "fail",
      message: `The challenge source account is ${transaction.source} but the SIGNING_KEY is ${serverAccount}.`,
      specRef: "SEP-10 §Response (Success)",
      evidence: [],
    };
  },
};

register(challengeSourceIsServerAccount);
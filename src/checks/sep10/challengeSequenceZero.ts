import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { sep10Context } from "./common.js";

/**
 * SEP-10 §Authentication flow: "The Client verifies that the transaction
 * has an invalid sequence number 0. This is extremely important to ensure
 * the transaction isn't malicious." A challenge with a real sequence number
 * could execute on the network, so this is an error-severity check.
 */
export const challengeSequenceZero: Check = {
  id: "sep10.challenge-sequence-zero",
  sep: 10,
  title: "the challenge sequence number is 0",
  description:
    "Requires the decoded challenge transaction to carry sequence number 0, which SEP-10 calls extremely important.",
  severity: "error",
  requires: ["sep10.challenge-decodes"],
  async run(env: Env): Promise<CheckOutcome> {
    const transaction = sep10Context(env).transaction;
    if (transaction === undefined) {
      return {
        status: "skip",
        message: "No decoded challenge transaction is available.",
        specRef: "SEP-10 §Authentication flow",
        evidence: [],
      };
    }
    if (transaction.sequence === "0") {
      return {
        status: "pass",
        message: "The challenge sequence number is 0, so the transaction cannot execute on the network.",
        specRef: "SEP-10 §Authentication flow",
        evidence: [],
      };
    }
    return {
      status: "fail",
      message: `The challenge sequence number is ${transaction.sequence}, not 0; SEP-10 requires 0 so the transaction cannot be executed.`,
      specRef: "SEP-10 §Authentication flow",
      evidence: [],
    };
  },
};

register(challengeSequenceZero);
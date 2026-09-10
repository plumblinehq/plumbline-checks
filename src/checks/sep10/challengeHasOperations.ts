import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { sep10Context } from "./common.js";

/**
 * SEP-10 §Token (server-side validation): "verify that transaction contains
 * at least one operation". A challenge with no operations authenticates
 * nothing.
 */
export const challengeHasOperations: Check = {
  id: "sep10.challenge-has-operations",
  sep: 10,
  title: "the challenge has at least one operation",
  description:
    "Requires the decoded challenge transaction to contain at least one operation, per SEP-10's validation steps.",
  severity: "error",
  specRef: "SEP-10 §Token",
  requires: ["sep10.challenge-decodes"],
  async run(env: Env): Promise<CheckOutcome> {
    const transaction = sep10Context(env).transaction;
    if (transaction === undefined) {
      return {
        status: "skip",
        message: "No decoded challenge transaction is available.",
        specRef: "SEP-10 §Token",
        evidence: [],
      };
    }
    if (transaction.operations.length === 0) {
      return {
        status: "fail",
        message: "The challenge has no operations; SEP-10 requires at least one.",
        specRef: "SEP-10 §Token",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: `The challenge has ${transaction.operations.length} operation${transaction.operations.length === 1 ? "" : "s"}.`,
      specRef: "SEP-10 §Token",
      evidence: [],
    };
  },
};

register(challengeHasOperations);
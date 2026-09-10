import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { sep10Context } from "./common.js";

/**
 * SEP-10 §Authentication flow: "The Client verifies that the transaction's
 * first operation is a Manage Data operation that has its: Source account
 * set to the Client Account..." — the source must be non-null here; the
 * specific value is `sep10.challenge-first-op-source`'s clause.
 */
export const challengeFirstOpManageData: Check = {
  id: "sep10.challenge-first-op-manage-data",
  sep: 10,
  title: "the first operation is a Manage Data operation",
  description:
    "Requires the challenge's first operation to be a Manage Data operation with a non-null source account.",
  severity: "error",
  specRef: "SEP-10 §Authentication flow",
  requires: ["sep10.challenge-has-operations"],
  async run(env: Env): Promise<CheckOutcome> {
    const transaction = sep10Context(env).transaction;
    const first = transaction?.operations[0];
    if (transaction === undefined || first === undefined) {
      return {
        status: "skip",
        message: "No challenge operations are available.",
        specRef: "SEP-10 §Authentication flow",
        evidence: [],
      };
    }
    if (first.type !== "manageData") {
      return {
        status: "fail",
        message: `The first operation is ${first.type}, not a Manage Data operation; SEP-10 requires the first operation to be Manage Data.`,
        specRef: "SEP-10 §Authentication flow",
        evidence: [],
      };
    }
    if (first.source === undefined) {
      return {
        status: "fail",
        message: "The first Manage Data operation has no source account; SEP-10 requires it to be set to the client account.",
        specRef: "SEP-10 §Authentication flow",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: "The first operation is a Manage Data operation with a source account.",
      specRef: "SEP-10 §Authentication flow",
      evidence: [],
    };
  },
};

register(challengeFirstOpManageData);
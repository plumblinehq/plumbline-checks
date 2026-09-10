import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { sep10Context } from "./common.js";

/**
 * SEP-10 §Authentication flow: the first Manage Data operation's "Source
 * account set to the Client Account" — the ephemeral account we supplied in
 * the request. Any other source means the challenge authenticates a
 * different account than the one requested.
 */
export const challengeFirstOpSource: Check = {
  id: "sep10.challenge-first-op-source",
  sep: 10,
  title: "the first operation's source is the requested account",
  description:
    "Requires the first Manage Data operation's source account to equal the ephemeral account supplied in the challenge request.",
  severity: "error",
  specRef: "SEP-10 §Authentication flow",
  requires: ["sep10.challenge-first-op-manage-data"],
  async run(env: Env): Promise<CheckOutcome> {
    const context = sep10Context(env);
    const first = context.transaction?.operations[0];
    if (first === undefined) {
      return {
        status: "skip",
        message: "No challenge operations are available.",
        specRef: "SEP-10 §Authentication flow",
        evidence: [],
      };
    }
    if (first.source === context.account) {
      return {
        status: "pass",
        message: "The first operation's source is the account we requested the challenge for.",
        specRef: "SEP-10 §Authentication flow",
        evidence: [],
      };
    }
    return {
      status: "fail",
      message: `The first operation's source is ${first.source ?? "(none)"} but the challenge was requested for ${context.account}.`,
      specRef: "SEP-10 §Authentication flow",
      evidence: [],
    };
  },
};

register(challengeFirstOpSource);
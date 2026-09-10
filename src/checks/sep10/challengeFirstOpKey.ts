import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { sep10Context } from "./common.js";

/**
 * SEP-10 §Response (Success): the first operation's key "is the Home
 * Domain, followed by auth. It can be at most 64 characters." The home
 * domain here is the one hosting the stellar.toml we read — the SEP-1
 * home domain of this run. Both halves of the clause (the exact value and
 * the 64-character cap) are enforced.
 */
export const challengeFirstOpKey: Check = {
  id: "sep10.challenge-first-op-key",
  sep: 10,
  title: "the first operation's key is \"<home domain> auth\"",
  description:
    "Requires the first Manage Data operation's key to be the home domain followed by \" auth\", at most 64 characters.",
  severity: "error",
  specRef: "SEP-10 §Response (Success)",
  requires: ["sep10.challenge-first-op-manage-data"],
  async run(env: Env): Promise<CheckOutcome> {
    const first = sep10Context(env).transaction?.operations[0];
    if (first === undefined || first.type !== "manageData") {
      return {
        status: "skip",
        message: "No first Manage Data operation is available.",
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    const expected = `${env.homeDomain} auth`;
    const name = first.name;
    if (name !== expected) {
      return {
        status: "fail",
        message: `The first operation's key is "${name}", not "${expected}" as SEP-10 requires.`,
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    if (name.length > 64) {
      return {
        status: "fail",
        message: `The first operation's key is ${name.length} characters; SEP-10 caps it at 64.`,
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: `The first operation's key is "${expected}", within the 64-character cap.`,
      specRef: "SEP-10 §Response (Success)",
      evidence: [],
    };
  },
};

register(challengeFirstOpKey);
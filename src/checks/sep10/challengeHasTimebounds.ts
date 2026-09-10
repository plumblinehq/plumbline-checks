import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { sep10Context } from "./common.js";

/**
 * SEP-10 §Response (Success): the challenge transaction has "time bounds:
 * {min: now(), max: now() + 900}", and the token endpoint's own validation
 * requires that "current time is between the minimum and maximum bounds".
 * The clock comes from `env.now()` so tests can freeze it.
 */
export const challengeHasTimebounds: Check = {
  id: "sep10.challenge-has-timebounds",
  sep: 10,
  title: "the challenge has time bounds covering now",
  description:
    "Requires the decoded challenge transaction to have time bounds with the current time inside them.",
  severity: "error",
  specRef: "SEP-10 §Response (Success)",
  requires: ["sep10.challenge-decodes"],
  async run(env: Env): Promise<CheckOutcome> {
    const transaction = sep10Context(env).transaction;
    if (transaction === undefined) {
      return {
        status: "skip",
        message: "No decoded challenge transaction is available.",
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    const bounds = transaction.timeBounds;
    // maxTime 0 is XDR's "no upper bound" sentinel (TimeoutInfinite); such a
    // challenge has no usable time bounds, so it fails the same way as one
    // that omits them entirely.
    if (bounds === undefined || BigInt(bounds.maxTime) === 0n) {
      return {
        status: "fail",
        message: "The challenge has no time bounds; SEP-10 requires time bounds with the current time inside them.",
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    const nowSeconds = Math.floor(env.now().getTime() / 1000);
    const min = BigInt(bounds.minTime);
    const max = BigInt(bounds.maxTime);
    if (BigInt(nowSeconds) < min || BigInt(nowSeconds) > max) {
      return {
        status: "fail",
        message: `The current time (${nowSeconds}) is outside the challenge time bounds (${bounds.minTime}..${bounds.maxTime}).`,
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: `The challenge time bounds (${bounds.minTime}..${bounds.maxTime}) cover the current time.`,
      specRef: "SEP-10 §Response (Success)",
      evidence: [],
    };
  },
};

register(challengeHasTimebounds);
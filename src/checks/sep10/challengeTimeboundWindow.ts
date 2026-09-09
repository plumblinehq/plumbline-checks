import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { sep10Context } from "./common.js";

/** SEP-10's recommended expiration, in seconds: "we recommend expiration of 15 minutes". */
const RECOMMENDED_WINDOW_SECONDS = 900;
/** How far a window may deviate from the recommendation before it is flagged. */
const WINDOW_TOLERANCE_SECONDS = 90;

/**
 * SEP-10 §Response (Success): the challenge "time bounds: {min: now(),
 * max: now() + 900} (we recommend expiration of 15 minutes to give the
 * Client time to sign transaction)". RECOMMENDED maps to warning severity,
 * and the "≈" in the catalogue is enforced as a ±10% band — choosing a
 * tolerance is an interpretation, which is exactly why this can never be an
 * error.
 */
export const challengeTimeboundWindow: Check = {
  id: "sep10.challenge-timebound-window",
  sep: 10,
  title: "the challenge time-bound window is about 15 minutes",
  description:
    "Requires the challenge time bounds to span roughly the 900 seconds SEP-10 recommends (within a 10% band).",
  severity: "warning",
  requires: ["sep10.challenge-has-timebounds"],
  async run(env: Env): Promise<CheckOutcome> {
    const transaction = sep10Context(env).transaction;
    const bounds = transaction?.timeBounds;
    // maxTime 0 is XDR's "no upper bound" sentinel (TimeoutInfinite); with no
    // window to measure, the check skips — the has-timebounds check fails the
    // challenge separately.
    if (transaction === undefined || bounds === undefined || BigInt(bounds.maxTime) === 0n) {
      return {
        status: "skip",
        message: "No challenge time bounds are available.",
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    const windowSeconds = Number(BigInt(bounds.maxTime) - BigInt(bounds.minTime));
    const deviation = Math.abs(windowSeconds - RECOMMENDED_WINDOW_SECONDS);
    if (deviation > WINDOW_TOLERANCE_SECONDS) {
      return {
        status: "fail",
        message: `The challenge time-bound window is ${windowSeconds}s; SEP-10 recommends about ${RECOMMENDED_WINDOW_SECONDS}s (15 minutes).`,
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: `The challenge time-bound window is ${windowSeconds}s, close to the recommended ${RECOMMENDED_WINDOW_SECONDS}s.`,
      specRef: "SEP-10 §Response (Success)",
      evidence: [],
    };
  },
};

register(challengeTimeboundWindow);
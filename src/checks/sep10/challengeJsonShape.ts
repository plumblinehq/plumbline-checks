import type { Check, CheckOutcome, Env } from "../../core.js";
import { recordEvidence } from "../../probe/evidence.js";
import { register } from "../../registry.js";
import { sep10Context } from "./common.js";

/**
 * SEP-10 §Response (Success): "On success the endpoint must return 200 OK
 * HTTP status code and a JSON object with these fields: transaction: an
 * XDR-encoded Stellar transaction". The body must be a JSON object carrying
 * a string `transaction`; anything else fails here, and the decoded
 * transaction is published to `env.sep10.json` for the checks that follow.
 */
export const challengeJsonShape: Check = {
  id: "sep10.challenge-json-shape",
  sep: 10,
  title: "the challenge response is JSON with a transaction field",
  description:
    "Requires the 200 response body to be a JSON object with a string `transaction` field, per SEP-10 §Response (Success).",
  severity: "error",
  specRef: "SEP-10 §Response (Success)",
  requires: ["sep10.challenge-returns-200"],
  async run(env: Env): Promise<CheckOutcome> {
    const context = sep10Context(env);
    const evidence = [recordEvidence("GET", context.response)];
    let parsed: unknown;
    try {
      parsed = JSON.parse(context.response.body);
    } catch {
      return {
        status: "fail",
        message: "The challenge response body is not valid JSON; SEP-10 requires a JSON object with a transaction field.",
        specRef: "SEP-10 §Response (Success)",
        evidence,
      };
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {
        status: "fail",
        message: "The challenge response is not a JSON object; SEP-10 requires an object with a transaction field.",
        specRef: "SEP-10 §Response (Success)",
        evidence,
      };
    }
    const json = parsed as Record<string, unknown>;
    if (typeof json.transaction !== "string" || json.transaction.length === 0) {
      return {
        status: "fail",
        message: 'The challenge response has no string "transaction" field; SEP-10 requires one.',
        specRef: "SEP-10 §Response (Success)",
        evidence,
      };
    }
    context.json = json;
    return {
      status: "pass",
      message: "The challenge response is JSON with a transaction field.",
      specRef: "SEP-10 §Response (Success)",
      evidence,
    };
  },
};

register(challengeJsonShape);
import type { Check, CheckOutcome, Env } from "../../core.js";
import { recordEvidence } from "../../probe/evidence.js";
import { register } from "../../registry.js";
import { sep10Context } from "./common.js";

/**
 * SEP-10 §Cross-Origin Headers: "The following HTTP header must be set for
 * all authentication endpoints, including error responses:
 * Access-Control-Allow-Origin: *". This check inspects the challenge
 * response recorded by `sep10.challenge-returns-200`; the spec demands the
 * header on error responses too, which `sep10.error-response-shape`
 * exercises separately — that check could not assert CORS on the error body
 * it captures, so the stricter reading is covered here only for the
 * success response, a limitation noted rather than silently extended.
 */
export const corsHeaders: Check = {
  id: "sep10.cors-headers",
  sep: 10,
  title: "the auth endpoint sets Access-Control-Allow-Origin: *",
  description:
    "Requires the challenge response to carry the wildcard CORS header, per SEP-10 §Cross-Origin Headers.",
  severity: "error",
  requires: ["sep10.challenge-returns-200"],
  async run(env: Env): Promise<CheckOutcome> {
    const context = sep10Context(env);
    const evidence = [
      recordEvidence("GET", context.response, { inspectedHeaders: ["access-control-allow-origin"] }),
    ];
    const header = context.response.headers.get("access-control-allow-origin");
    if (header === null || header !== "*") {
      return {
        status: "fail",
        message: header === null
          ? "The challenge response has no Access-Control-Allow-Origin header; SEP-10 requires exactly \"*\"."
          : `Access-Control-Allow-Origin is "${header}"; SEP-10 requires exactly "*".`,
        specRef: "SEP-10 §Cross-Origin Headers",
        evidence,
      };
    }
    return {
      status: "pass",
      message: "The challenge response sets Access-Control-Allow-Origin: *.",
      specRef: "SEP-10 §Cross-Origin Headers",
      evidence,
    };
  },
};

register(corsHeaders);
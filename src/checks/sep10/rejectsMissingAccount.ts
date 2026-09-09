import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";

/**
 * SEP-10 §Request Parameters lists `account` as a required parameter, and
 * §Response (Error) treats every non-200 status as an error. A request
 * without the account is a client error, so the endpoint must answer with
 * 4xx — a 5xx means the server failed on input it should have rejected.
 * The response itself is fetched by `sep10.error-response-shape`, which
 * this check reads, so the two assertions share one request. Warning
 * severity: the exact status code for a missing parameter is the server's
 * choice, and the catalogue grades it as an observation.
 */
export const rejectsMissingAccount: Check = {
  id: "sep10.rejects-missing-account",
  sep: 10,
  title: "a missing account parameter is rejected with 4xx",
  description:
    "Requires the auth endpoint to answer a request without the account parameter with a 4xx, not a 5xx.",
  severity: "warning",
  requires: ["sep10.error-response-shape"],
  async run(env: Env): Promise<CheckOutcome> {
    const response = env.sep10MissingAccountResponse;
    if (response === undefined) {
      return {
        status: "skip",
        message: "No missing-account response is available.",
        specRef: "SEP-10 §Request Parameters",
        evidence: [],
      };
    }
    if (response.status >= 400 && response.status < 500) {
      return {
        status: "pass",
        message: `A request without the account parameter is rejected with HTTP ${response.status}.`,
        specRef: "SEP-10 §Request Parameters",
        evidence: [],
      };
    }
    return {
      status: "fail",
      message:
        response.status >= 500
          ? `A request without the account parameter produced HTTP ${response.status}; the endpoint should reject it with a 4xx client error.`
          : `A request without the account parameter was not rejected (HTTP ${response.status}); the account parameter is required.`,
      specRef: "SEP-10 §Request Parameters",
      evidence: [],
    };
  },
};

register(rejectsMissingAccount);
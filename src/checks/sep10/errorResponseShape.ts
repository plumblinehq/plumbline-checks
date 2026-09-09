import type { Check, CheckOutcome, Env } from "../../core.js";
import { recordEvidence } from "../../probe/evidence.js";
import { register } from "../../registry.js";
import { webAuthEndpoint } from "./common.js";

/**
 * SEP-10 §Response (Error): "Every other HTTP status code will be
 * considered an error", returned as JSON with an `error` field. This makes
 * the malformed request — GET <WEB_AUTH_ENDPOINT> with no account parameter
 * — and requires an error status with a JSON body carrying a string
 * `error`. The response is published to `env.sep10.missingAccountResponse`
 * so `sep10.rejects-missing-account` can inspect its status code without a
 * second request. An endpoint that accepts the malformed request (2xx)
 * fails at warning severity: it is not following the request shape.
 */
export const errorResponseShape: Check = {
  id: "sep10.error-response-shape",
  sep: 10,
  title: "a malformed request returns JSON with an error field",
  description:
    "Requests the auth endpoint without the required account parameter and requires an error response with a JSON error field.",
  severity: "warning",
  requires: ["sep1.toml-parses", "sep10.endpoint-declared"],
  async run(env: Env): Promise<CheckOutcome> {
    const endpoint = webAuthEndpoint(env);
    if (endpoint === undefined) {
      return {
        status: "skip",
        message: "WEB_AUTH_ENDPOINT is not declared; nothing to validate.",
        specRef: "SEP-10 §Response (Error)",
        evidence: [],
      };
    }
    const response = await env.http.get(endpoint);
    const evidence = [recordEvidence("GET", response)];
    env.sep10MissingAccountResponse = response;
    if (response.status >= 200 && response.status < 300) {
      return {
        status: "fail",
        message: `A request without the required account parameter was accepted (HTTP ${response.status}); SEP-10 requires an error response for a malformed request.`,
        specRef: "SEP-10 §Response (Error)",
        evidence,
      };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(response.body);
    } catch {
      return {
        status: "fail",
        message: `The error response (HTTP ${response.status}) is not JSON; SEP-10 error responses are JSON with an error field.`,
        specRef: "SEP-10 §Response (Error)",
        evidence,
      };
    }
    if (typeof parsed !== "object" || parsed === null || typeof (parsed as Record<string, unknown>).error !== "string") {
      return {
        status: "fail",
        message: `The error response (HTTP ${response.status}) has no string error field; SEP-10 error responses are JSON with an error field.`,
        specRef: "SEP-10 §Response (Error)",
        evidence,
      };
    }
    return {
      status: "pass",
      message: `A malformed request returns HTTP ${response.status} with a JSON error field.`,
      specRef: "SEP-10 §Response (Error)",
      evidence,
    };
  },
};

register(errorResponseShape);
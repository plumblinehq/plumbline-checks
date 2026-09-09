import type { Check, CheckOutcome, Env } from "../../core.js";
import { recordEvidence } from "../../probe/evidence.js";
import { register } from "../../registry.js";
import { webAuthEndpoint } from "./common.js";

/**
 * SEP-10 §Cross-Origin Headers: "In order for browsers-based wallets to
 * validate the CORS headers, as specified by W3C, the preflight request
 * (OPTIONS request) must be implemented in all the endpoints that support
 * Cross-Origin." This sends a standard preflight — Origin plus
 * Access-Control-Request-Method — and requires a 2xx response with the
 * wildcard CORS header. A 3xx would be a redirect the client follows, so a
 * 2xx is expected after redirects.
 */
export const optionsPreflight: Check = {
  id: "sep10.options-preflight",
  sep: 10,
  title: "the auth endpoint implements the CORS preflight",
  description:
    "Sends an OPTIONS preflight to WEB_AUTH_ENDPOINT and requires a 2xx response with Access-Control-Allow-Origin: *.",
  severity: "error",
  requires: ["sep1.toml-parses", "sep10.endpoint-declared"],
  async run(env: Env): Promise<CheckOutcome> {
    const endpoint = webAuthEndpoint(env);
    if (endpoint === undefined) {
      return {
        status: "skip",
        message: "WEB_AUTH_ENDPOINT is not declared; nothing to validate.",
        specRef: "SEP-10 §Cross-Origin Headers",
        evidence: [],
      };
    }
    const response = await env.http.options(endpoint, {
      headers: {
        origin: "https://plumbline.example",
        "access-control-request-method": "GET",
      },
    });
    const evidence = [
      recordEvidence("OPTIONS", response, { inspectedHeaders: ["access-control-allow-origin"] }),
    ];
    const header = response.headers.get("access-control-allow-origin");
    if (response.status < 200 || response.status >= 300) {
      return {
        status: "fail",
        message: `OPTIONS ${endpoint} returned HTTP ${response.status} ${response.statusText}; SEP-10 requires the preflight to be implemented.`,
        specRef: "SEP-10 §Cross-Origin Headers",
        evidence,
      };
    }
    if (header === null || header !== "*") {
      return {
        status: "fail",
        message: header === null
          ? "The preflight response has no Access-Control-Allow-Origin header; SEP-10 requires exactly \"*\"."
          : `The preflight response sets Access-Control-Allow-Origin: "${header}"; SEP-10 requires exactly "*".`,
        specRef: "SEP-10 §Cross-Origin Headers",
        evidence,
      };
    }
    return {
      status: "pass",
      message: "The auth endpoint implements the CORS preflight and returns Access-Control-Allow-Origin: *.",
      specRef: "SEP-10 §Cross-Origin Headers",
      evidence,
    };
  },
};

register(optionsPreflight);
import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { signingKey, webAuthEndpoint } from "./common.js";

/**
 * SEP-10 §Authentication Endpoint: an organization opts into SEP-10 "by
 * specifying WEB_AUTH_ENDPOINT in their stellar.toml file", and SEP-10
 * §Abstract defines the SIGNING_KEY as the Server Account the challenge must
 * be signed by. Without either, no SEP-10 check can run — this is the gate
 * every other SEP-10 check requires. It reports at info severity and fails
 * (harmlessly) when the anchor does not declare web auth at all; the runner
 * then skips every dependent check, which is exactly the "not applicable"
 * behavior the catalogue intends.
 */
export const endpointDeclared: Check = {
  id: "sep10.endpoint-declared",
  sep: 10,
  title: "WEB_AUTH_ENDPOINT and SIGNING_KEY are declared",
  description:
    "Requires the toml to declare both the SEP-10 web auth endpoint and the server account that signs challenges.",
  severity: "info",
  requires: ["sep1.toml-parses"],
  async run(env: Env): Promise<CheckOutcome> {
    const missing: string[] = [];
    if (webAuthEndpoint(env) === undefined) {
      missing.push("WEB_AUTH_ENDPOINT");
    }
    if (signingKey(env) === undefined) {
      missing.push("SIGNING_KEY");
    }
    if (missing.length > 0) {
      return {
        status: "fail",
        message: `SEP-10 web auth is not declared: ${missing.join(", ")} is missing from the stellar.toml.`,
        specRef: "SEP-10 §Authentication Endpoint",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: "WEB_AUTH_ENDPOINT and SIGNING_KEY are both declared; SEP-10 checks can run.",
      specRef: "SEP-10 §Authentication Endpoint",
      evidence: [],
    };
  },
};

register(endpointDeclared);
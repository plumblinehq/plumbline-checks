import { Keypair } from "@stellar/stellar-sdk";
import type { Check, CheckOutcome, Env } from "../../core.js";
import { recordEvidence } from "../../probe/evidence.js";
import { register } from "../../registry.js";
import { challengeUrl, webAuthEndpoint, CLIENT_ORIGIN } from "./common.js";

/**
 * SEP-10 §Response (Success): "On success the endpoint must return 200 OK
 * HTTP status code and a JSON object". This is the SEP-10 fetch-level check:
 * it generates an ephemeral keypair purely to supply the `account` query
 * parameter (nothing is ever signed or submitted), requests the challenge
 * with a browser-like Origin header (see CLIENT_ORIGIN), and publishes the
 * response plus the account into `env.sep10` for every dependent check —
 * mirroring how `sep1.toml-parses` publishes `env.toml`.
 *
 * A 401/403 response means the endpoint requires an Authorization header;
 * authenticated flows are out of scope by design, so that reports as skip,
 * never as a failure.
 */
export const challengeReturns200: Check = {
  id: "sep10.challenge-returns-200",
  sep: 10,
  title: "the challenge endpoint returns 200",
  description:
    "Requests a challenge from WEB_AUTH_ENDPOINT with an ephemeral account and requires a 200 response.",
  severity: "error",
  specRef: "SEP-10 §Response (Success)",
  requires: ["sep1.toml-parses", "sep10.endpoint-declared"],
  async run(env: Env): Promise<CheckOutcome> {
    const endpoint = webAuthEndpoint(env);
    if (endpoint === undefined) {
      return {
        status: "skip",
        message: "WEB_AUTH_ENDPOINT is not declared; nothing to validate.",
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    // An ephemeral keypair, used only for its public key as the `account`
    // query parameter. The account need not exist on the network.
    const account = Keypair.random().publicKey();
    const url = challengeUrl(endpoint, account);
    const response = await env.http.get(url, { headers: { origin: CLIENT_ORIGIN } });
    const evidence = [recordEvidence("GET", response)];
    env.sep10 = { account, endpointUrl: endpoint, response };
    if (response.status === 401 || response.status === 403) {
      return {
        status: "skip",
        message: `The challenge endpoint requires authorization (HTTP ${response.status}); authenticated SEP-10 flows are out of scope.`,
        specRef: "SEP-10 §Response (Success)",
        evidence,
      };
    }
    if (response.status !== 200) {
      return {
        status: "fail",
        message: `GET ${url} returned HTTP ${response.status} ${response.statusText}; SEP-10 requires the challenge endpoint to return 200 OK.`,
        specRef: "SEP-10 §Response (Success)",
        evidence,
      };
    }
    return {
      status: "pass",
      message: `The challenge endpoint returned 200 for an ephemeral account (${account}).`,
      specRef: "SEP-10 §Response (Success)",
      evidence,
    };
  },
};

register(challengeReturns200);
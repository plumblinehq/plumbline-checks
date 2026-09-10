import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { normalizedHost } from "../sep1/common.js";
import { endpointHost, sep10Context, signingKey } from "./common.js";

/**
 * SEP-10 §Authentication flow: "The Client verifies that if the transaction
 * has a Manage Data operation with key web_auth_domain that it has: Source
 * account set to the Server Account. Value set to the Server's domain that
 * the client requested the challenge from." The domain we requested the
 * challenge from is the host of the WEB_AUTH_ENDPOINT we called. When the
 * challenge has no such operation, there is nothing to assert and the check
 * skips.
 */
/** The subset of a Manage Data operation this check reads. */
interface ManageDataLike {
  type: "manageData";
  name: string;
  source?: string;
  value?: Uint8Array;
}

export const challengeWebAuthDomainOp: Check = {
  id: "sep10.challenge-web-auth-domain-op",
  sep: 10,
  title: "the web_auth_domain operation is consistent",
  description:
    "If the challenge has a Manage Data operation with key web_auth_domain, requires its source to be the SIGNING_KEY and its value to be the endpoint's domain.",
  severity: "error",
  specRef: "SEP-10 §Authentication flow",
  requires: ["sep10.challenge-has-operations"],
  async run(env: Env): Promise<CheckOutcome> {
    const transaction = sep10Context(env).transaction;
    const operation = transaction?.operations.find(
      (op): op is ManageDataLike => op.type === "manageData" && op.name === "web_auth_domain",
    );
    if (transaction === undefined || operation === undefined) {
      return {
        status: "skip",
        message: "The challenge has no web_auth_domain operation; nothing to validate.",
        specRef: "SEP-10 §Authentication flow",
        evidence: [],
      };
    }
    const serverAccount = signingKey(env);
    if (operation.source === undefined) {
      return {
        status: "fail",
        message: "The web_auth_domain operation has no source account; SEP-10 requires it to be the SIGNING_KEY.",
        specRef: "SEP-10 §Authentication flow",
        evidence: [],
      };
    }
    if (serverAccount !== undefined && operation.source !== serverAccount) {
      return {
        status: "fail",
        message: `The web_auth_domain operation's source is ${operation.source}, not the SIGNING_KEY (${serverAccount}).`,
        specRef: "SEP-10 §Authentication flow",
        evidence: [],
      };
    }
    const host = endpointHost(env);
    if (host === undefined) {
      return {
        status: "fail",
        message: "The web_auth_domain operation's expected value cannot be determined because the endpoint URL is unavailable.",
        specRef: "SEP-10 §Authentication flow",
        evidence: [],
      };
    }
    const declared = operation.value === undefined ? undefined : new TextDecoder().decode(operation.value);
    if (declared === undefined || normalizedHost(declared) !== normalizedHost(host)) {
      return {
        status: "fail",
        message: `The web_auth_domain value is ${declared === undefined ? "(none)" : `"${declared}"`}, not the domain we requested the challenge from (${host}).`,
        specRef: "SEP-10 §Authentication flow",
        evidence: [],
      };
    }
    return {
      status: "pass",
      message: `The web_auth_domain operation is sourced from the SIGNING_KEY and its value is ${declared}, the domain we called.`,
      specRef: "SEP-10 §Authentication flow",
      evidence: [],
    };
  },
};

register(challengeWebAuthDomainOp);
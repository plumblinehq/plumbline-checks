import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { sep10Context } from "./common.js";

/**
 * SEP-10 §Response (Success): "network_passphrase: (optional but
 * recommended) Stellar network passphrase used by the Server. This allows
 * a Client to verify that it's using the correct passphrase when signing."
 * RECOMMENDED maps to warning severity; absence is flagged, presence passes.
 */
export const networkPassphraseReturned: Check = {
  id: "sep10.network-passphrase-returned",
  sep: 10,
  title: "the challenge response declares network_passphrase",
  description:
    "Requires the challenge response to include the network_passphrase field SEP-10 recommends.",
  severity: "warning",
  specRef: "SEP-10 §Response (Success)",
  requires: ["sep10.challenge-json-shape"],
  async run(env: Env): Promise<CheckOutcome> {
    const passphrase = sep10Context(env).json?.network_passphrase;
    if (typeof passphrase === "string" && passphrase.length > 0) {
      return {
        status: "pass",
        message: "The challenge response declares network_passphrase.",
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    return {
      status: "fail",
      message:
        "The challenge response does not declare network_passphrase; SEP-10 recommends it so clients can confirm they use the correct passphrase.",
      specRef: "SEP-10 §Response (Success)",
      evidence: [],
    };
  },
};

register(networkPassphraseReturned);
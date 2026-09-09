import type { Check, CheckOutcome, Env } from "../../core.js";
import { register } from "../../registry.js";
import { resolveNetworkPassphrase, sep10Context } from "./common.js";

/**
 * The documented passphrase precedence, from the master build prompt: prefer
 * the toml's NETWORK_PASSPHRASE, cross-check it against any
 * network_passphrase the challenge response returns, and raise a distinct
 * check if they disagree. A disagreement means the anchor's discovery layer
 * and its challenge server are configured for different networks, so a
 * client following the toml cannot verify the challenge signature at all.
 * The spec sentence itself ("optional but recommended") is about presence;
 * the disagreement is a real breakage, which is why this is error severity.
 */
export const networkPassphraseConsistent: Check = {
  id: "sep10.network-passphrase-consistent",
  sep: 10,
  title: "the challenge passphrase agrees with the toml",
  description:
    "If the challenge response declares network_passphrase, requires it to match the toml's NETWORK_PASSPHRASE (or the run's network default).",
  severity: "error",
  requires: ["sep10.challenge-json-shape"],
  async run(env: Env): Promise<CheckOutcome> {
    const returned = sep10Context(env).json?.network_passphrase;
    if (typeof returned !== "string" || returned.length === 0) {
      return {
        status: "skip",
        message: "The challenge response does not declare network_passphrase; nothing to cross-check.",
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    const expected = resolveNetworkPassphrase(env);
    if (returned === expected) {
      return {
        status: "pass",
        message: "The challenge network_passphrase matches the passphrase the toml declares.",
        specRef: "SEP-10 §Response (Success)",
        evidence: [],
      };
    }
    return {
      status: "fail",
      message: `The challenge declares network_passphrase "${returned}" but the toml's NETWORK_PASSPHRASE is "${expected}"; the anchor is configured for two different networks.`,
      specRef: "SEP-10 §Response (Success)",
      evidence: [],
    };
  },
};

register(networkPassphraseConsistent);